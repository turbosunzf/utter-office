/**
 * Board listing realtime — alias documenting that workspace issue list
 * patches (already mounted via useIssuesRealtime) cover column/swimlane
 * boards that read issueListOptions(wsId). Kept as a named hook so call
 * sites and PRD §5.4 stay discoverable.
 */
export { useIssuesRealtime as useBoardRealtime } from "./use-issues-realtime";
