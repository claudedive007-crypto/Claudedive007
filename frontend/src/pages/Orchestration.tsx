import { useEffect, useState } from "react";
import { api, type Command, type Connector } from "../lib/api";
import { StatusBadge, fmtDateTime } from "../components/ui";
import { toast } from "../lib/toast";

export default function Orchestration() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);

  function refresh() {
    api.connectors().then(setConnectors);
    api.commands().then(setCommands);
  }
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, []);

  const dlq = commands.filter((c) => c.status === "DEAD_LETTER");
  const acked = commands.filter((c) => c.status === "ACKED").length;
  const retrying = commands.filter((c) => c.status === "RETRYING").length;

  const R = 130;
  const cx = 160;
  const cy = 150;

  async function replay(id: string) {
    await api.replayCommand(id);
    toast("Replay queued", undefined, "ok");
    setTimeout(refresh, 500);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Orchestration</h1>
          <div className="sub">One consent change fans out to every connected system in real time. Failures retry with backoff, then land in the DLQ with an owner — never silently dropped.</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="card" style={{ display: "flex", justifyContent: "center" }}>
          <svg viewBox="0 0 320 300" width="100%" style={{ maxWidth: 340 }}>
            {connectors.map((c, i) => {
              const angle = (i / connectors.length) * Math.PI * 2 - Math.PI / 2;
              const x = cx + R * Math.cos(angle);
              const y = cy + R * Math.sin(angle);
              const color = c.health === "UP" ? "#0EA672" : c.health === "DEGRADED" ? "#C8860D" : "#DC2B45";
              return (
                <g key={c.id}>
                  <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth={1.4} opacity={0.6} />
                  <circle cx={x} cy={y} r={26} fill={`${color}1A`} stroke={color} strokeWidth={1.6} />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>
                    {c.name.split(" ")[0].slice(0, 8)}
                  </text>
                </g>
              );
            })}
            <circle cx={cx} cy={cy} r={34} fill="#0B2545" />
            <text x={cx} y={cy - 3} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fff">
              CONSENT
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fff">
              ENGINE
            </text>
          </svg>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Connected systems</h3>
          <table className="t">
            <thead>
              <tr>
                <th>System</th>
                <th>Health</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {connectors.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <StatusBadge status={c.health} />
                  </td>
                  <td className="muted">{c.health === "DOWN" ? "—" : `${c.latencyMs}ms`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12 }}>
            <span>🟢 {acked} acked</span>
            <span>🟠 {retrying} retrying</span>
            <span>🔴 {dlq.length} dead-letter</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Dead-letter queue</h3>
        <table className="t">
          <thead>
            <tr>
              <th>Connector</th>
              <th>Attempts</th>
              <th>Error</th>
              <th>Owner</th>
              <th>Since</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {dlq.map((c) => (
              <tr key={c.id}>
                <td>{c.connector.name}</td>
                <td>{c.attempts}</td>
                <td className="muted">{c.lastError}</td>
                <td>{c.owner}</td>
                <td className="muted">{fmtDateTime(c.updatedAt)}</td>
                <td>
                  <button className="btn sm" onClick={() => replay(c.id)}>
                    Replay
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dlq.length === 0 && <div className="empty">Nothing in the dead-letter queue.</div>}
      </div>
    </div>
  );
}
