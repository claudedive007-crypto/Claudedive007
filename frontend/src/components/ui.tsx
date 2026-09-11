import type { ReactNode } from "react";

export function StatTile({ label, value, tone }: { label: string; value: ReactNode; tone?: "red" | "amber" | "green" }) {
  return (
    <div className="stat-tile">
      <div className="v" style={{ color: tone === "red" ? "var(--red)" : tone === "amber" ? "var(--amber)" : tone === "green" ? "var(--green)" : undefined }}>
        {value}
      </div>
      <div className="k">{label}</div>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  VALID: "green",
  ALLOW: "green",
  ACKED: "green",
  COMPLETED: "green",
  UP: "green",
  WITHDRAWN: "gray",
  BLOCK: "red",
  DEAD_LETTER: "red",
  DOWN: "red",
  EXPIRED: "amber",
  DEGRADED: "amber",
  RETRYING: "amber",
  PENDING: "blue",
  MINOR_BLOCKED: "red",
  allowed: "green",
  blocked: "red",
  allowed_at_risk: "amber",
  not_applicable: "gray",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "gray";
  return <span className={`badge ${tone}`}>{status.replace(/_/g, " ").toLowerCase()}</span>;
}

export function Section({ title, sub, actions, children }: { title: string; sub?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div>
          <h3>{title}</h3>
          {sub && <div className="sub" style={{ color: "var(--ink-3)", fontSize: 12.5, marginTop: 3 }}>{sub}</div>}
        </div>
        {actions && <div style={{ marginLeft: "auto" }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function IllustrativeNote() {
  return (
    <div className="card" style={{ background: "var(--amber-lt)", borderColor: "#EBD9B0", color: "#7a5410", fontSize: 12.5, marginBottom: 16 }}>
      <b>Illustrative screen.</b> This module isn't wired to a live data path yet — it renders the same UI as the
      prototype over static fixture data. Per FSD v2.0 §8: "connectors are simulated, the AI is scripted" — nothing
      here should be represented as production-ready.
    </div>
  );
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
