import AVFoundation
import Foundation
import UIKit

protocol RecorderSessionDelegate: AnyObject {
  func recorder(didChangeState state: String)
  func recorder(didUpdateDuration durationMs: Int64)
  func recorder(didUpdateLevel level: Double)
  func recorder(didSealSegment seg: SealedSegment)
  func recorder(didError code: String, message: String)
  func recorder(didPcmFrame base64: String, bytes: Int)
  func recorder(didInterrupt reason: String, elapsed: Int, segments: Int)
  func recorder(didInterruptEnd canResume: Bool)
  func recorder(didForceStop reason: String)
}

final class RecorderSession {
  static let stateRecording = "recording"
  static let statePaused = "paused"
  static let stateInterrupted = "interrupted"
  static let stateFinalized = "finalized"

  private let minFreeBytes: Int64 = 50 * 1024 * 1024
  private let fsyncThreshold: Int64 = 64 * 1024
  weak var delegate: RecorderSessionDelegate?

  private var sampleRate = kSampleRate
  private var channels = kChannels
  private var segmentSamples: Int64 = Int64(kSampleRate * kSegmentSeconds)
  private var dir: URL!
  private var crypto: SegmentCrypto!
  private var writer: SegmentWriter?
  private var engine = AVAudioEngine()
  private var converter: AVAudioConverter?
  private var aacFormat: AVAudioFormat!
  private let writerQueue = DispatchQueue(label: "ai.multica.recorder.writer")
  private(set) var isActive = false
  private var paused = false
  private var pausedByInterruption = false
  private var committedSamples: Int64 = 0
  private var lastDurationEmit: TimeInterval = 0
  private var lastLevelEmit: TimeInterval = 0
  private var pcmAccum = Data()
  var lastIndex: Int { writer?.currentIndex ?? -1 }
  var sessionDir: URL? { dir }

  func start(dir: String, keyBase64: String, sampleRate: Int, channels: Int, segmentSeconds: Int, startIndex: Int) throws {
    if isActive { throw NSError(domain: "recorder", code: 1, userInfo: [NSLocalizedDescriptionKey: "already recording"]) }
    self.sampleRate = sampleRate
    self.channels = channels
    self.segmentSamples = Int64(sampleRate) * Int64(segmentSeconds)
    self.dir = URL(fileURLWithPath: dir)
    try FileManager.default.createDirectory(at: self.dir, withIntermediateDirectories: true)
    guard let key = Data(base64Encoded: keyBase64) else {
      throw NSError(domain: "recorder", code: 3, userInfo: [NSLocalizedDescriptionKey: "bad key"])
    }
    crypto = SegmentCrypto(key: key)
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.record, mode: .default, options: [.allowBluetooth, .mixWithOthers])
    try session.setActive(true)
    guard let aac = AVAudioFormat(settings: [
      AVFormatIDKey: kAudioFormatMPEG4AAC,
      AVSampleRateKey: sampleRate,
      AVNumberOfChannelsKey: channels,
      AVEncoderBitRateKey: kBitrate,
    ]) else {
      throw NSError(domain: "recorder", code: 4, userInfo: [NSLocalizedDescriptionKey: "aac format failed"])
    }
    aacFormat = aac
    let w = SegmentWriter(dir: self.dir, crypto: crypto, sampleRate: sampleRate, startIndex: startIndex)
    committedSamples = 0
    paused = false
    pausedByInterruption = false
    writerQueue.sync {
      self.writer = w
      w.openNext()
    }
    registerObservers()
    UIDevice.current.isBatteryMonitoringEnabled = true
    try startEngine()
    isActive = true
    delegate?.recorder(didChangeState: RecorderSession.stateRecording)
  }

  private func startEngine() throws {
    let input = engine.inputNode
    let inputFormat = input.inputFormat(forBus: 0)
    converter = AVAudioConverter(from: inputFormat, to: aacFormat)
    input.removeTap(onBus: 0)
    input.installTap(onBus: 0, bufferSize: 2048, format: inputFormat) { [weak self] buffer, _ in
      self?.process(pcm: buffer)
    }
    engine.prepare()
    try engine.start()
  }

  private func stopEngine() {
    engine.inputNode.removeTap(onBus: 0)
    if engine.isRunning { engine.stop() }
  }

  func pause() {
    guard isActive, !paused else { return }
    paused = true
    pausedByInterruption = false
    stopEngine()
    writerQueue.sync { self.sealCurrentUnlocked() }
    delegate?.recorder(didChangeState: RecorderSession.statePaused)
  }

  func resume() { resumeWithRetry(attempt: 0) }

  private func resumeWithRetry(attempt: Int) {
    guard isActive, paused else { return }
    do {
      try AVAudioSession.sharedInstance().setCategory(.record, mode: .default, options: [.allowBluetooth, .mixWithOthers])
      try AVAudioSession.sharedInstance().setActive(true)
      try startEngine()
      writerQueue.sync { self.writer?.openNext() }
      paused = false
      pausedByInterruption = false
      delegate?.recorder(didChangeState: RecorderSession.stateRecording)
    } catch {
      stopEngine()
      if attempt < 8 {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
          self?.resumeWithRetry(attempt: attempt + 1)
        }
      } else {
        delegate?.recorder(didError: "resume", message: error.localizedDescription)
      }
    }
  }

  func stop() { finalize(state: RecorderSession.stateFinalized) }

  private func finalize(state: String) {
    guard isActive else { return }
    isActive = false
    stopEngine()
    writerQueue.sync {
      self.sealCurrentUnlocked()
      self.writer = nil
    }
    removeObservers()
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    delegate?.recorder(didChangeState: state)
  }

  private func sealCurrentUnlocked() {
    guard let w = writer, w.hasOpenSegment else { return }
    if let sealed = w.seal() {
      committedSamples += sealed.sampleCount
      delegate?.recorder(didSealSegment: sealed)
    }
  }

  private func process(pcm: AVAudioPCMBuffer) {
    guard let converter = converter, !paused else { return }
    emitLevel(pcm)
    emitPcm(pcm)
    let outBuffer = AVAudioCompressedBuffer(
      format: aacFormat,
      packetCapacity: 16,
      maximumPacketSize: converter.maximumOutputPacketSize
    )
    var fed = false
    let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
      if fed { outStatus.pointee = .noDataNow; return nil }
      fed = true
      outStatus.pointee = .haveData
      return pcm
    }
    var error: NSError?
    let status = converter.convert(to: outBuffer, error: &error, withInputFrom: inputBlock)
    if status == .error { return }
    writerQueue.sync { self.writeCompressedUnlocked(outBuffer) }
  }

  private func writeCompressedUnlocked(_ buffer: AVAudioCompressedBuffer) {
    guard let writer = writer, writer.hasOpenSegment else { return }
    let packetCount = Int(buffer.packetCount)
    guard packetCount > 0 else { return }
    let base = buffer.data.assumingMemoryBound(to: UInt8.self)
    let descriptions = buffer.packetDescriptions
    for i in 0..<packetCount {
      let size: Int
      let offset: Int
      if let descriptions = descriptions {
        size = Int(descriptions[i].mDataByteSize)
        offset = Int(descriptions[i].mStartOffset)
      } else {
        size = Int(buffer.byteLength)
        offset = 0
      }
      if size <= 0 { continue }
      var frame = adtsHeader(payloadLen: size)
      frame.append(Data(bytes: base + offset, count: size))
      writer.appendFrame(frame, frameSamples: 1024)
      writer.maybeSync(threshold: fsyncThreshold)
      if writer.currentSampleCount >= segmentSamples {
        if let sealed = writer.seal() {
          committedSamples += sealed.sampleCount
          delegate?.recorder(didSealSegment: sealed)
        }
        writer.openNext()
      }
    }
    let now = Date().timeIntervalSince1970
    if now - lastDurationEmit > 0.25 {
      let total = (committedSamples + writer.currentSampleCount) * 1000 / Int64(sampleRate)
      delegate?.recorder(didUpdateDuration: total)
      lastDurationEmit = now
    }
  }

  private func emitPcm(_ pcm: AVAudioPCMBuffer) {
    guard let ch = pcm.int16ChannelData ?? pcm.floatChannelData.map({ _ in nil as UnsafePointer<Int16>? }) else {
      // float path
      guard let floats = pcm.floatChannelData else { return }
      let frames = Int(pcm.frameLength)
      var i16 = Data(count: frames * 2)
      i16.withUnsafeMutableBytes { raw in
        let dst = raw.bindMemory(to: Int16.self)
        for i in 0..<frames {
          let s = max(-1, min(1, floats[0][i]))
          dst[i] = Int16(s * 32767)
        }
      }
      appendPcm16(i16, inRate: Int(pcm.format.sampleRate))
      return
    }
    _ = ch
  }

  private func appendPcm16(_ data: Data, inRate: Int) {
    let outRate = 16000
    let inSamples = data.count / 2
    let outSamples = max(1, inSamples * outRate / inRate)
    var out = Data(count: outSamples * 2)
    data.withUnsafeBytes { srcRaw in
      out.withUnsafeMutableBytes { dstRaw in
        let src = srcRaw.bindMemory(to: Int16.self)
        let dst = dstRaw.bindMemory(to: Int16.self)
        for i in 0..<outSamples {
          let idx = min(inSamples - 1, i * inRate / outRate)
          dst[i] = src[idx]
        }
      }
    }
    pcmAccum.append(out)
    let target = 6400 * 4
    if pcmAccum.count >= target {
      let batch = pcmAccum
      pcmAccum = Data()
      delegate?.recorder(didPcmFrame: batch.base64EncodedString(), bytes: batch.count)
    }
  }

  private func adtsHeader(payloadLen: Int) -> Data {
    let profile = 2
    let freqIdx = 7
    let chanCfg = channels
    let fullLen = payloadLen + 7
    var h = [UInt8](repeating: 0, count: 7)
    h[0] = 0xFF; h[1] = 0xF9
    h[2] = UInt8(((profile - 1) << 6) + (freqIdx << 2) + (chanCfg >> 2))
    h[3] = UInt8(((chanCfg & 3) << 6) + (fullLen >> 11))
    h[4] = UInt8((fullLen & 0x7FF) >> 3)
    h[5] = UInt8(((fullLen & 7) << 5) + 0x1F)
    h[6] = 0xFC
    return Data(h)
  }

  private func emitLevel(_ pcm: AVAudioPCMBuffer) {
    guard let channelData = pcm.floatChannelData else { return }
    let frames = Int(pcm.frameLength)
    guard frames > 0 else { return }
    var sum: Float = 0
    let samples = channelData[0]
    for i in 0..<frames { sum += samples[i] * samples[i] }
    let rms = sqrt(sum / Float(frames))
    let now = Date().timeIntervalSince1970
    if now - lastLevelEmit > 0.12 {
      delegate?.recorder(didUpdateLevel: Double(min(max(rms, 0), 1)))
      lastLevelEmit = now
    }
  }

  private func registerObservers() {
    let nc = NotificationCenter.default
    nc.addObserver(self, selector: #selector(handleInterruption(_:)), name: AVAudioSession.interruptionNotification, object: nil)
    nc.addObserver(self, selector: #selector(handleRouteChange(_:)), name: AVAudioSession.routeChangeNotification, object: nil)
    nc.addObserver(self, selector: #selector(handleBattery(_:)), name: UIDevice.batteryLevelDidChangeNotification, object: nil)
  }

  private func removeObservers() { NotificationCenter.default.removeObserver(self) }

  @objc private func handleInterruption(_ note: Notification) {
    guard let info = note.userInfo,
          let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
          let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }
    DispatchQueue.main.async { [weak self] in
      switch type {
      case .began:
        self?.onInterruptBegan()
      case .ended:
        self?.onInterruptEnded()
      @unknown default: break
      }
    }
  }

  private func onInterruptBegan() {
    guard isActive, !paused else { return }
    paused = true
    pausedByInterruption = true
    stopEngine()
    writerQueue.sync { self.sealCurrentUnlocked() }
    let elapsed = Int((committedSamples * 1000 / Int64(sampleRate)) / 1000)
    delegate?.recorder(didInterrupt: "audio_session", elapsed: elapsed, segments: lastIndex)
    delegate?.recorder(didChangeState: RecorderSession.stateInterrupted)
  }

  private func onInterruptEnded() {
    guard isActive, paused, pausedByInterruption else { return }
    engine = AVAudioEngine()
    delegate?.recorder(didInterruptEnd: true)
    resumeWithRetry(attempt: 0)
  }

  @objc private func handleRouteChange(_ note: Notification) {
    guard let info = note.userInfo,
          let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
          let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else { return }
    if reason == .oldDeviceUnavailable || reason == .newDeviceAvailable {
      DispatchQueue.main.async { [weak self] in
        guard let self = self, self.isActive, !self.paused else { return }
        self.stopEngine()
        self.writerQueue.sync { self.sealCurrentUnlocked() }
        self.engine = AVAudioEngine()
        try? self.startEngine()
        self.writerQueue.sync { self.writer?.openNext() }
      }
    }
  }

  @objc private func handleBattery(_ note: Notification) {
    let level = UIDevice.current.batteryLevel
    if level >= 0, level <= 0.05, isActive {
      DispatchQueue.main.async { [weak self] in
        self?.delegate?.recorder(didForceStop: "low_battery")
        self?.finalize(state: RecorderSession.stateFinalized)
      }
    }
  }
}
