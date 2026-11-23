import { clipReport, MAX_REPORT_BYTES } from "@/lib/error-report";
import { logEvent } from "@/lib/server/log";

/** Receives browser error reports and writes them to the deployment logs. */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_REPORT_BYTES) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const report = clipReport(body);
  if (!report) return new Response(null, { status: 422 });
  logEvent("error", "client_error", { ...report, ua: request.headers.get("user-agent")?.slice(0, 160) });
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
