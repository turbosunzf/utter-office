import Foundation
import CommonCrypto
import Security

let kNonceSize = 16
let kHmacSize = 32
let kSampleRate = 22050
let kChannels = 1
let kBitrate = 32000
let kSegmentSeconds = 30

final class SegmentCrypto {
  let key: Data
  init(key: Data) {
    precondition(key.count == 32)
    self.key = key
  }

  func newNonce() -> Data {
    var bytes = [UInt8](repeating: 0, count: kNonceSize)
    _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
    return Data(bytes)
  }

  final class Cryptor {
    fileprivate var ref: CCCryptorRef?
    deinit { if let ref = ref { CCCryptorRelease(ref) } }
    func update(_ input: Data) -> Data {
      guard let ref = ref, !input.isEmpty else { return Data() }
      var output = [UInt8](repeating: 0, count: input.count)
      var moved = 0
      input.withUnsafeBytes { inPtr in
        _ = CCCryptorUpdate(ref, inPtr.baseAddress, input.count, &output, output.count, &moved)
      }
      return Data(output.prefix(moved))
    }
  }

  func newCryptor(nonce: Data) -> Cryptor {
    let cryptor = Cryptor()
    key.withUnsafeBytes { keyPtr in
      nonce.withUnsafeBytes { ivPtr in
        var ref: CCCryptorRef?
        _ = CCCryptorCreateWithMode(
          CCOperation(kCCEncrypt),
          CCMode(kCCModeCTR),
          CCAlgorithm(kCCAlgorithmAES),
          CCPadding(ccNoPadding),
          ivPtr.baseAddress,
          keyPtr.baseAddress, key.count,
          nil, 0, 0,
          CCModeOptions(kCCModeOptionCTR_BE),
          &ref
        )
        cryptor.ref = ref
      }
    }
    return cryptor
  }

  func decrypt(nonce: Data, cipher: Data) -> Data {
    newCryptor(nonce: nonce).update(cipher)
  }

  func hmac(nonce: Data, cipher: Data) -> Data {
    var mac = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
    var message = Data()
    message.append(nonce)
    message.append(cipher)
    message.withUnsafeBytes { msgPtr in
      key.withUnsafeBytes { keyPtr in
        CCHmac(CCHmacAlgorithm(kCCHmacAlgSHA256), keyPtr.baseAddress, key.count, msgPtr.baseAddress, message.count, &mac)
      }
    }
    return Data(mac)
  }

  func verify(nonce: Data, cipher: Data, tag: Data) -> Bool {
    let expected = hmac(nonce: nonce, cipher: cipher)
    guard expected.count == tag.count else { return false }
    var diff: UInt8 = 0
    for i in 0..<expected.count { diff |= expected[i] ^ tag[i] }
    return diff == 0
  }
}

enum RecordingMasterKeyIOS {
  static let account = "meeting_recording_master_key_v1"

  static func getOrCreate() throws -> String {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: account,
      kSecReturnData as String: true,
    ]
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    if status == errSecSuccess, let data = result as? Data {
      return data.base64EncodedString()
    }
    var bytes = [UInt8](repeating: 0, count: 32)
    _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
    let key = Data(bytes)
    let add: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: account,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
      kSecValueData as String: key,
    ]
    SecItemAdd(add as CFDictionary, nil)
    return key.base64EncodedString()
  }
}
