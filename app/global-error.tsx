"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ background: "#0b0b0e", color: "#f4f4f6", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: "40px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, width: 28, height: 28, margin: "0 auto 16px" }}>
            {[40, 65, 100, 75, 50].map((h, i) => (
              <span key={i} style={{ flex: 1, height: `${h}%`, background: "#ff6a1a", borderRadius: 1 }} />
            ))}
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", letterSpacing: "0.04em" }}>
            PSA · <span style={{ color: "#ff6a1a" }}>Enablement</span>
          </h1>
          <p style={{ color: "#9a9aa4", fontSize: 14, margin: "0 0 20px" }}>
            Erro crítico ao inicializar o sistema.
          </p>
          {error.digest && (
            <p style={{ color: "#5a5a64", fontSize: 11, fontFamily: "monospace", margin: "0 0 24px" }}>
              digest: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{ background: "#ff6a1a", color: "#1a0a00", border: 0, borderRadius: 10, padding: "12px 32px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%" }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
