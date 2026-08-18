package ai.multica.recording.crypto

object RecordingCryptoConstants {
  const val SAMPLE_RATE = 22050
  const val CHANNELS = 1
  const val BITRATE = 32000
  const val SEGMENT_DURATION_MS = 30_000
  const val NONCE_SIZE = 16
  const val INDEX_BYTES = 4
  const val HMAC_BYTES = 32
  const val FSYNC_INTERVAL_MS = 2000
  const val FSYNC_THRESHOLD = 64L * 1024
  const val PCM_SAMPLE_RATE = 16_000
  const val PCM_CHUNK_BYTES = 6400
  const val PCM_BATCH_CHUNKS = 4
  const val MIN_FREE_STORAGE = 50L * 1024 * 1024
  const val LOW_BATTERY_PCT = 5
  const val KEYSTORE_ALIAS = "meeting_recording_wrap_v1"
  const val PREFS_NAME = "meeting_recording_crypto_v1"
  const val PREFS_WRAPPED_KEY = "wrapped_master_key"
  const val PREFS_WRAP_IV = "wrap_iv"
}
