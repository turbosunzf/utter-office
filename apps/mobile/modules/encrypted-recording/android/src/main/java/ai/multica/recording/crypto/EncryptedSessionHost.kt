package ai.multica.recording.crypto

import android.util.Base64
import java.io.File
import java.io.FileOutputStream

object EncryptedSessionHost {
  fun reconcileSession(sessionDir: File, masterKeyB64: String): RecordingManifest {
    val key = Base64.decode(masterKeyB64, Base64.NO_WRAP)
    val crypto = SegmentCrypto(key)
    val store = RecordingManifestStore(sessionDir, crypto)
    val manifest = store.load() ?: RecordingManifest(
      sessionId = sessionDir.name,
      createdAt = System.currentTimeMillis(),
    )
    val known = manifest.segments.map { it.file }.toSet()
    val files = sessionDir.listFiles()?.filter { it.name.matches(Regex("^[0-9a-f]{32}$")) } ?: emptyList()
    for (file in files) {
      if (known.contains(file.name)) continue
      recoverUnsealedFile(file, crypto)?.let { recovered ->
        manifest.segments.add(recovered)
      }
    }
    manifest.segments.sortBy { it.index }
    manifest.totalDurationMs = manifest.segments.sumOf { it.durationMs }
    store.save(manifest)
    return manifest
  }

  private fun recoverUnsealedFile(file: File, crypto: SegmentCrypto): ManifestSegment? {
    val bytes = file.readBytes()
    if (bytes.size < 20) {
      file.delete()
      return null
    }
    val nonce = bytes.copyOfRange(0, 16)
    val maybeTag = bytes.size >= 16 + 4 + RecordingCryptoConstants.HMAC_BYTES
    val cipherEnd = if (maybeTag) bytes.size - RecordingCryptoConstants.HMAC_BYTES else bytes.size
    var cipher = bytes.copyOfRange(16, cipherEnd)
    if (maybeTag) {
      val tag = bytes.copyOfRange(cipherEnd, bytes.size)
      if (crypto.verifyHmac(nonce, cipher, tag)) {
        val plain = crypto.decrypt(nonce, cipher)
        if (plain.size < 4) return null
        val index = beInt(plain, 0)
        val adtsLen = plain.size - 4
        return ManifestSegment(
          index = index,
          file = file.name,
          nonce = encodeB64(nonce),
          sampleCount = estimateSamples(adtsLen),
          durationMs = estimateSamples(adtsLen) * 1000L / RecordingCryptoConstants.SAMPLE_RATE,
          byteLength = adtsLen.toLong(),
          sealed = true,
          tag = encodeB64(tag),
        )
      }
    }
    val plain = try {
      crypto.decrypt(nonce, cipher)
    } catch (_: Throwable) {
      file.delete()
      return null
    }
    if (plain.size < 4 + 7) {
      file.delete()
      return null
    }
    val adts = plain.copyOfRange(4, plain.size)
    val end = AdtsUtil.endOfLastCompleteFrame(adts)
    if (end <= 0) {
      file.delete()
      return null
    }
    val truncated = plain.copyOfRange(0, 4 + end)
    val c = crypto.newCipher(nonce)
    val newCipher = c.doFinal(truncated)
    val tag = crypto.hmac(nonce, newCipher)
    FileOutputStream(file).use { out ->
      out.write(nonce)
      out.write(newCipher)
      out.write(tag)
      out.fd.sync()
    }
    val index = beInt(truncated, 0)
    val adtsLen = truncated.size - 4
    return ManifestSegment(
      index = index,
      file = file.name,
      nonce = encodeB64(nonce),
      sampleCount = estimateSamples(adtsLen),
      durationMs = estimateSamples(adtsLen) * 1000L / RecordingCryptoConstants.SAMPLE_RATE,
      byteLength = adtsLen.toLong(),
      sealed = true,
      tag = encodeB64(tag),
    )
  }

  private fun beInt(data: ByteArray, offset: Int): Int =
    ((data[offset].toInt() and 0xFF) shl 24) or
      ((data[offset + 1].toInt() and 0xFF) shl 16) or
      ((data[offset + 2].toInt() and 0xFF) shl 8) or
      (data[offset + 3].toInt() and 0xFF)

  private fun estimateSamples(adtsBytes: Int): Long {
    val frames = (adtsBytes / 200).coerceAtLeast(1)
    return frames * 1024L
  }
}
