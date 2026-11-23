"use client";

import { useEffect } from "react";

import { buildReport, type Report, type ReportKind } from "@/lib/error-report";

const sent = new Set<string>();
const MAX_PER_PAGE_LOAD = 5;

/** Send one report to /api/log. Fire-and-forget; repeats of the same error are dropped. */
export function sendReport(kind: ReportKind, err: unknown): void {
  try {
    const report: Report | null = buildReport(kind, err, window.location.pathname);
    if (!report || sent.size >= MAX_PER_PAGE_LOAD) return;
    const key = `${report.kind}|${report.message}`;
    if (sent.has(key)) return;
    sent.add(key);
    const body = JSON.stringify(report);
    if (!navigator.sendBeacon?.("/api/log", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/log", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  } catch {
    /* reporting must never throw */
  }
}

/** Listens for uncaught errors and unhandled promise rejections anywhere on the page. */
export function Monitor() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => sendReport("error", e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => sendReport("rejection", e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
