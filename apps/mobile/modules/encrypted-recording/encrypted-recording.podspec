require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name           = "EncryptedRecording"
  s.version        = package["version"]
  s.summary        = "Encrypted segmented meeting recording"
  s.description    = "AES-CTR segmented AAC recording with HMAC and crash recovery"
  s.license        = "MIT"
  s.author         = "Multica"
  s.homepage       = "https://github.com/multica"
  s.platforms      = { :ios => "15.1" }
  s.source         = { git: "" }
  s.static_framework = true
  s.dependency "ExpoModulesCore"
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.frameworks = "AVFoundation", "AudioToolbox", "Security", "UIKit"
end
