import { useEffect, useState } from "react";
import { api, type AuditEvent } from "../lib/api";
import { fmtDateTime } from "../components/ui";

export default function AuditCenter() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [verify, setVerify] = useState<{ ok: boolean; brokenAtSeq: number | null; entries: number } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api.audit(150).then(setEvents);
  }, []);

  async function runVerify() {
    setChecking(true);
    try {
      setVerify(await api.auditVerify());
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Audit Center</h1>
          <div className="sub">The tamper-proof black box. Every entry embeds a fingerprint of the one before it — changing any record breaks the chain visibly.</div>
        </div>
        <div className="acts">
          <button className="btn primary" onClick={runVerify} disabled={checking}>
            {checking ? "Verifying…" : "Verify chain"}
          </button>
        </div>
      </div>

      {verify && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            background: verify.ok ? "var(--green-lt)" : "var(--red-lt)",
            borderColor: verify.ok ? "#BFE5D2" : "#F3C9CF",
            color: verify.ok ? "#0a5c3d" : "var(--red)",
            fontWeight: 650,
          }}
        >
          {verify.ok ? `✓ Chain verified — ${verify.entries} entries, no breaks` : `✕ Chain broken at sequence #${verify.brokenAtSeq} (${verify.entries} entries scanned)`}
        </div>
      )}

      <div className="card">
        <table className="t">
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Actor</th>
              <th>Summary</th>
              <th>Hash</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className="mono muted">{e.seq}</td>
                <td>
                  <span className="badge gray">{e.entryType.replace(/_/g, " ")}</span>
                </td>
                <td className="muted">{e.actor}</td>
                <td>{e.summary}</td>
                <td>
                  <span className="hashchip">{e.hash.slice(0, 12)}…</span>
                </td>
                <td className="muted">{fmtDateTime(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
