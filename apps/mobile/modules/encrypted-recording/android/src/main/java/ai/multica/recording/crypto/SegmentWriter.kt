package ai.multica.recording.crypto

import java.io.File
import java.io.FileOutputStream
import java.security.SecureRandom
import javax.crypto.Cipher

data class SealedSegment(
  val index: Int,
  val file: String,
  val nonceBase64: String,
  val sampleCount: Long,
  val durationMs: Long,
  val byteLength: Long,
  val tag: String,
)

class SegmentWriter(
  private val dir: File,
  private val crypto: SegmentCrypto,
  private val sampleRate: Int,
  startIndex: Int = 0,
) {
  private val random = SecureRandom()
  private var index = startIndex - 1
  private var out: FileOutputStream? = null
  private var cipher: Cipher? = null
  private var currentFile: File? = null
  private var currentNonce: ByteArray? = null
  private var sampleCount = 0L
  private var byteLength = 0L
  private var bytesSinceSync = 0L
  private val cipherAccum = java.io.ByteArrayOutputStream()

  private fun randomName(): String {
    val bytes = ByteArray(16)
    random.nextBytes(bytes)
    return bytes.joinToString("") { "%02x".format(it) }
  }

  private fun intToBe(value: Int): ByteArray =
    byteArrayOf(
      (value ushr 24).toByte(),
      (value ushr 16).toByte(),
      (value ushr 8).toByte(),
      value.toByte(),
    )

  fun openNext() {
    val nextIndex = index + 1
    val file = File(dir, randomName())
    val nonce = crypto.newNonce()
    val stream = FileOutputStream(file)
    stream.write(nonce)
    val c = crypto.newCipher(nonce)
    val encIndex = c.update(intToBe(nextIndex))
    stream.write(encIndex)
    cipherAccum.reset()
    cipherAccum.write(encIndex)

    index = nextIndex
    out = stream
    cipher = c
    currentFile = file
    currentNonce = nonce
    sampleCount = 0
    byteLength = 0
    bytesSinceSync = 0
  }

  val hasOpenSegment: Boolean get() = out != null
  val currentIndex: Int get() = index
  val currentSampleCount: Long get() = sampleCount
  val currentFileName: String? get() = currentFile?.name

  fun appendFrame(adts: ByteArray, frameSamples: Int) {
    val stream = out ?: return
    val c = cipher ?: return
    val enc = c.update(adts)
    stream.write(enc)
    cipherAccum.write(enc)
    sampleCount += frameSamples
    byteLength += adts.size
    bytesSinceSync += adts.size
  }

  fun maybeSync(thresholdBytes: Long) {
    val stream = out ?: return
    if (bytesSinceSync >= thresholdBytes) {
      stream.flush()
      stream.fd.sync()
      bytesSinceSync = 0
    }
  }

  fun seal(): SealedSegment? {
    val stream = out ?: return null
    val c = cipher
    val file = currentFile
    val nonce = currentNonce
    try {
      if (c != null) {
        val tail = c.doFinal()
        if (tail.isNotEmpty()) {
          stream.write(tail)
          cipherAccum.write(tail)
        }
      }
      val tag = if (nonce != null) crypto.hmac(nonce, cipherAccum.toByteArray()) else ByteArray(0)
      if (tag.isNotEmpty()) stream.write(tag)
      stream.flush()
      stream.fd.sync()
    } finally {
      stream.close()
      out = null
      cipher = null
    }

    if (sampleCount <= 0L || file == null || nonce == null) {
      file?.delete()
      currentFile = null
      currentNonce = null
      cipherAccum.reset()
      return null
    }

    val result = SealedSegment(
      index = index,
      file = file.name,
      nonceBase64 = encodeB64(nonce),
      sampleCount = sampleCount,
      durationMs = sampleCount * 1000L / sampleRate,
      byteLength = byteLength,
      tag = encodeB64(crypto.hmac(nonce, cipherAccum.toByteArray().let { it })),
    )
    // tag already written; recompute from accum (includes tail)
    currentFile = null
    currentNonce = null
    cipherAccum.reset()
    return result
  }
}
