import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Link } from "react-router-dom";

type Health = { score: number; total: number; buckets: Record<string, number>; byPurpose: { purpose: string; total: number; valid: number; pct: number }[] };

export default function ConsentHealth() {
  const [h, setH] = useState<Health | null>(null);
  useEffect(() => {
    api.consentHealth().then(setH);
  }, []);
  if (!h) return <div className="loading">Loading…</div>;

  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - h.score / 100);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Consent Health</h1>
          <div className="sub">How much of the consent you hold can you actually rely on today. Everything else — expired, withdrawn, pending — cannot be used.</div>
        </div>
        <div className="acts">
          <Link to="/drives" className="btn primary">
            Launch renewal drive
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <svg viewBox="0 0 128 128" width="140" height="140">
            <circle cx="64" cy="64" r="52" fill="none" stroke="var(--line-2)" strokeWidth="13" />
            <circle
              cx="64"
              cy="64"
              r="52"
              fill="none"
              stroke="var(--amber)"
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 64 64)"
            />
            <text x="64" y="72" textAnchor="middle" fontSize="30" fontWeight={800} fill="var(--ink)">
              {h.score}
            </text>
          </svg>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 10 }}>
              Score = share of records that are Valid or Expiring-soon out of all {h.total.toLocaleString()} records on file.
            </div>
            {[
              ["Valid now", h.buckets.VALID, "green"],
              ["Expiring in 30d", h.buckets.EXPIRING, "amber"],
              ["Expired", h.buckets.EXPIRED, "red"],
              ["Withdrawn", h.buckets.WITHDRAWN, "gray"],
            ].map(([label, val, tone]) => (
              <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line-2)", fontSize: 13 }}>
                <span>{label}</span>
                <span className={`badge ${tone}`}>{val as number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Health by purpose, weakest first</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[...h.byPurpose].sort((a, b) => a.pct - b.pct).map((p) => (
            <div key={p.purpose}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <span>{p.purpose}</span>
                <span className="muted">
                  {p.valid}/{p.total} valid ({p.pct}%)
                </span>
              </div>
              <div style={{ height: 7, background: "var(--line-2)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${p.pct}%`, height: "100%", background: p.pct < 50 ? "var(--red)" : p.pct < 75 ? "var(--amber)" : "var(--green)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
