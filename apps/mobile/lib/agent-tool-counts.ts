/**
 * Tool capability display for staff roster / profile (PRD §7.5).
 *
 * Three states: countable number | "已配置" (redacted) | "未知" (unknown).
 * Never show 0 when redacted or unknown.
 */
import type { Agent } from "@multica/core/types";

export type ToolCountKind = "count" | "configured" | "unknown";

export interface ToolCountResult {
  kind: ToolCountKind;
  /** Present when kind === "count". */
  value?: number;
  label: string;
}

function countMcpServers(config: unknown): number | null {
  if (config == null) return 0;
  if (typeof config !== "object") return null;

  const root = config as Record<string, unknown>;
  const servers = root.mcpServers ?? root.mcp_servers;

  if (servers == null) {
    // Some payloads are a flat map of server name → config.
    const keys = Object.keys(root).filter(
      (k) => !["version", "type"].includes(k),
    );
    if (keys.length === 0) return 0;
    const looksLikeServers = keys.every((k) => {
      const v = root[k];
      return v != null && typeof v === "object";
    });
    return looksLikeServers ? keys.length : null;
  }

  if (Array.isArray(servers)) return servers.length;
  if (typeof servers === "object") return Object.keys(servers).length;
  return null;
}

function listMcpEntries(config: unknown): { id: string; name: string }[] {
  if (config == null || typeof config !== "object") return [];
  const root = config as Record<string, unknown>;
  const servers = root.mcpServers ?? root.mcp_servers;

  if (servers && typeof servers === "object" && !Array.isArray(servers)) {
    return Object.entries(servers).map(([id, val]) => {
      const name =
        val && typeof val === "object" && "name" in (val as object)
          ? String((val as { name?: unknown }).name ?? id)
          : id;
      return { id: `mcp.${id}`, name };
    });
  }
  if (Array.isArray(servers)) {
    return servers.map((s, i) => {
      if (s && typeof s === "object") {
        const o = s as { name?: string; id?: string };
        const id = o.id ?? o.name ?? `server-${i}`;
        return { id: `mcp.${id}`, name: o.name ?? id };
      }
      return { id: `mcp.${i}`, name: String(s) };
    });
  }
  return [];
}

/** Resolve tool count display for an agent. */
export function resolveToolCount(agent: Agent): ToolCountResult {
  const mcpRedacted = agent.mcp_config_redacted === true;
  const composioRedacted = agent.composio_toolkit_allowlist_redacted === true;

  if (mcpRedacted || composioRedacted) {
    return { kind: "configured", label: "已配置" };
  }

  // Older backends omit redacted flags and may omit fields entirely → unknown.
  const mcpMissing = agent.mcp_config === undefined;
  const composioMissing = agent.composio_toolkit_allowlist === undefined;
  if (mcpMissing && composioMissing) {
    return { kind: "unknown", label: "未知" };
  }

  const mcpCount = countMcpServers(agent.mcp_config ?? null);
  if (mcpCount === null) {
    return { kind: "unknown", label: "未知" };
  }

  const composioCount = Array.isArray(agent.composio_toolkit_allowlist)
    ? agent.composio_toolkit_allowlist.length
    : 0;

  const value = mcpCount + composioCount;
  return { kind: "count", value, label: String(value) };
}

export interface ToolEntry {
  id: string;
  name: string;
  kind: "mcp" | "composio";
}

/** Expandable tool list when not redacted; empty when unknown/redacted. */
export function listAgentTools(agent: Agent): {
  mode: "list" | "redacted" | "empty" | "unknown";
  entries: ToolEntry[];
} {
  if (
    agent.mcp_config_redacted === true ||
    agent.composio_toolkit_allowlist_redacted === true
  ) {
    return { mode: "redacted", entries: [] };
  }
  if (
    agent.mcp_config === undefined &&
    agent.composio_toolkit_allowlist === undefined
  ) {
    return { mode: "unknown", entries: [] };
  }

  const entries: ToolEntry[] = [
    ...listMcpEntries(agent.mcp_config ?? null).map((e) => ({
      ...e,
      kind: "mcp" as const,
    })),
    ...(agent.composio_toolkit_allowlist ?? []).map((slug) => ({
      id: `composio.${slug}`,
      name: `composio · ${slug}`,
      kind: "composio" as const,
    })),
  ];

  return {
    mode: entries.length === 0 ? "empty" : "list",
    entries,
  };
}

export function skillCountLabel(agent: Agent): string {
  return String(agent.skills?.length ?? 0);
}
