import Foundation

struct SealedSegment {
  let index: Int
  let file: String
  let nonceBase64: String
  let sampleCount: Int64
  let durationMs: Int64
  let byteLength: Int64
  let tag: String
}

final class SegmentWriter {
  private let dir: URL
  private let crypto: SegmentCrypto
  private let sampleRate: Int
  private var index: Int
  private var handle: FileHandle?
  private var cryptor: SegmentCrypto.Cryptor?
  private var currentURL: URL?
  private var currentNonce: Data?
  private var sampleCount: Int64 = 0
  private var byteLength: Int64 = 0
  private var bytesSinceSync: Int64 = 0
  private var cipherAccum = Data()

  init(dir: URL, crypto: SegmentCrypto, sampleRate: Int, startIndex: Int = 0) {
    self.dir = dir
    self.crypto = crypto
    self.sampleRate = sampleRate
    self.index = startIndex - 1
  }

  var hasOpenSegment: Bool { handle != nil }
  var currentSampleCount: Int64 { sampleCount }
  var currentIndex: Int { index }

  private func randomName() -> String {
    var bytes = [UInt8](repeating: 0, count: 16)
    _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
    return bytes.map { String(format: "%02x", $0) }.joined()
  }

  private func intBE(_ value: Int) -> Data {
    let v = UInt32(truncatingIfNeeded: value)
    return Data([
      UInt8((v >> 24) & 0xFF), UInt8((v >> 16) & 0xFF),
      UInt8((v >> 8) & 0xFF), UInt8(v & 0xFF),
    ])
  }

  func openNext() {
    let nextIndex = index + 1
    let url = dir.appendingPathComponent(randomName())
    let nonce = crypto.newNonce()
    FileManager.default.createFile(atPath: url.path, contents: nil)
    guard let h = try? FileHandle(forWritingTo: url) else { return }
    h.write(nonce)
    let c = crypto.newCryptor(nonce: nonce)
    let encIndex = c.update(intBE(nextIndex))
    h.write(encIndex)
    cipherAccum = encIndex
    index = nextIndex
    handle = h
    cryptor = c
    currentURL = url
    currentNonce = nonce
    sampleCount = 0
    byteLength = 0
    bytesSinceSync = 0
  }

  func appendFrame(_ adts: Data, frameSamples: Int) {
    guard let h = handle, let c = cryptor else { return }
    let enc = c.update(adts)
    h.write(enc)
    cipherAccum.append(enc)
    sampleCount += Int64(frameSamples)
    byteLength += Int64(adts.count)
    bytesSinceSync += Int64(adts.count)
  }

  func maybeSync(threshold: Int64) {
    guard let h = handle else { return }
    if bytesSinceSync >= threshold {
      try? h.synchronize()
      bytesSinceSync = 0
    }
  }

  @discardableResult
  func seal() -> SealedSegment? {
    guard let h = handle else { return nil }
    let url = currentURL
    let nonce = currentNonce
    if let nonce = nonce {
      let tag = crypto.hmac(nonce: nonce, cipher: cipherAccum)
      h.write(tag)
    }
    try? h.synchronize()
    try? h.close()
    handle = nil
    cryptor = nil

    if sampleCount <= 0 || url == nil || nonce == nil {
      if let url = url { try? FileManager.default.removeItem(at: url) }
      currentURL = nil
      currentNonce = nil
      cipherAccum = Data()
      return nil
    }
    let tag = crypto.hmac(nonce: nonce!, cipher: cipherAccum)
    let sealed = SealedSegment(
      index: index,
      file: url!.lastPathComponent,
      nonceBase64: nonce!.base64EncodedString(),
      sampleCount: sampleCount,
      durationMs: sampleCount * 1000 / Int64(sampleRate),
      byteLength: byteLength,
      tag: tag.base64EncodedString()
    )
    currentURL = nil
    currentNonce = nil
    cipherAccum = Data()
    return sealed
  }
}
