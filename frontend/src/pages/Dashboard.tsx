import { useEffect, useState } from "react";
import { api, type ConsentEvent } from "../lib/api";
import { StatTile, fmtDateTime } from "../components/ui";
import { Link } from "react-router-dom";

type DashboardData = { held: number; withdrawn: number; expiringSoon: number; dlqOpen: number; recentEvents: ConsentEvent[] };

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="empty">Couldn't reach the backend: {error}</div>;
  if (!data) return <div className="loading">Loading…</div>;

  const attention: { text: string; to: string; tone: "red" | "amber" }[] = [];
  if (data.dlqOpen > 0) attention.push({ text: `${data.dlqOpen} orchestration ${data.dlqOpen === 1 ? "command is" : "commands are"} stuck in the dead-letter queue`, to: "/orchestration", tone: "red" });
  if (data.expiringSoon > 0) attention.push({ text: `${data.expiringSoon} consents expire within 30 days`, to: "/consent-health", tone: "amber" });
  if (data.withdrawn > 0) attention.push({ text: `${data.withdrawn} consents currently withdrawn across the book`, to: "/repository", tone: "amber" });

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Good morning, Ananya</h1>
          <div className="sub">Three things need you today — not a wall of counters.</div>
        </div>
      </div>

      <div className="card" style={{ background: "linear-gradient(150deg,#06152A,#123A6B)", color: "#fff", marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", opacity: 0.7, marginBottom: 10 }}>
          Things that need you today
        </div>
        {attention.length === 0 ? (
          <div style={{ opacity: 0.85 }}>Nothing urgent — the ledger, validation engine and orchestration are all healthy.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {attention.map((a, i) => (
              <Link key={i} to={a.to} style={{ color: "#fff", display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: a.tone === "red" ? "var(--red)" : "var(--amber)", flexShrink: 0 }} />
                {a.text}
                <span style={{ marginLeft: "auto", opacity: 0.6 }}>→</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatTile label="consent records held" value={data.held} />
        <StatTile label="currently withdrawn" value={data.withdrawn} tone="amber" />
        <StatTile label="expiring within 30d" value={data.expiringSoon} tone="amber" />
        <StatTile label="dead-letter commands" value={data.dlqOpen} tone={data.dlqOpen > 0 ? "red" : undefined} />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Recent activity — real people, real events</h3>
        <table className="t">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Purpose</th>
              <th>Action</th>
              <th>Channel</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {data.recentEvents.map((e) => (
              <tr key={e.id}>
                <td>{e.customer.displayName}</td>
                <td>{e.purpose.name}</td>
                <td>
                  <span className={`badge ${e.action === "WITHDRAW" ? "red" : "green"}`}>{e.action === "WITHDRAW" ? "withdrew" : "granted"}</span>
                </td>
                <td className="muted">{e.channel.replace(/_/g, " ").toLowerCase()}</td>
                <td className="muted">{fmtDateTime(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
