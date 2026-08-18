import Foundation
import AVFoundation

enum AdtsUtil {
  static func endOfLastCompleteFrame(_ data: Data) -> Int {
    var lastStart = -1
    var offset = 0
    let bytes = [UInt8](data)
    while offset < bytes.count - 6 {
      if bytes[offset] == 0xFF && (bytes[offset + 1] & 0xF0) == 0xF0 {
        let frameLength = ((Int(bytes[offset + 3]) & 0x03) << 11)
          | ((Int(bytes[offset + 4]) & 0xFF) << 3)
          | ((Int(bytes[offset + 5]) & 0xE0) >> 5)
        if frameLength < 7 || offset + frameLength > bytes.count { break }
        lastStart = offset
        offset += frameLength
      } else {
        offset += 1
      }
    }
    guard lastStart >= 0 else { return 0 }
    let frameLength = ((Int(bytes[lastStart + 3]) & 0x03) << 11)
      | ((Int(bytes[lastStart + 4]) & 0xFF) << 3)
      | ((Int(bytes[lastStart + 5]) & 0xE0) >> 5)
    let end = lastStart + frameLength
    return end <= bytes.count ? end : 0
  }
}

enum SegmentExporter {
  static func exportPlainM4a(
    keyBase64: String,
    segmentPaths: [String],
    outputPath: String,
    onProgress: @escaping (Double) -> Void
  ) throws -> Int64 {
    guard let keyData = Data(base64Encoded: keyBase64), keyData.count == 32 else {
      throw NSError(domain: "export", code: 1, userInfo: [NSLocalizedDescriptionKey: "bad key"])
    }
    let crypto = SegmentCrypto(key: keyData)
    let aacPath = outputPath + ".src.aac"
    try concatAdts(crypto: crypto, segmentPaths: segmentPaths, outputPath: aacPath, onProgress: onProgress)
    try muxPassthrough(src: aacPath, dest: outputPath)
    try? FileManager.default.removeItem(atPath: aacPath)
    onProgress(1.0)
    let attrs = try FileManager.default.attributesOfItem(atPath: outputPath)
    return (attrs[.size] as? NSNumber)?.int64Value ?? 0
  }

  static func concatAdts(crypto: SegmentCrypto, segmentPaths: [String], outputPath: String, onProgress: @escaping (Double) -> Void) throws {
    if FileManager.default.fileExists(atPath: outputPath) {
      try FileManager.default.removeItem(atPath: outputPath)
    }
    FileManager.default.createFile(atPath: outputPath, contents: nil)
    let handle = try FileHandle(forWritingTo: URL(fileURLWithPath: outputPath))
    defer { try? handle.close() }
    let total = max(1, segmentPaths.reduce(Int64(0)) { acc, p in
      acc + ((try? FileManager.default.attributesOfItem(atPath: p)[.size] as? NSNumber)?.int64Value ?? 0)
    })
    var processed: Int64 = 0
    for path in segmentPaths {
      let data = try Data(contentsOf: URL(fileURLWithPath: path))
      guard data.count >= 20 else { throw NSError(domain: "export", code: 3) }
      let nonce = data.prefix(16)
      let hasTag = data.count >= 16 + 4 + kHmacSize
      let cipherEnd = hasTag ? data.count - kHmacSize : data.count
      let cipher = data.subdata(in: 16..<cipherEnd)
      if hasTag {
        let tag = data.suffix(kHmacSize)
        if !crypto.verify(nonce: Data(nonce), cipher: cipher, tag: Data(tag)) {
          throw NSError(domain: "export", code: 5, userInfo: [NSLocalizedDescriptionKey: "hmac failed"])
        }
      }
      let plain = crypto.decrypt(nonce: Data(nonce), cipher: cipher)
      if plain.count > 4 {
        handle.write(plain.suffix(from: 4))
      }
      processed += Int64(data.count)
      onProgress(min(0.9, Double(processed) / Double(total)))
    }
  }

  private static func muxPassthrough(src: String, dest: String) throws {
    let asset = AVAsset(url: URL(fileURLWithPath: src))
    guard let session = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough) else {
      throw NSError(domain: "export", code: 6, userInfo: [NSLocalizedDescriptionKey: "no export session"])
    }
    if FileManager.default.fileExists(atPath: dest) {
      try FileManager.default.removeItem(atPath: dest)
    }
    session.outputURL = URL(fileURLWithPath: dest)
    session.outputFileType = .m4a
    let sem = DispatchSemaphore(value: 0)
    var err: Error?
    session.exportAsynchronously {
      if session.status != .completed {
        err = session.error ?? NSError(domain: "export", code: 7)
      }
      sem.signal()
    }
    if sem.wait(timeout: .now() + 120) == .timedOut {
      session.cancelExport()
      throw NSError(domain: "export", code: 8, userInfo: [NSLocalizedDescriptionKey: "export timeout"])
    }
    if let err = err { throw err }
  }
}
