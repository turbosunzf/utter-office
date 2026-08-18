import type { ExpoConfig, ConfigContext } from "expo/config";
import { withProjectBuildGradle, type ConfigPlugin } from "@expo/config-plugins";

/**
 * Machine-specific Android NDK pin.
 *
 * Expo / RN default to NDK 27.1.12297006 (react-native/gradle/libs.versions.toml),
 * which `expo-root-project` writes as `ext.ndkVersion` unless it is already set.
 * This dev Mac only has a complete 27.0.12077973 install (the 27.1 dir is an
 * empty shell), so pin the override BEFORE the plugin applies. expo-build-properties
 * exposes no `ndkVersion` knob, so we patch the generated root build.gradle.
 * Harmless on machines where 27.1 is properly installed.
 */
const withAndroidNdkVersion: ConfigPlugin = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes('ext.ndkVersion = "27.0.12077973"')) {
      return cfg;
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      'apply plugin: "expo-root-project"',
      'ext.ndkVersion = "27.0.12077973"\n\napply plugin: "expo-root-project"',
    );
    return cfg;
  });

/**
 * Dynamic Expo config — replaces app.json so we can read APP_ENV at runtime
 * and switch bundleIdentifier / display name for dev / staging / production.
 *
 * APP_ENV is set by package.json scripts:
 *   - dev          → APP_ENV unset (treated as "development")
 *   - dev:staging  → APP_ENV=staging
 *   - dev:prod     → APP_ENV=production (rare; usually only for EAS build)
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const env = process.env.APP_ENV ?? "development";
  const isProd = env === "production";
  const isStaging = env === "staging";

  return {
    ...config,
    name: isProd
      ? "Utter Office"
      : isStaging
        ? "Utter Office (Staging)"
        : "Utter Office (Dev)",
    slug: "utter-office",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    scheme: "utteroffice",
    // 1024x1024 source shared with the desktop client
    // (apps/desktop/build/icon.png). Expo prebuild generates every required
    // iOS icon size from this single PNG.
    icon: "./assets/icon.png",
    ios: {
      supportsTablet: false,
      // Per-variant bundle id overrides exist for one reason: an Apple ID
      // can only sign bundle prefixes it owns, so contributors not on the
      // Multica Apple Developer team (and external users self-building a
      // personal copy against production) need to swap to a reverse-domain
      // they control. Each variant has its own `_<VARIANT>` suffix and is
      // only read inside that variant's branch — a generic
      // `EXPO_BUNDLE_IDENTIFIER` would leak across variants (Expo CLI
      // auto-loads `.env.<mode>.local` regardless of APP_ENV) and collapse
      // dev / staging / prod onto a single id.
      bundleIdentifier: isProd
        ? (process.env.EXPO_BUNDLE_IDENTIFIER_PROD ?? "ai.multica.mobile")
        : isStaging
          ? "ai.multica.mobile.staging"
          : (process.env.EXPO_BUNDLE_IDENTIFIER_DEV ?? "ai.multica.mobile.dev"),
    },
    // Mirror iOS application id so `expo prebuild --platform android` /
    // `expo run:android` can generate the native project. Dev may override
    // via EXPO_BUNDLE_IDENTIFIER_DEV (same as iOS).
    android: {
      package: isProd
        ? (process.env.EXPO_BUNDLE_IDENTIFIER_PROD ?? "ai.multica.mobile")
        : isStaging
          ? "ai.multica.mobile.staging"
          : (process.env.EXPO_BUNDLE_IDENTIFIER_DEV ?? "ai.multica.mobile.dev"),
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "@react-native-community/datetimepicker",
      "react-native-enriched-markdown",
      withAndroidNdkVersion,
      [
        "expo-image-picker",
        {
          // iOS NSPhotoLibraryUsageDescription. Without this string in
          // Info.plist, calling launchImageLibraryAsync hard-crashes on
          // iOS 14+. Camera + microphone are disabled — we only ever read
          // from the existing photo library.
          photosPermission:
            "Allow Utter Office to access your photos to attach images to issues and comments.",
          cameraPermission: false,
          microphonePermission: false,
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            buildReactNativeFromSource: true,
          },
        },
      ],
    ],
    extra: { APP_ENV: env },
  };
};
