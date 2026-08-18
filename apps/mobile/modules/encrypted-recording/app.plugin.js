const { withInfoPlist } = require("@expo/config-plugins");

/**
 * Inject iOS microphone usage + background audio. Android permissions and
 * the recording Service live in the module's own AndroidManifest.xml.
 */
function withEncryptedRecording(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSMicrophoneUsageDescription =
      cfg.modResults.NSMicrophoneUsageDescription ||
      "Utter Office 需要麦克风来录制会议。录音保存在本机并加密存储。";
    const modes = new Set(cfg.modResults.UIBackgroundModes || []);
    modes.add("audio");
    cfg.modResults.UIBackgroundModes = [...modes];
    return cfg;
  });
}

module.exports = withEncryptedRecording;
