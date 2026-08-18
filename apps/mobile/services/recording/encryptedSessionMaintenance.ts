import { Directory, File } from "expo-file-system";
import { fileIn, nativePath, sessionDirectory } from "./recordingFs";
import {
  MERGE_VOLUME_SEGMENTS,
} from "@/native/recording/encryptedRecordingSpec";
import { exportPlainM4a } from "@/native/recording/RecordingBridge";
import type { RecordingVolume } from "@/data/recording/recordingTypes";

export type VolumeManifest = {
  volumes: RecordingVolume[];
  mergedThroughIndex: number;
};

function volumesFile(sessionDir: Directory): File {
  return fileIn(sessionDir, "volumes.json");
}

export async function loadVolumes(sessionDirPath: string): Promise<VolumeManifest> {
  const dir = new Directory(sessionDirPath.startsWith("file:") ? sessionDirPath : `file://${sessionDirPath}`);
  const file = volumesFile(dir);
  if (!file.exists) return { volumes: [], mergedThroughIndex: -1 };
  try {
    return JSON.parse(await Promise.resolve(file.text())) as VolumeManifest;
  } catch {
    return { volumes: [], mergedThroughIndex: -1 };
  }
}

async function saveVolumes(sessionDirPath: string, manifest: VolumeManifest): Promise<void> {
  const dir = new Directory(
    sessionDirPath.startsWith("file:") ? sessionDirPath : `file://${sessionDirPath}`,
  );
  const file = volumesFile(dir);
  await Promise.resolve(file.write(JSON.stringify(manifest)));
}

export async function invalidateMergeArtifacts(sessionDirPath: string): Promise<void> {
  // Resume after pause: keep completed volumes, drop an unfinished tail export.
  const dir = new Directory(
    sessionDirPath.startsWith("file:") ? sessionDirPath : `file://${sessionDirPath}`,
  );
  const tail = fileIn(dir, "export-tail.m4a");
  if (tail.exists) tail.delete();
}

export function listSegmentPaths(
  sessionDirPath: string,
  files: { file: string; index: number }[],
): string[] {
  const prefix = sessionDirPath.replace(/\/$/, "");
  return [...files]
    .sort((a, b) => a.index - b.index)
    .map((s) => `${prefix}/${s.file}`);
}

export async function maybeMergeVolume(opts: {
  sessionDir: string;
  masterKey: string;
  sealed: { file: string; index: number; durationMs: number }[];
}): Promise<VolumeManifest> {
  const manifest = await loadVolumes(opts.sessionDir);
  const pending = opts.sealed.filter((s) => s.index > manifest.mergedThroughIndex);
  if (pending.length < MERGE_VOLUME_SEGMENTS) return manifest;

  const batch = pending.slice(0, MERGE_VOLUME_SEGMENTS);
  const volIndex = manifest.volumes.length + 1;
  const fileName = `export-${String(volIndex).padStart(3, "0")}.m4a`;
  const output = `${opts.sessionDir.replace(/\/$/, "")}/${fileName}`;
  try {
    await exportPlainM4a(
      opts.masterKey,
      listSegmentPaths(opts.sessionDir, batch),
      output,
    );
    const durationMs = batch.reduce((n, s) => n + s.durationMs, 0);
    manifest.volumes.push({
      file: fileName,
      uri: output.startsWith("file:") ? output : `file://${output}`,
      fromIndex: batch[0]!.index,
      toIndex: batch[batch.length - 1]!.index,
      durationMs,
    });
    manifest.mergedThroughIndex = batch[batch.length - 1]!.index;
    await saveVolumes(opts.sessionDir, manifest);
  } catch {
    // Merge is best-effort during capture; stop path will retry the tail.
  }
  return manifest;
}

export async function mergeTail(opts: {
  sessionDir: string;
  masterKey: string;
  sealed: { file: string; index: number; durationMs: number }[];
}): Promise<VolumeManifest> {
  const manifest = await loadVolumes(opts.sessionDir);
  const pending = opts.sealed.filter((s) => s.index > manifest.mergedThroughIndex);
  if (pending.length === 0) {
    if (manifest.volumes.length === 0 && opts.sealed.length > 0) {
      const output = `${opts.sessionDir.replace(/\/$/, "")}/export.m4a`;
      await exportPlainM4a(
        opts.masterKey,
        listSegmentPaths(opts.sessionDir, opts.sealed),
        output,
      );
      const durationMs = opts.sealed.reduce((n, s) => n + s.durationMs, 0);
      manifest.volumes.push({
        file: "export.m4a",
        uri: output.startsWith("file:") ? output : `file://${output}`,
        fromIndex: opts.sealed[0]!.index,
        toIndex: opts.sealed[opts.sealed.length - 1]!.index,
        durationMs,
      });
      await saveVolumes(opts.sessionDir, manifest);
    }
    return manifest;
  }

  const useSingle = manifest.volumes.length === 0;
  const fileName = useSingle
    ? "export.m4a"
    : `export-${String(manifest.volumes.length + 1).padStart(3, "0")}.m4a`;
  const output = `${opts.sessionDir.replace(/\/$/, "")}/${fileName}`;
  await exportPlainM4a(
    opts.masterKey,
    listSegmentPaths(opts.sessionDir, pending),
    output,
  );
  const durationMs = pending.reduce((n, s) => n + s.durationMs, 0);
  manifest.volumes.push({
    file: fileName,
    uri: output.startsWith("file:") ? output : `file://${output}`,
    fromIndex: pending[0]!.index,
    toIndex: pending[pending.length - 1]!.index,
    durationMs,
  });
  manifest.mergedThroughIndex = pending[pending.length - 1]!.index;
  await saveVolumes(opts.sessionDir, manifest);
  return manifest;
}

export const encryptedSessionMaintenance = {
  invalidateMergeArtifacts,
  maybeMergeVolume,
  mergeTail,
  loadVolumes,
  sessionDirectory,
};
