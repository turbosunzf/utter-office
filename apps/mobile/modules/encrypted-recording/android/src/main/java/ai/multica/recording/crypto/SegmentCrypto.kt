package ai.multica.recording.crypto

import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * AES-256-CTR streaming + HMAC-SHA256 (encrypt-then-MAC on seal).
 * File layout: [nonce 16][CTR(index 4 + ADTS...)][HMAC 32 on seal].
 */
class SegmentCrypto(private val key: ByteArray) {
  init {
    require(key.size == 32) { "AES-256 key must be 32 bytes" }
  }

  private val random = SecureRandom()

  fun newNonce(): ByteArray {
    val nonce = ByteArray(RecordingCryptoConstants.NONCE_SIZE)
    random.nextBytes(nonce)
    return nonce
  }

  fun newCipher(nonce: ByteArray): Cipher {
    val cipher = Cipher.getInstance("AES/CTR/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), IvParameterSpec(nonce))
    return cipher
  }

  fun decrypt(nonce: ByteArray, cipherBytes: ByteArray): ByteArray {
    return newCipher(nonce).doFinal(cipherBytes)
  }

  fun hmac(nonce: ByteArray, cipherBytes: ByteArray): ByteArray {
    val mac = Mac.getInstance("HmacSHA256")
    mac.init(SecretKeySpec(key, "HmacSHA256"))
    mac.update(nonce)
    mac.update(cipherBytes)
    return mac.doFinal()
  }

  fun verifyHmac(nonce: ByteArray, cipherBytes: ByteArray, tag: ByteArray): Boolean {
    val expected = hmac(nonce, cipherBytes)
    if (expected.size != tag.size) return false
    var diff = 0
    for (i in expected.indices) diff = diff or (expected[i].toInt() xor tag[i].toInt())
    return diff == 0
  }
}
