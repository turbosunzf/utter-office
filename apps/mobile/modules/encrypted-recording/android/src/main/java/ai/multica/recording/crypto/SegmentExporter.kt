package ai.multica.recording.crypto

import android.media.MediaCodec
import android.media.MediaFormat
import android.media.MediaMuxer
import android.util.Base64
import java.io.File
import java.nio.ByteBuffer

object SegmentExporter {
  fun exportPlainM4a(
    keyBase64: String,
    segmentPaths: List<String>,
    outputPath: String,
    sampleRate: Int = RecordingCryptoConstants.SAMPLE_RATE,
    channels: Int = RecordingCryptoConstants.CHANNELS,
    onProgress: (Double) -> Unit = {},
  ): Long {
    val key = Base64.decode(keyBase64, Base64.NO_WRAP)
    val crypto = SegmentCrypto(key)
    val adts = concatAdts(crypto, segmentPaths, onProgress)
    if (adts.isEmpty()) {
      throw IllegalStateException("no audio to export")
    }
    muxAdtsToM4a(adts, outputPath, sampleRate, channels)
    onProgress(1.0)
    return File(outputPath).length()
  }

  fun concatAdts(
    crypto: SegmentCrypto,
    segmentPaths: List<String>,
    onProgress: (Double) -> Unit,
  ): ByteArray {
    val out = java.io.ByteArrayOutputStream()
    val total = segmentPaths.sumOf { File(it).length() }.coerceAtLeast(1)
    var processed = 0L
    for (path in segmentPaths) {
      val file = File(path)
      if (!file.exists()) throw IllegalStateException("missing segment: $path")
      val bytes = file.readBytes()
      val plain = decryptSegment(crypto, bytes)
        ?: throw IllegalStateException("hmac failed: $path")
      if (plain.size <= 4) continue
      out.write(plain, 4, plain.size - 4)
      processed += bytes.size
      onProgress((processed.toDouble() / total).coerceIn(0.0, 0.9))
    }
    return out.toByteArray()
  }

  fun decryptSegment(crypto: SegmentCrypto, bytes: ByteArray): ByteArray? {
    if (bytes.size < 16 + 4) return null
    val hasTag = bytes.size >= 16 + 4 + RecordingCryptoConstants.HMAC_BYTES
    val nonce = bytes.copyOfRange(0, 16)
    val cipherEnd = if (hasTag) bytes.size - RecordingCryptoConstants.HMAC_BYTES else bytes.size
    val cipher = bytes.copyOfRange(16, cipherEnd)
    if (hasTag) {
      val tag = bytes.copyOfRange(cipherEnd, bytes.size)
      if (!crypto.verifyHmac(nonce, cipher, tag)) return null
    }
    return crypto.decrypt(nonce, cipher)
  }

  private fun muxAdtsToM4a(adts: ByteArray, outputPath: String, sampleRate: Int, channels: Int) {
    val frames = AdtsUtil.iterateFrames(adts)
    if (frames.isEmpty()) throw IllegalStateException("no ADTS frames")
    File(outputPath).parentFile?.mkdirs()
    val muxer = MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    val format = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, channels)
    format.setInteger(MediaFormat.KEY_AAC_PROFILE, android.media.MediaCodecInfo.CodecProfileLevel.AACObjectLC)
    format.setInteger(MediaFormat.KEY_BIT_RATE, RecordingCryptoConstants.BITRATE)
    format.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, 16384)
    val csd = audioSpecificConfig(sampleRate, channels)
    format.setByteBuffer("csd-0", ByteBuffer.wrap(csd))
    val track = muxer.addTrack(format)
    muxer.start()
    val info = MediaCodec.BufferInfo()
    var framesWritten = 0L
    try {
      for (f in frames) {
        val payload = adts.copyOfRange(f.payloadOffset, f.payloadOffset + f.payloadLength)
        info.offset = 0
        info.size = payload.size
        info.presentationTimeUs = framesWritten * 1024L * 1_000_000L / sampleRate
        info.flags = MediaCodec.BUFFER_FLAG_KEY_FRAME
        muxer.writeSampleData(track, ByteBuffer.wrap(payload), info)
        framesWritten++
      }
    } finally {
      muxer.stop()
      muxer.release()
    }
  }

  private fun audioSpecificConfig(sampleRate: Int, channels: Int): ByteArray {
    val freqIdx = when (sampleRate) {
      96000 -> 0; 88200 -> 1; 64000 -> 2; 48000 -> 3; 44100 -> 4
      32000 -> 5; 24000 -> 6; 22050 -> 7; 16000 -> 8; 12000 -> 9
      11025 -> 10; 8000 -> 11; else -> 7
    }
    val profile = 2
    val b0 = ((profile shl 3) or (freqIdx shr 1)).toByte()
    val b1 = (((freqIdx and 1) shl 7) or (channels shl 3)).toByte()
    return byteArrayOf(b0, b1)
  }
}
