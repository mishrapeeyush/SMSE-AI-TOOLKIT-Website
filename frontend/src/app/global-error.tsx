"use client";

import { useEffect } from "react";

import { sendReport } from "@/components/monitor";

/** Last resort when the root layout itself fails. Must render its own <html> and <body>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => sendReport("boundary", error), [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", textAlign: "center" }}>
        <h1>SMSE AI Toolkit could not load</h1>
        <p>The error was reported automatically. Please try again.</p>
        <button onClick={() => reset()} style={{ padding: "0.5rem 1rem" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
