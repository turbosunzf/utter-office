import { describe, expect, it } from "vitest";
import type { Agent } from "@multica/core/types";
import { listAgentTools, resolveToolCount } from "./agent-tool-counts";

function base(over: Partial<Agent> = {}): Agent {
  return {
    id: "a1",
    workspace_id: "w",
    runtime_id: "r",
    name: "mika",
    description: "",
    instructions: "",
    avatar_url: null,
    runtime_mode: "cloud",
    runtime_config: {},
    custom_args: [],
    visibility: "workspace",
    permission_mode: "private",
    invocation_targets: [],
    status: "idle",
    max_concurrent_tasks: 1,
    model: "",
    owner_id: null,
    skills: [],
    created_at: "",
    updated_at: "",
    archived_at: null,
    archived_by: null,
    ...over,
  };
}

describe("resolveToolCount", () => {
  it("shows configured when mcp is redacted", () => {
    const r = resolveToolCount(
      base({ mcp_config: null, mcp_config_redacted: true }),
    );
    expect(r.kind).toBe("configured");
    expect(r.label).toBe("已配置");
  });

  it("shows unknown when both fields omitted", () => {
    const r = resolveToolCount(base());
    expect(r.kind).toBe("unknown");
    expect(r.label).toBe("未知");
  });

  it("counts mcp servers + composio packs", () => {
    const r = resolveToolCount(
      base({
        mcp_config: { mcpServers: { github: {}, fs: {} } },
        mcp_config_redacted: false,
        composio_toolkit_allowlist: ["linear"],
        composio_toolkit_allowlist_redacted: false,
      }),
    );
    expect(r).toEqual({ kind: "count", value: 3, label: "3" });
  });

  it("allows zero when explicitly empty", () => {
    const r = resolveToolCount(
      base({
        mcp_config: null,
        mcp_config_redacted: false,
        composio_toolkit_allowlist: [],
        composio_toolkit_allowlist_redacted: false,
      }),
    );
    expect(r).toEqual({ kind: "count", value: 0, label: "0" });
  });
});

describe("listAgentTools", () => {
  it("lists mcp + composio entries", () => {
    const { mode, entries } = listAgentTools(
      base({
        mcp_config: { mcpServers: { github: { name: "github" } } },
        composio_toolkit_allowlist: ["linear"],
      }),
    );
    expect(mode).toBe("list");
    expect(entries.map((e) => e.id)).toEqual([
      "mcp.github",
      "composio.linear",
    ]);
  });
});
