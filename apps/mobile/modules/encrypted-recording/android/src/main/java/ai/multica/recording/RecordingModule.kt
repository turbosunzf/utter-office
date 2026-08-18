package ai.multica.recording

import ai.multica.recording.crypto.CaptureListener
import ai.multica.recording.crypto.EncryptedCaptureEngine
import ai.multica.recording.crypto.EncryptedSessionHost
import ai.multica.recording.crypto.RecordingCryptoConstants
import ai.multica.recording.crypto.RecordingMasterKey
import ai.multica.recording.crypto.SealedSegment
import ai.multica.recording.crypto.SegmentExporter
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class RecordingModule : Module(), CaptureListener {
  private val main = Handler(Looper.getMainLooper())
  private var engine: EncryptedCaptureEngine? = null
  private var overlay: RecordingOverlayManager? = null
  private var lastTickSecond = -1
  private var lastDurationMs = 0L

  override fun definition() = ModuleDefinition {
    Name("EncryptedRecording")

    Events(
      "onRecordingTick",
      "onRecordingStopped",
      "onRecordingError",
      "onRealtimePcmFrame",
      "onAppResumedWhileRecording",
      "onRecordingSystemInterrupted",
      "onRecordingSystemInterruptEnded",
      "onRecordingMergeSkipped",
      "onRecordingMemoryPressure",
      "onRecordingForceStop",
      "onSegmentSealed",
      "onRecordingState",
      "onRecordingLevel",
    )

    OnCreate {
      ensureEngine()
    }

    OnActivityEntersForeground {
      if (engine?.isActive == true) {
        sendEvent("onAppResumedWhileRecording", emptyMap<String, Any>())
      }
    }

    AsyncFunction("getOrCreateMasterKey") {
      RecordingMasterKey.getOrCreate(requireAppContext())
    }

    AsyncFunction("startEncryptedRecording") { sessionDir: String, masterKey: String, startIndex: Int, _baseDurationMs: Double ->
      val ctx = requireAppContext()
      ensureEngine()
      RecordingService.start(ctx)
      engine?.start(
        sessionDir,
        masterKey,
        RecordingCryptoConstants.SAMPLE_RATE,
        RecordingCryptoConstants.CHANNELS,
        RecordingCryptoConstants.SEGMENT_DURATION_MS / 1000,
        startIndex,
      )
      overlay?.show("录音中 00:00")
    }

    Function("pauseRecording") {
      engine?.pause()
    }

    Function("resumeRecording") {
      engine?.resume()
    }

    AsyncFunction("stopEncryptedRecording") {
      engine?.stop()
      val ctx = appContext.reactContext
      if (ctx != null) RecordingService.stop(ctx.applicationContext)
      overlay?.hide()
      mapOf(
        "status" to "stopped",
        "elapsedMs" to lastDurationMs,
      )
    }

    Function("isRecording") {
      engine?.isActive == true
    }

    AsyncFunction("getRecordingRuntimeState") {
      val active = engine?.isActive == true
      val dir = engine?.sessionDir
      mapOf(
        "isRecording" to active,
        "hasFiles" to (dir?.listFiles()?.isNotEmpty() == true),
        "sessionDir" to (dir?.absolutePath ?: ""),
        "lastIndex" to (engine?.lastIndex ?: -1),
      )
    }

    AsyncFunction("reconcileSession") { sessionDir: String, masterKey: String ->
      val manifest = EncryptedSessionHost.reconcileSession(File(sessionDir), masterKey)
      mapOf(
        "sessionId" to manifest.sessionId,
        "state" to manifest.state,
        "totalDurationMs" to manifest.totalDurationMs,
        "segmentCount" to manifest.segments.size,
        "lastIndex" to (manifest.segments.maxOfOrNull { it.index } ?: -1),
      )
    }

    AsyncFunction("exportPlainM4a") { keyBase64: String, segmentPaths: List<String>, outputPath: String ->
      val len = SegmentExporter.exportPlainM4a(keyBase64, segmentPaths, outputPath)
      mapOf("path" to outputPath, "byteLength" to len)
    }

    Function("canDrawOverlays") {
      val ctx = appContext.reactContext ?: return@Function false
      OverlayPermissionHelper.canDrawOverlays(ctx.applicationContext)
    }

    Function("isOverlayEnabled") {
      val ctx = appContext.reactContext ?: return@Function false
      OverlaySettings.isEnabled(ctx.applicationContext)
    }

    Function("openOverlaySettings") {
      val ctx = appContext.reactContext ?: return@Function false
      ctx.startActivity(OverlayPermissionHelper.settingsIntent(ctx.applicationContext))
      true
    }

    Function("setOverlayEnabled") { enabled: Boolean ->
      val ctx = appContext.reactContext ?: return@Function false
      OverlaySettings.setEnabled(ctx.applicationContext, enabled)
      true
    }

    AsyncFunction("freeBytes") { path: String ->
      engine?.freeBytesFor(path) ?: 0L
    }
  }

  override fun onState(state: String) {
    send("onRecordingState", mapOf("state" to state))
    if (state == EncryptedCaptureEngine.STATE_FINALIZED) {
      send(
        "onRecordingStopped",
        mapOf(
          "status" to "ok",
          "path" to (engine?.sessionDir?.absolutePath ?: ""),
          "fileSize" to 0,
          "errorCode" to "",
        ),
      )
    }
  }

  override fun onDuration(durationMs: Long) {
    lastDurationMs = durationMs
    val sec = (durationMs / 1000).toInt()
    if (sec != lastTickSecond) {
      lastTickSecond = sec
      send("onRecordingTick", mapOf("elapsedSeconds" to sec))
      val mm = sec / 60
      val ss = sec % 60
      val label = "%02d:%02d".format(mm, ss)
      val ctx = appContext.reactContext
      if (ctx != null) RecordingService.updateElapsed(ctx.applicationContext, label)
      overlay?.update("录音中 $label")
    }
  }

  override fun onLevel(level: Double) {
    send("onRecordingLevel", mapOf("level" to level))
  }

  override fun onSegmentSealed(seg: SealedSegment) {
    send(
      "onSegmentSealed",
      mapOf(
        "index" to seg.index,
        "file" to seg.file,
        "nonce" to seg.nonceBase64,
        "sampleCount" to seg.sampleCount,
        "durationMs" to seg.durationMs,
        "byteLength" to seg.byteLength,
        "tag" to seg.tag,
      ),
    )
  }

  override fun onError(code: String, message: String) {
    send("onRecordingError", mapOf("code" to code, "message" to message))
  }

  override fun onPcmFrame(base64: String, bytes: Int) {
    send("onRealtimePcmFrame", mapOf("base64" to base64, "bytes" to bytes))
  }

  override fun onSystemInterrupted(reason: String, elapsedSeconds: Int, segmentCount: Int) {
    send(
      "onRecordingSystemInterrupted",
      mapOf(
        "reason" to reason,
        "elapsedSeconds" to elapsedSeconds,
        "segmentCount" to segmentCount,
        "autoPaused" to true,
      ),
    )
  }

  override fun onSystemInterruptEnded(canResume: Boolean) {
    send("onRecordingSystemInterruptEnded", mapOf("canResume" to canResume))
  }

  override fun onForceStop(reason: String) {
    send(
      "onRecordingForceStop",
      mapOf(
        "reason" to reason,
        "path" to (engine?.sessionDir?.absolutePath ?: ""),
        "segmentPaths" to emptyList<String>(),
      ),
    )
  }

  override fun onMemoryPressure(level: String) {
    send("onRecordingMemoryPressure", mapOf("level" to level))
  }

  private fun send(name: String, body: Map<String, Any?>) {
    main.post { sendEvent(name, body) }
  }

  private fun requireAppContext(): android.content.Context {
    return appContext.reactContext?.applicationContext
      ?: appContext.currentActivity?.applicationContext
      ?: throw IllegalStateException("no android context")
  }

  private fun ensureEngine() {
    if (engine != null) return
    val ctx = runCatching { requireAppContext() }.getOrNull() ?: return
    engine = EncryptedCaptureEngine(ctx).also { it.setListener(this) }
    overlay = RecordingOverlayManager(ctx)
  }
}
