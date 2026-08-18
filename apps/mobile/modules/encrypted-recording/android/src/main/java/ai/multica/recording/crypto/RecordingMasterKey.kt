package ai.multica.recording.crypto

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * H1: wrap the 32-byte session master key with an AndroidKeyStore AES-GCM key.
 * SharedPreferences only stores ciphertext + IV.
 */
object RecordingMasterKey {
  private const val GCM_TAG_BITS = 128

  fun getOrCreate(context: Context): String {
    val prefs = context.getSharedPreferences(
      RecordingCryptoConstants.PREFS_NAME,
      Context.MODE_PRIVATE,
    )
    val wrapKey = getOrCreateWrapKey()
    val existing = prefs.getString(RecordingCryptoConstants.PREFS_WRAPPED_KEY, null)
    val ivB64 = prefs.getString(RecordingCryptoConstants.PREFS_WRAP_IV, null)
    if (existing != null && ivB64 != null) {
      val wrapped = Base64.decode(existing, Base64.NO_WRAP)
      val iv = Base64.decode(ivB64, Base64.NO_WRAP)
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, wrapKey, GCMParameterSpec(GCM_TAG_BITS, iv))
      val raw = cipher.doFinal(wrapped)
      return Base64.encodeToString(raw, Base64.NO_WRAP)
    }

    val raw = ByteArray(32).also { SecureRandom().nextBytes(it) }
    // AndroidKeyStore GCM forbids caller-provided IVs on encrypt
    // (randomized encryption is required). Let the Keystore generate it.
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, wrapKey)
    val wrapped = cipher.doFinal(raw)
    val iv = cipher.iv
    prefs.edit()
      .putString(RecordingCryptoConstants.PREFS_WRAPPED_KEY, Base64.encodeToString(wrapped, Base64.NO_WRAP))
      .putString(RecordingCryptoConstants.PREFS_WRAP_IV, Base64.encodeToString(iv, Base64.NO_WRAP))
      .apply()
    return Base64.encodeToString(raw, Base64.NO_WRAP)
  }

  private fun getOrCreateWrapKey(): SecretKey {
    val ks = KeyStore.getInstance("AndroidKeyStore")
    ks.load(null)
    val alias = RecordingCryptoConstants.KEYSTORE_ALIAS
    if (ks.containsAlias(alias)) {
      return (ks.getEntry(alias, null) as KeyStore.SecretKeyEntry).secretKey
    }
    val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    gen.init(
      KeyGenParameterSpec.Builder(
        alias,
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
      )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256)
        .build(),
    )
    return gen.generateKey()
  }
}
