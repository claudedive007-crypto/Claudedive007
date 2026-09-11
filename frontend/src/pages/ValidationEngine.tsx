import { useEffect, useState } from "react";
import { api, type CheckResponse, type Customer, type Purpose } from "../lib/api";
import { StatusBadge } from "../components/ui";

type Grid = { connectors: string[]; grid: { purpose: string; purposeCode: string; legalBasis: string; cells: { connector: string; status: string; reason: string }[] }[] };

export default function ValidationEngine() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [customerRef, setCustomerRef] = useState("CUS-2048");
  const [purposeCode, setPurposeCode] = useState("marketing");
  const [system, setSystem] = useState("crm");
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [cell, setCell] = useState<{ purpose: string; connector: string; status: string; reason: string } | null>(null);

  function loadGrid() {
    api.permissions().then(setGrid);
  }
  useEffect(() => {
    api.customers().then((c) => setCustomers(c.filter((x) => x.externalRef !== "UNKNOWN")));
    api.purposes().then(setPurposes);
    loadGrid();
  }, []);

  async function runCheck() {
    setBusy(true);
    setResult(null);
    try {
      const r = await api.check({ customer_ref: customerRef, purpose: purposeCode, system });
      setResult(r);
      loadGrid();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Validation Engine</h1>
          <div className="sub">One call before any data use. Fail-closed: any doubt, timeout or unknown input resolves to BLOCK.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>POST /v1/consent/check</h3>
        <div className="grid grid-3">
          <div className="field">
            <label>customer_ref</label>
            <select value={customerRef} onChange={(e) => setCustomerRef(e.target.value)}>
              {customers.map((c) => (
                <option key={c.id} value={c.externalRef}>
                  {c.displayName} — {c.externalRef}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>purpose</label>
            <select value={purposeCode} onChange={(e) => setPurposeCode(e.target.value)}>
              {purposes.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>system</label>
            <input value={system} onChange={(e) => setSystem(e.target.value)} placeholder="crm" />
          </div>
        </div>
        <button className="btn primary" onClick={runCheck} disabled={busy}>
          {busy ? "Checking…" : "Run check"}
        </button>

        {result && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 10,
              background: result.decision === "ALLOW" ? "var(--green-lt)" : "var(--red-lt)",
              border: `1px solid ${result.decision === "ALLOW" ? "#BFE5D2" : "#F3C9CF"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: result.decision === "ALLOW" ? "var(--green)" : "var(--red)" }}>
                {result.decision === "ALLOW" ? "✓ ALLOW" : "✕ BLOCK"}
              </span>
              <span className="muted">{result.reason}</span>
              <span className="mono muted" style={{ marginLeft: "auto" }}>
                {result.latency_ms}ms · {result.policy_version}
              </span>
            </div>
            <div className="mono muted" style={{ fontSize: 10.5, marginTop: 6 }}>decision_id: {result.decision_id}</div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 4 }}>Permission Grid</h3>
        <div className="sub" style={{ color: "var(--ink-3)", fontSize: 12.5, marginBottom: 12 }}>
          Purpose × connected-system matrix, computed live from current consent state. Click a cell for the reason.
        </div>
        {grid && (
          <div style={{ overflowX: "auto" }}>
            <table className="t">
              <thead>
                <tr>
                  <th>Purpose</th>
                  {grid.connectors.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.grid.map((row) => (
                  <tr key={row.purpose}>
                    <td style={{ fontWeight: 650 }}>{row.purpose}</td>
                    {row.cells.map((c) => (
                      <td key={c.connector} style={{ cursor: "pointer" }} onClick={() => setCell({ purpose: row.purpose, ...c })}>
                        <StatusBadge status={c.status} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cell && (
          <div style={{ marginTop: 12, padding: 10, background: "var(--bg)", borderRadius: 8, fontSize: 12.5 }}>
            <b>{cell.purpose}</b> → {cell.connector}: <StatusBadge status={cell.status} /> — {cell.reason}
          </div>
        )}
      </div>
    </div>
  );
}
