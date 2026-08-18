import ExpoModulesCore
import Foundation

public class RecordingModule: Module, RecorderSessionDelegate {
  private let session = RecorderSession()
  private var lastDurationMs: Int64 = 0

  public func definition() -> ModuleDefinition {
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
      "onRecordingLevel"
    )

    OnCreate {
      self.session.delegate = self
    }

    OnAppEntersForeground {
      if self.session.isActive {
        self.sendEvent("onAppResumedWhileRecording", [:])
      }
    }

    AsyncFunction("getOrCreateMasterKey") { () -> String in
      try RecordingMasterKeyIOS.getOrCreate()
    }

    AsyncFunction("startEncryptedRecording") { (sessionDir: String, masterKey: String, startIndex: Int, _: Double) in
      try self.session.start(
        dir: sessionDir,
        keyBase64: masterKey,
        sampleRate: kSampleRate,
        channels: kChannels,
        segmentSeconds: kSegmentSeconds,
        startIndex: startIndex
      )
    }

    Function("pauseRecording") {
      self.session.pause()
    }

    Function("resumeRecording") {
      self.session.resume()
    }

    AsyncFunction("stopEncryptedRecording") { () -> [String: Any] in
      self.session.stop()
      return [
        "status": "stopped",
        "elapsedMs": self.lastDurationMs,
      ]
    }

    Function("isRecording") { () -> Bool in
      self.session.isActive
    }

    AsyncFunction("getRecordingRuntimeState") { () -> [String: Any] in
      let dir = self.session.sessionDir
      let hasFiles = (try? FileManager.default.contentsOfDirectory(atPath: dir?.path ?? ""))?.isEmpty == false
      return [
        "isRecording": self.session.isActive,
        "hasFiles": hasFiles,
        "sessionDir": dir?.path ?? "",
        "lastIndex": self.session.lastIndex,
      ]
    }

    AsyncFunction("exportPlainM4a") { (keyBase64: String, segmentPaths: [String], outputPath: String) -> [String: Any] in
      let len = try SegmentExporter.exportPlainM4a(
        keyBase64: keyBase64,
        segmentPaths: segmentPaths,
        outputPath: outputPath,
        onProgress: { _ in }
      )
      return ["path": outputPath, "byteLength": len]
    }

    AsyncFunction("reconcileSession") { (sessionDir: String, masterKey: String) -> [String: Any] in
      try EncryptedSessionHostIOS.reconcile(dir: sessionDir, keyBase64: masterKey)
    }

    Function("canDrawOverlays") { () -> Bool in true }
    Function("openOverlaySettings") {}
    Function("setOverlayEnabled") { (_: Bool) in }

    AsyncFunction("freeBytes") { (path: String) -> Int64 in
      let values = try URL(fileURLWithPath: path).resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
      return values.volumeAvailableCapacityForImportantUsage ?? 0
    }
  }

  func recorder(didChangeState state: String) {
    sendEvent("onRecordingState", ["state": state])
    if state == RecorderSession.stateFinalized {
      sendEvent("onRecordingStopped", [
        "status": "ok",
        "path": session.sessionDir?.path ?? "",
        "fileSize": 0,
        "errorCode": "",
      ])
    }
  }

  func recorder(didUpdateDuration durationMs: Int64) {
    lastDurationMs = durationMs
    sendEvent("onRecordingTick", ["elapsedSeconds": Int(durationMs / 1000)])
  }

  func recorder(didUpdateLevel level: Double) {
    sendEvent("onRecordingLevel", ["level": level])
  }

  func recorder(didSealSegment seg: SealedSegment) {
    sendEvent("onSegmentSealed", [
      "index": seg.index,
      "file": seg.file,
      "nonce": seg.nonceBase64,
      "sampleCount": seg.sampleCount,
      "durationMs": seg.durationMs,
      "byteLength": seg.byteLength,
      "tag": seg.tag,
    ])
  }

  func recorder(didError code: String, message: String) {
    sendEvent("onRecordingError", ["code": code, "message": message])
  }

  func recorder(didPcmFrame base64: String, bytes: Int) {
    sendEvent("onRealtimePcmFrame", ["base64": base64, "bytes": bytes])
  }

  func recorder(didInterrupt reason: String, elapsed: Int, segments: Int) {
    sendEvent("onRecordingSystemInterrupted", [
      "reason": reason,
      "elapsedSeconds": elapsed,
      "segmentCount": segments,
      "autoPaused": true,
    ])
  }

  func recorder(didInterruptEnd canResume: Bool) {
    sendEvent("onRecordingSystemInterruptEnded", ["canResume": canResume])
  }

  func recorder(didForceStop reason: String) {
    sendEvent("onRecordingForceStop", [
      "reason": reason,
      "path": session.sessionDir?.path ?? "",
      "segmentPaths": [],
    ])
  }
}

enum EncryptedSessionHostIOS {
  static func reconcile(dir: String, keyBase64: String) throws -> [String: Any] {
    let url = URL(fileURLWithPath: dir)
    let manifestURL = url.appendingPathComponent(".manifest")
    guard FileManager.default.fileExists(atPath: manifestURL.path) else {
      return ["sessionId": url.lastPathComponent, "state": "empty", "totalDurationMs": 0, "segmentCount": 0, "lastIndex": -1]
    }
    let data = try Data(contentsOf: manifestURL)
    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
    let segments = json["segments"] as? [[String: Any]] ?? []
    return [
      "sessionId": json["sessionId"] ?? url.lastPathComponent,
      "state": json["state"] ?? "open",
      "totalDurationMs": json["totalDurationMs"] ?? 0,
      "segmentCount": segments.count,
      "lastIndex": segments.map { ($0["index"] as? Int) ?? -1 }.max() ?? -1,
    ]
  }
}
