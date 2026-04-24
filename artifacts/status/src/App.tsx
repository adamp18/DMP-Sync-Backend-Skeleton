import { useEffect, useState } from "react";

type HealthStatus = "checking" | "ok" | "down";

interface HealthPayload {
  ok: boolean;
  ts: string;
}

function App() {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [ts, setTs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      setStatus("checking");
      setError(null);
      try {
        const res = await fetch("/api/health", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as HealthPayload;
        if (cancelled) return;
        setStatus(data.ok ? "ok" : "down");
        setTs(data.ts);
      } catch (err) {
        if (cancelled) return;
        setStatus("down");
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    check();
    const id = setInterval(check, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const dotColor =
    status === "ok"
      ? "bg-green-500"
      : status === "down"
      ? "bg-red-500"
      : "bg-yellow-400";

  const statusLabel =
    status === "ok"
      ? "Operational"
      : status === "down"
      ? "Unreachable"
      : "Checking…";

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 flex items-center justify-center px-6">
      <main className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <span
            className={`inline-block h-3 w-3 rounded-full ${dotColor}`}
            aria-hidden="true"
          />
          <h1 className="text-xl font-semibold tracking-tight">
            API Status
          </h1>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Health</dt>
            <dd className="font-medium">{statusLabel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Endpoint</dt>
            <dd className="font-mono text-xs text-gray-700">/api/health</dd>
          </div>
          {ts && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Server time</dt>
              <dd className="font-mono text-xs text-gray-700">{ts}</dd>
            </div>
          )}
          {error && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Error</dt>
              <dd className="font-mono text-xs text-red-600">{error}</dd>
            </div>
          )}
        </dl>

        <p className="mt-8 text-xs leading-relaxed text-gray-500">
          This is the public landing page for the backend API that powers the
          Chrome extension and admin portal. The API is reachable under{" "}
          <span className="font-mono">/api</span>.
        </p>
      </main>
    </div>
  );
}

export default App;
