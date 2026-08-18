package ai.multica.recording.crypto

import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

data class ManifestSegment(
  val index: Int,
  val file: String,
  val nonce: String,
  val sampleCount: Long,
  val durationMs: Long,
  val byteLength: Long,
  val sealed: Boolean,
  val tag: String?,
)

data class RecordingManifest(
  val sessionId: String,
  val createdAt: Long,
  val format: String = "aac",
  val sampleRate: Int = RecordingCryptoConstants.SAMPLE_RATE,
  val channels: Int = RecordingCryptoConstants.CHANNELS,
  var state: String = "recording",
  var totalDurationMs: Long = 0,
  val segments: MutableList<ManifestSegment> = mutableListOf(),
  var mergeStatus: String = "none",
  var mergedFile: String? = null,
  var mergedByteLength: Long? = null,
  var mergeError: String? = null,
) {
  fun toJson(): JSONObject {
    val segs = JSONArray()
    for (s in segments) {
      segs.put(
        JSONObject()
          .put("index", s.index)
          .put("file", s.file)
          .put("nonce", s.nonce)
          .put("sampleCount", s.sampleCount)
          .put("durationMs", s.durationMs)
          .put("byteLength", s.byteLength)
          .put("sealed", s.sealed)
          .put("tag", s.tag ?: JSONObject.NULL),
      )
    }
    return JSONObject()
      .put("sessionId", sessionId)
      .put("createdAt", createdAt)
      .put("format", format)
      .put("sampleRate", sampleRate)
      .put("channels", channels)
      .put("state", state)
      .put("totalDurationMs", totalDurationMs)
      .put("segments", segs)
      .put("mergeStatus", mergeStatus)
      .put("mergedFile", mergedFile ?: JSONObject.NULL)
      .put("mergedByteLength", mergedByteLength ?: JSONObject.NULL)
      .put("mergeError", mergeError ?: JSONObject.NULL)
  }

  companion object {
    fun fromJson(obj: JSONObject): RecordingManifest {
      val segs = mutableListOf<ManifestSegment>()
      val arr = obj.optJSONArray("segments") ?: JSONArray()
      for (i in 0 until arr.length()) {
        val s = arr.getJSONObject(i)
        segs.add(
          ManifestSegment(
            index = s.getInt("index"),
            file = s.getString("file"),
            nonce = s.getString("nonce"),
            sampleCount = s.getLong("sampleCount"),
            durationMs = s.getLong("durationMs"),
            byteLength = s.getLong("byteLength"),
            sealed = s.optBoolean("sealed", true),
            tag = if (s.isNull("tag")) null else s.optString("tag"),
          ),
        )
      }
      return RecordingManifest(
        sessionId = obj.getString("sessionId"),
        createdAt = obj.getLong("createdAt"),
        format = obj.optString("format", "aac"),
        sampleRate = obj.optInt("sampleRate", RecordingCryptoConstants.SAMPLE_RATE),
        channels = obj.optInt("channels", RecordingCryptoConstants.CHANNELS),
        state = obj.optString("state", "recording"),
        totalDurationMs = obj.optLong("totalDurationMs", 0),
        segments = segs,
        mergeStatus = obj.optString("mergeStatus", "none"),
        mergedFile = if (obj.isNull("mergedFile")) null else obj.optString("mergedFile"),
        mergedByteLength = if (obj.isNull("mergedByteLength")) null else obj.optLong("mergedByteLength"),
        mergeError = if (obj.isNull("mergeError")) null else obj.optString("mergeError"),
      )
    }
  }
}

class RecordingManifestStore(private val sessionDir: File, private val crypto: SegmentCrypto) {
  fun save(manifest: RecordingManifest) {
    val json = manifest.toJson().toString().toByteArray(Charsets.UTF_8)
    val nonce = crypto.newNonce()
    val cipher = crypto.newCipher(nonce).doFinal(json)
    val tag = crypto.hmac(nonce, cipher)
    val tmp = File(sessionDir, ".manifest.tmp")
    val finalFile = File(sessionDir, ".manifest")
    tmp.writeBytes(nonce + cipher + tag)
    if (finalFile.exists()) finalFile.delete()
    if (!tmp.renameTo(finalFile)) {
      tmp.copyTo(finalFile, overwrite = true)
      tmp.delete()
    }
  }

  fun load(): RecordingManifest? {
    val file = File(sessionDir, ".manifest")
    if (!file.exists() || file.length() < 16 + 32) return null
    val bytes = file.readBytes()
    val nonce = bytes.copyOfRange(0, 16)
    val tag = bytes.copyOfRange(bytes.size - 32, bytes.size)
    val cipher = bytes.copyOfRange(16, bytes.size - 32)
    if (!crypto.verifyHmac(nonce, cipher, tag)) return null
    val json = String(crypto.decrypt(nonce, cipher), Charsets.UTF_8)
    return RecordingManifest.fromJson(JSONObject(json))
  }
}

fun decodeB64(s: String): ByteArray = Base64.decode(s, Base64.NO_WRAP)
fun encodeB64(b: ByteArray): String = Base64.encodeToString(b, Base64.NO_WRAP)
