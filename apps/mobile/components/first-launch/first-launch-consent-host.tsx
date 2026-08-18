import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  markPrivacyAccepted,
  readFirstLaunchFlags,
} from "@/services/first-launch/firstLaunchStore";
import { primeIosCellularData } from "@/services/first-launch/primeIosCellularData";
import { requestAppTrackingPermission } from "@/services/first-launch/requestAppTrackingPermission";
import { PrivacyConsentDialog } from "./privacy-consent-dialog";

/** After cellular probe, wait so that sheet is not eaten by the in-app dialog. */
const PRIVACY_AFTER_CELLULAR_MS = 400;
/** After 同意, wait so ATT is not eaten by the closing privacy modal. */
const ATT_DELAY_MS = 300;

/**
 * First cold start (esimgo-style, staggered so iOS does not swallow dialogs):
 * 1. iOS cellular / wireless-data sheet — lightweight fetch, not waiting for
 *    privacy confirm (Wi-Fi skips the probe)
 * 2. In-app privacy confirm — required; not marked complete until 同意
 * 3. iOS ATT — 300ms after confirm
 *
 * Mic / camera stay on the recording path. Android has no cellular or ATT
 * sheet; it still shows the privacy confirm.
 */
export function FirstLaunchConsentHost() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cellularPrimed = useRef(false);
  const attRequested = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let cancelled = false;

    void (async () => {
      const flags = await readFirstLaunchFlags();
      if (cancelled) return;

      if (flags.privacyAccepted) {
        await new Promise((r) => setTimeout(r, ATT_DELAY_MS));
        if (cancelled) return;
        void requestAttOnce();
        return;
      }

      if (Platform.OS === "ios" && !cellularPrimed.current) {
        cellularPrimed.current = true;
        await primeIosCellularData();
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, PRIVACY_AFTER_CELLULAR_MS));
        if (cancelled) return;
      }

      setShowPrivacy(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestAttOnce = async () => {
    if (Platform.OS !== "ios" || attRequested.current) return;
    attRequested.current = true;
    await requestAppTrackingPermission();
  };

  const onAgree = () => {
    if (confirming) return;
    setConfirming(true);
    void (async () => {
      try {
        await markPrivacyAccepted();
        setShowPrivacy(false);
        if (Platform.OS === "ios") {
          await new Promise((r) => setTimeout(r, ATT_DELAY_MS));
          await requestAttOnce();
        }
      } finally {
        setConfirming(false);
      }
    })();
  };

  if (Platform.OS === "web") return null;

  return (
    <PrivacyConsentDialog
      visible={showPrivacy}
      confirming={confirming}
      onAgree={onAgree}
    />
  );
}
