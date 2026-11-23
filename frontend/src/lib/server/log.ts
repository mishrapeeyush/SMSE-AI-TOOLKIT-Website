/**
 * One JSON object per line. Vercel keeps these in Project → Logs, where each field can be
 * searched (e.g. `event:"client_error"`). Nothing here leaves the deployment.
 */
export type Level = "info" | "warn" | "error";

export function logEvent(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, event, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
