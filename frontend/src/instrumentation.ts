import type { Instrumentation } from "next";

import { logEvent } from "@/lib/server/log";

/** Every uncaught server error (page render, route handler, proxy) goes to the logs as one JSON line. */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const e = err as { message?: unknown; digest?: unknown };
  logEvent("error", "server_error", {
    message: String(e?.message ?? err).slice(0, 300),
    digest: typeof e?.digest === "string" ? e.digest : undefined,
    path: request.path.split("?")[0],
    method: request.method,
    route: context.routePath,
    kind: context.routeType,
  });
};
