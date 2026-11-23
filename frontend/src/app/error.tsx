"use client";

import { useEffect } from "react";

import { sendReport } from "@/components/monitor";
import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => sendReport("boundary", error), [error]);
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong on this page</h1>
      <p className="mt-3 text-muted">
        The error was reported automatically. Your files and inputs were not uploaded. Try again; if it keeps happening, reload the page.
      </p>
      <Button className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
