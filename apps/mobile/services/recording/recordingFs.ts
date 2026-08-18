import { Directory, File, Paths } from "expo-file-system";
import { REC_DIR_NAME } from "@/native/recording/encryptedRecordingSpec";

export function recRoot(): Directory {
  return new Directory(Paths.document, REC_DIR_NAME);
}

export function ensureDir(dir: Directory): Directory {
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export function sessionDirectory(sessionId: string): Directory {
  return ensureDir(new Directory(recRoot(), sessionId));
}

export function fileIn(dir: Directory, name: string): File {
  return new File(dir, name);
}

export async function readJson<T>(file: File, fallback: T): Promise<T> {
  if (!file.exists) return fallback;
  try {
    const text = await Promise.resolve(file.text());
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(file: File, value: unknown): Promise<void> {
  await Promise.resolve(file.write(JSON.stringify(value)));
}

export function availableBytes(): number {
  return Paths.availableDiskSpace ?? Number.MAX_SAFE_INTEGER;
}

export function nativePath(fileOrDir: File | Directory): string {
  return fileOrDir.uri.replace(/^file:\/\//, "");
}

export function fileUri(path: string): string {
  return path.startsWith("file:") ? path : `file://${path}`;
}
