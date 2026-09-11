import { useEffect, useState } from "react";
import { api, type Connector } from "../lib/api";
import { StatusBadge, fmtDate } from "../components/ui";

export default function EnterpriseUsage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  useEffect(() => {
    api.connectors().then(setConnectors);
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Enterprise Usage</h1>
          <div className="sub">The switchboard — every connected system with its live health, speed and DPA status.</div>
        </div>
      </div>
      <div className="card">
        <table className="t">
          <thead>
            <tr>
              <th>System</th>
              <th>Type</th>
              <th>Health</th>
              <th>Latency</th>
              <th>DPA</th>
            </tr>
          </thead>
          <tbody>
            {connectors.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 650 }}>{c.name}</td>
                <td className="muted">{c.type.replace(/_/g, " ")}</td>
                <td>
                  <StatusBadge status={c.health} />
                </td>
                <td className="muted">{c.health === "DOWN" ? "—" : `${c.latencyMs}ms`}</td>
                <td>
                  {c.dpaExpiresAt ? (
                    new Date(c.dpaExpiresAt).getTime() < Date.now() ? (
                      <span className="badge red">expired {fmtDate(c.dpaExpiresAt)}</span>
                    ) : (
                      <span className="badge green">valid to {fmtDate(c.dpaExpiresAt)}</span>
                    )
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 10 }}>{connectors.length} systems connected · heartbeat every 30s (simulated in this demo)</div>
    </div>
  );
}
