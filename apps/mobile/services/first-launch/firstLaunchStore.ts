import { File, Paths } from "expo-file-system";

/**
 * First-launch flags live in the documents directory so they reset on
 * uninstall (matching SharedPreferences). Keychain-backed SecureStore can
 * survive reinstall on iOS and would skip the consent / ATT flow.
 */
const FILE = new File(Paths.document, "first-launch.json");

export interface FirstLaunchFlags {
  privacyAccepted: boolean;
  firstLaunchCompleted: boolean;
}

const EMPTY: FirstLaunchFlags = {
  privacyAccepted: false,
  firstLaunchCompleted: false,
};

export async function readFirstLaunchFlags(): Promise<FirstLaunchFlags> {
  if (!FILE.exists) return EMPTY;
  try {
    const parsed = JSON.parse(await Promise.resolve(FILE.text())) as Partial<FirstLaunchFlags>;
    return {
      privacyAccepted: parsed.privacyAccepted === true,
      firstLaunchCompleted: parsed.firstLaunchCompleted === true,
    };
  } catch {
    return EMPTY;
  }
}

export async function writeFirstLaunchFlags(
  flags: FirstLaunchFlags,
): Promise<void> {
  if (!FILE.exists) {
    try {
      FILE.create();
    } catch {
      // create() throws if the file already exists
    }
  }
  FILE.write(JSON.stringify(flags));
}

export async function markPrivacyAccepted(): Promise<void> {
  await writeFirstLaunchFlags({
    privacyAccepted: true,
    firstLaunchCompleted: true,
  });
}
