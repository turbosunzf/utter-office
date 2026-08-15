/**
 * Workspace dashboard queries — the six `/api/dashboard/*` rollups powering
 * the 看板 (board) tab. Endpoint-for-endpoint mirror of
 * `packages/core/dashboard/queries.ts` (same paths, params, response
 * schemas, and cache-key prefix `dashboard/<wsId>`), but bound to mobile's
 * own `data/api.ts` wrapper so auth / X-Workspace-Slug / timeout / signal
 * cancellation all flow through the mobile client.
 *
 * The 5-minute polling cadence is inherited from the core dashboard: the
 * server materializes these rollups on that cadence, so polling faster only
 * re-reads an unchanged rollup. The short staleTime keeps re-entering the
 * tab honest — anything older than a minute refetches on mount.
 */
import { queryOptions } from "@tanstack/react-query";
import { api } from "@/data/api";

export const dashboardKeys = {
  all: (wsId: string | null) => ["dashboard", wsId] as const,
  daily: (wsId: string | null, days: number, projectId: string | null) =>
    [...dashboardKeys.all(wsId), "daily", days, projectId] as const,
  byAgent: (wsId: string | null, days: number, projectId: string | null) =>
    [...dashboardKeys.all(wsId), "by-agent", days, projectId] as const,
  agentRuntime: (
    wsId: string | null,
    days: number,
    projectId: string | null,
  ) => [...dashboardKeys.all(wsId), "agent-runtime", days, projectId] as const,
  runTimeDaily: (
    wsId: string | null,
    days: number,
    projectId: string | null,
  ) => [...dashboardKeys.all(wsId), "runtime-daily", days, projectId] as const,
  failuresDaily: (
    wsId: string | null,
    days: number,
    projectId: string | null,
  ) => [...dashboardKeys.all(wsId), "failures-daily", days, projectId] as const,
  failuresByAgent: (
    wsId: string | null,
    days: number,
    projectId: string | null,
  ) =>
    [...dashboardKeys.all(wsId), "failures-by-agent", days, projectId] as const,
};

const STALE_TIME = 60 * 1000;
const REFETCH_INTERVAL = 5 * 60 * 1000;

/**
 * Shared envelope for the six rollups — same key prefix, same staleness,
 * same polling. `wsId` gates the fetch so a cold start before the workspace
 * resolves never fires a slug-less request.
 */
function rollup<T>(
  queryKey: readonly unknown[],
  fn: (signal?: AbortSignal) => Promise<T>,
  wsId: string | null,
) {
  return queryOptions({
    queryKey,
    queryFn: ({ signal }) => fn(signal),
    enabled: !!wsId,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function dashboardUsageDailyOptions(
  wsId: string | null,
  days: number,
  projectId: string | null = null,
) {
  return rollup(
    dashboardKeys.daily(wsId, days, projectId),
    (signal) =>
      api.getDashboardUsageDaily(
        { days, project_id: projectId ?? undefined },
        { signal },
      ),
    wsId,
  );
}

export function dashboardUsageByAgentOptions(
  wsId: string | null,
  days: number,
  projectId: string | null = null,
) {
  return rollup(
    dashboardKeys.byAgent(wsId, days, projectId),
    (signal) =>
      api.getDashboardUsageByAgent(
        { days, project_id: projectId ?? undefined },
        { signal },
      ),
    wsId,
  );
}

export function dashboardAgentRunTimeOptions(
  wsId: string | null,
  days: number,
  projectId: string | null = null,
) {
  return rollup(
    dashboardKeys.agentRuntime(wsId, days, projectId),
    (signal) =>
      api.getDashboardAgentRunTime(
        { days, project_id: projectId ?? undefined },
        { signal },
      ),
    wsId,
  );
}

export function dashboardRunTimeDailyOptions(
  wsId: string | null,
  days: number,
  projectId: string | null = null,
) {
  return rollup(
    dashboardKeys.runTimeDaily(wsId, days, projectId),
    (signal) =>
      api.getDashboardRunTimeDaily(
        { days, project_id: projectId ?? undefined },
        { signal },
      ),
    wsId,
  );
}

export function dashboardFailuresDailyOptions(
  wsId: string | null,
  days: number,
  projectId: string | null = null,
) {
  return rollup(
    dashboardKeys.failuresDaily(wsId, days, projectId),
    (signal) =>
      api.getDashboardFailuresDaily(
        { days, project_id: projectId ?? undefined },
        { signal },
      ),
    wsId,
  );
}

export function dashboardFailuresByAgentOptions(
  wsId: string | null,
  days: number,
  projectId: string | null = null,
) {
  return rollup(
    dashboardKeys.failuresByAgent(wsId, days, projectId),
    (signal) =>
      api.getDashboardFailuresByAgent(
        { days, project_id: projectId ?? undefined },
        { signal },
      ),
    wsId,
  );
}
