const {
  withInfoPlist,
  withAndroidManifest,
  AndroidConfig,
} = require("@expo/config-plugins");

const MIC_USAGE =
  "Utter Office 需要麦克风来录制会议。录音保存在本机并加密存储。";
const CAMERA_USAGE =
  "Utter Office 需要使用相机，以便在会议录音时拍摄现场照片。";

const ANDROID_PERMISSIONS = [
  "android.permission.RECORD_AUDIO",
  "android.permission.CAMERA",
  "android.permission.MODIFY_AUDIO_SETTINGS",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MICROPHONE",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.SYSTEM_ALERT_WINDOW",
];

/**
 * Inject iOS usage strings + background audio, and ensure Android does not
 * strip RECORD_AUDIO / CAMERA (Expo defaults mark them tools:node="remove").
 */
function withEncryptedRecording(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.NSMicrophoneUsageDescription = MIC_USAGE;
    cfg.modResults.NSCameraUsageDescription =
      cfg.modResults.NSCameraUsageDescription || CAMERA_USAGE;
    const modes = new Set(cfg.modResults.UIBackgroundModes || []);
    modes.add("audio");
    cfg.modResults.UIBackgroundModes = [...modes];
    return cfg;
  });

  config = AndroidConfig.Permissions.withPermissions(
    config,
    ANDROID_PERMISSIONS,
  );

  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const uses = manifest["uses-permission"] ?? [];
    const wanted = new Set(ANDROID_PERMISSIONS);
    for (const entry of uses) {
      const name = entry.$?.["android:name"];
      if (!name || !wanted.has(name)) continue;
      if (entry.$["tools:node"] === "remove") {
        delete entry.$["tools:node"];
      }
    }
    const present = new Set(uses.map((e) => e.$?.["android:name"]));
    for (const perm of ANDROID_PERMISSIONS) {
      if (present.has(perm)) continue;
      uses.push({ $: { "android:name": perm } });
    }
    manifest["uses-permission"] = uses;
    return cfg;
  });
}

module.exports = withEncryptedRecording;
