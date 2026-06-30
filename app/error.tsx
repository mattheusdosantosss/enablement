"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PSA Enablement] runtime error:", error);
  }, [error]);

  return (
    <div className="loginwrap">
      <div className="loginbox" style={{ textAlign: "center", gap: 20 }}>
        <div className="brand" style={{ justifyContent: "center", marginBottom: 8 }}>
          <div className="logo">
            <span style={{ height: "40%" }} />
            <span style={{ height: "65%" }} />
            <span style={{ height: "100%" }} />
            <span style={{ height: "75%" }} />
            <span style={{ height: "50%" }} />
          </div>
          <div>
            <h1>PSA · <b>Enablement</b></h1>
          </div>
        </div>

        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 4px" }}>
          Ocorreu um erro inesperado.
        </p>
        {error.digest && (
          <p style={{ color: "var(--faint)", fontSize: 11, fontFamily: "var(--font-mono)", margin: "0 0 20px" }}>
            digest: {error.digest}
          </p>
        )}

        <button className="btn" onClick={reset} style={{ width: "100%" }}>
          Tentar novamente
        </button>
        <a href="/login" style={{ display: "block", color: "var(--faint)", fontSize: 12, marginTop: 8 }}>
          Voltar ao login
        </a>
      </div>
    </div>
  );
}
