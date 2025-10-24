"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "20px"
        }}>
          <div style={{
            maxWidth: "500px",
            textAlign: "center"
          }}>
            <h1 style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</h1>
            <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Something went wrong!</h2>
            <p style={{ marginBottom: "2rem", color: "#666" }}>
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={reset}
              style={{
                padding: "12px 24px",
                fontSize: "1rem",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#000",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

