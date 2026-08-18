package ai.multica.recording.crypto

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioRecordingConfiguration
import android.media.MediaCodec
import android.media.MediaFormat
import android.media.MediaRecorder
import android.os.BatteryManager
import android.os.Build
import android.os.StatFs
import android.util.Base64
import java.io.File
import java.nio.ByteBuffer
import kotlin.concurrent.thread
import kotlin.math.sqrt

interface CaptureListener {
  fun onState(state: String)
  fun onDuration(durationMs: Long)
  fun onLevel(level: Double)
  fun onSegmentSealed(seg: SealedSegment)
  fun onError(code: String, message: String)
  fun onPcmFrame(base64: String, bytes: Int)
  fun onSystemInterrupted(reason: String, elapsedSeconds: Int, segmentCount: Int)
  fun onSystemInterruptEnded(canResume: Boolean)
  fun onForceStop(reason: String)
  fun onMemoryPressure(level: String)
}

class EncryptedCaptureEngine(private val appContext: Context) {
  companion object {
    const val STATE_RECORDING = "recording"
    const val STATE_PAUSED = "paused"
    const val STATE_INTERRUPTED = "interrupted"
    const val STATE_FINALIZED = "finalized"
  }

  @Volatile private var listener: CaptureListener? = null
  private var sampleRate = RecordingCryptoConstants.SAMPLE_RATE
  private var channels = RecordingCryptoConstants.CHANNELS
  private var segmentSamples = sampleRate.toLong() * 30
  private lateinit var dir: File
  private lateinit var crypto: SegmentCrypto
  private var writer: SegmentWriter? = null
  private var recordThread: Thread? = null
  @Volatile private var running = false
  @Volatile private var wantPaused = false
  @Volatile private var pauseIsInterruption = false
  @Volatile private var committedSamples = 0L
  private var batteryReceiver: BroadcastReceiver? = null
  private var audioManager: AudioManager? = null
  private var recordingCallback: AudioManager.AudioRecordingCallback? = null
  private val pcmBatch = java.io.ByteArrayOutputStream()

  val isActive: Boolean get() = running
  val sessionDir: File? get() = if (::dir.isInitialized) dir else null
  val lastIndex: Int get() = writer?.currentIndex ?: -1

  fun setListener(l: CaptureListener?) { listener = l }

  fun freeBytesFor(path: String): Long =
    try { StatFs(path).availableBytes } catch (_: Throwable) { Long.MAX_VALUE }

  fun start(
    directory: String,
    keyBase64: String,
    sampleRate: Int,
    channels: Int,
    segmentSeconds: Int,
    startIndex: Int,
  ) {
    if (running) throw IllegalStateException("already recording")
    this.sampleRate = sampleRate
    this.channels = channels
    this.segmentSamples = sampleRate.toLong() * segmentSeconds
    this.dir = File(directory).apply { mkdirs() }
    if (freeBytesFor(directory) < RecordingCryptoConstants.MIN_FREE_STORAGE) {
      throw IllegalStateException("insufficient storage")
    }
    val key = Base64.decode(keyBase64, Base64.NO_WRAP)
    this.crypto = SegmentCrypto(key)
    EncryptedSessionHost.reconcileSession(dir, keyBase64)
    this.writer = SegmentWriter(dir, crypto, sampleRate, startIndex).also { it.openNext() }
    committedSamples = 0
    wantPaused = false
    pauseIsInterruption = false
    running = true
    pcmBatch.reset()
    registerBattery()
    registerAudioCallback()
    recordThread = thread(name = "uo-recorder") { captureLoop() }
    listener?.onState(STATE_RECORDING)
  }

  fun pause() {
    if (!running || wantPaused) return
    pauseIsInterruption = false
    wantPaused = true
  }

  fun resume() {
    if (!running || !wantPaused) return
    wantPaused = false
  }

  fun stop() {
    finalizeInternal(STATE_FINALIZED)
  }

  fun onLowMemory() {
    if (running) {
      listener?.onMemoryPressure("critical")
      listener?.onForceStop("low_memory")
      finalizeInternal(STATE_FINALIZED)
    }
  }

  private fun requestPause(interruption: Boolean, reason: String) {
    if (!running || wantPaused) return
    pauseIsInterruption = interruption
    wantPaused = true
    if (interruption) {
      val elapsed = (totalDurationMs() / 1000).toInt()
      listener?.onSystemInterrupted(reason, elapsed, writer?.currentIndex ?: 0)
    }
  }

  private fun requestResume() {
    if (!running || !wantPaused || !pauseIsInterruption) return
    pauseIsInterruption = false
    wantPaused = false
    listener?.onSystemInterruptEnded(true)
  }

  private fun finalizeInternal(finalState: String) {
    if (!running) return
    running = false
    recordThread?.join(8000)
    recordThread = null
    sealCurrentSegment()
    writer = null
    unregisterBattery()
    unregisterAudioCallback()
    listener?.onState(finalState)
  }

  private fun sealCurrentSegment() {
    val w = writer ?: return
    if (!w.hasOpenSegment) return
    val sealed = w.seal()
    if (sealed != null) {
      committedSamples += sealed.sampleCount
      listener?.onSegmentSealed(sealed)
    }
  }

  private fun captureLoop() {
    val chanMask = AudioFormat.CHANNEL_IN_MONO
    val minBuf = AudioRecord.getMinBufferSize(sampleRate, chanMask, AudioFormat.ENCODING_PCM_16BIT)
    val bufSize = if (minBuf > 0) minBuf * 2 else sampleRate * 2
    var audioRecord: AudioRecord? = null
    var codec: MediaCodec? = null
    var restartCount = 0
    while (running) {
      try {
        audioRecord = AudioRecord(
          MediaRecorder.AudioSource.VOICE_RECOGNITION,
          sampleRate, chanMask, AudioFormat.ENCODING_PCM_16BIT, bufSize,
        )
        if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
          throw IllegalStateException("AudioRecord init failed")
        }
        val format = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, channels).apply {
          setInteger(MediaFormat.KEY_AAC_PROFILE, android.media.MediaCodecInfo.CodecProfileLevel.AACObjectLC)
          setInteger(MediaFormat.KEY_BIT_RATE, RecordingCryptoConstants.BITRATE)
          setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, bufSize)
        }
        codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC).apply {
          configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
          start()
        }
        audioRecord.startRecording()
        val pcm = ByteArray(bufSize)
        val bufferInfo = MediaCodec.BufferInfo()
        var actualPaused = false
        var lastDurationEmit = 0L
        var lastLevelEmit = 0L
        var storageCheckCounter = 0

        while (running) {
          if (wantPaused && !actualPaused) {
            runCatching { audioRecord.stop() }
            sealCurrentSegment()
            actualPaused = true
            listener?.onState(if (pauseIsInterruption) STATE_INTERRUPTED else STATE_PAUSED)
          }
          if (!wantPaused && actualPaused) {
            var ok = false
            var tries = 0
            while (running && !wantPaused && tries < 15) {
              runCatching { audioRecord.startRecording() }
              if (audioRecord.recordingState == AudioRecord.RECORDSTATE_RECORDING) { ok = true; break }
              tries++; Thread.sleep(200)
            }
            if (ok) {
              if (writer?.hasOpenSegment != true) writer?.openNext()
              actualPaused = false
              listener?.onState(STATE_RECORDING)
            } else if (running) {
              runCatching { audioRecord.stop() }
              wantPaused = true
              listener?.onState(if (pauseIsInterruption) STATE_INTERRUPTED else STATE_PAUSED)
            }
          }
          if (actualPaused) { Thread.sleep(60); continue }

          val read = audioRecord.read(pcm, 0, pcm.size)
          if (read <= 0) { Thread.sleep(5); continue }

          val now0 = System.currentTimeMillis()
          if (now0 - lastLevelEmit > 120) {
            listener?.onLevel(computeLevel(pcm, read))
            lastLevelEmit = now0
          }
          emitPcm(pcm, read)

          val inIndex = codec.dequeueInputBuffer(10000)
          if (inIndex >= 0) {
            val inBuf: ByteBuffer? = codec.getInputBuffer(inIndex)
            inBuf?.clear()
            inBuf?.put(pcm, 0, read)
            codec.queueInputBuffer(inIndex, 0, read, System.nanoTime() / 1000, 0)
          }
          var outIndex = codec.dequeueOutputBuffer(bufferInfo, 0)
          while (outIndex >= 0) {
            if (bufferInfo.size > 0 && (bufferInfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG) == 0) {
              val outBuf = codec.getOutputBuffer(outIndex)
              if (outBuf != null) {
                val payload = ByteArray(bufferInfo.size)
                outBuf.position(bufferInfo.offset)
                outBuf.get(payload, 0, bufferInfo.size)
                val frame = adtsHeader(bufferInfo.size) + payload
                val w = writer
                if (w != null && w.hasOpenSegment) {
                  w.appendFrame(frame, 1024)
                  w.maybeSync(RecordingCryptoConstants.FSYNC_THRESHOLD)
                  if (w.currentSampleCount >= segmentSamples) rollSegment()
                }
              }
            }
            codec.releaseOutputBuffer(outIndex, false)
            outIndex = codec.dequeueOutputBuffer(bufferInfo, 0)
          }

          val now = System.currentTimeMillis()
          if (now - lastDurationEmit > 250) {
            listener?.onDuration(totalDurationMs())
            lastDurationEmit = now
          }
          if (++storageCheckCounter >= 200) {
            storageCheckCounter = 0
            if (freeBytesFor(dir.path) < RecordingCryptoConstants.MIN_FREE_STORAGE) {
              listener?.onForceStop("low_storage")
              running = false
              sealCurrentSegment()
              writer = null
              unregisterBattery()
              unregisterAudioCallback()
              listener?.onState(STATE_FINALIZED)
              break
            }
          }
        }
        break
      } catch (t: Throwable) {
        restartCount++
        if (restartCount > 3 || !running) {
          listener?.onError("capture", t.message ?: "capture failed")
          running = false
          break
        }
        sealCurrentSegment()
        writer?.openNext()
        Thread.sleep(300)
      } finally {
        runCatching { audioRecord?.stop() }
        runCatching { audioRecord?.release() }
        runCatching { codec?.stop() }
        runCatching { codec?.release() }
      }
    }
  }

  private fun emitPcm(pcm22050: ByteArray, len: Int) {
    val resampled = downsampleTo16k(pcm22050, len)
    pcmBatch.write(resampled)
    val target = RecordingCryptoConstants.PCM_CHUNK_BYTES * RecordingCryptoConstants.PCM_BATCH_CHUNKS
    if (pcmBatch.size() >= target) {
      val batch = pcmBatch.toByteArray()
      pcmBatch.reset()
      listener?.onPcmFrame(Base64.encodeToString(batch, Base64.NO_WRAP), batch.size)
    }
  }

  private fun downsampleTo16k(src: ByteArray, len: Int): ByteArray {
    val inRate = sampleRate
    val outRate = RecordingCryptoConstants.PCM_SAMPLE_RATE
    val inSamples = len / 2
    val outSamples = (inSamples.toLong() * outRate / inRate).toInt().coerceAtLeast(1)
    val out = ByteArray(outSamples * 2)
    for (i in 0 until outSamples) {
      val srcIdx = (i.toLong() * inRate / outRate).toInt().coerceAtMost(inSamples - 1) * 2
      out[i * 2] = src[srcIdx]
      out[i * 2 + 1] = src[srcIdx + 1]
    }
    return out
  }

  private fun rollSegment() {
    val w = writer ?: return
    val sealed = w.seal()
    if (sealed != null) {
      committedSamples += sealed.sampleCount
      listener?.onSegmentSealed(sealed)
    }
    w.openNext()
  }

  private fun totalDurationMs(): Long {
    val cur = writer?.currentSampleCount ?: 0L
    return (committedSamples + cur) * 1000L / sampleRate
  }

  private fun adtsHeader(payloadLen: Int): ByteArray {
    val profile = 2
    val freqIdx = 7
    val chanCfg = channels
    val fullLen = payloadLen + 7
    val h = ByteArray(7)
    h[0] = 0xFF.toByte()
    h[1] = 0xF9.toByte()
    h[2] = (((profile - 1) shl 6) + (freqIdx shl 2) + (chanCfg shr 2)).toByte()
    h[3] = (((chanCfg and 3) shl 6) + (fullLen shr 11)).toByte()
    h[4] = ((fullLen and 0x7FF) shr 3).toByte()
    h[5] = (((fullLen and 7) shl 5) + 0x1F).toByte()
    h[6] = 0xFC.toByte()
    return h
  }

  private fun computeLevel(pcm: ByteArray, len: Int): Double {
    var sum = 0.0
    var i = 0
    val n = len - (len % 2)
    while (i < n) {
      val s = (pcm[i].toInt() and 0xFF) or (pcm[i + 1].toInt() shl 8)
      sum += s.toDouble() * s
      i += 2
    }
    val rms = sqrt(sum / (n / 2).coerceAtLeast(1)) / 32768.0
    return rms.coerceIn(0.0, 1.0)
  }

  private fun registerBattery() {
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context?, intent: Intent?) {
        val level = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = intent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        if (level >= 0 && scale > 0) {
          val pct = level * 100 / scale
          if (pct <= RecordingCryptoConstants.LOW_BATTERY_PCT && running) {
            listener?.onForceStop("low_battery")
            finalizeInternal(STATE_FINALIZED)
          }
        }
      }
    }
    batteryReceiver = receiver
    appContext.registerReceiver(receiver, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
  }

  private fun unregisterBattery() {
    batteryReceiver?.let { runCatching { appContext.unregisterReceiver(it) } }
    batteryReceiver = null
  }

  private fun registerAudioCallback() {
    audioManager = appContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val cb = object : AudioManager.AudioRecordingCallback() {
        override fun onRecordingConfigChanged(configs: MutableList<AudioRecordingConfiguration>) {
          val silenced = configs.any { it.isClientSilenced }
          if (silenced) requestPause(true, "audio_silenced")
          else requestResume()
        }
      }
      recordingCallback = cb
      audioManager?.registerAudioRecordingCallback(cb, null)
    }
  }

  private fun unregisterAudioCallback() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      recordingCallback?.let { audioManager?.unregisterAudioRecordingCallback(it) }
    }
    recordingCallback = null
    audioManager = null
  }
}
