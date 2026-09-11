import { useState } from "react";
import { api } from "../lib/api";

const SNIPPETS = [
  {
    title: "Check before any use of personal data",
    code: `POST /v1/consent/check
{
  "customer_ref": "CUS-2048",
  "purpose": "marketing",
  "system": "crm"
}

→ 403 (blocked) or 200 (allowed)
{
  "decision": "BLOCK",
  "reason": "withdrawn",
  "policy_version": "policy-2026.07",
  "decision_id": "…",
  "latency_ms": 4
}`,
  },
  {
    title: "Record a consent captured on your own channel",
    code: `POST /v1/consents
{
  "customer_ref": "CUS-2048",
  "purpose": "marketing",
  "channel": "WEB",
  "notice_version": "v4.2",
  "language": "en",
  "verification_method": "otp"
}`,
  },
  {
    title: "Withdraw — triggers orchestration synchronously",
    code: `POST /v1/consents/withdraw
{ "customer_ref": "CUS-2048", "purpose": "marketing" }`,
  },
];

export default function Developers() {
  const [live, setLive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function tryIt() {
    setBusy(true);
    try {
      const r = await api.check({ customer_ref: "CUS-2048", purpose: "kyc_aml", system: "core_banking" });
      setLive(JSON.stringify(r, null, 2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Developers</h1>
          <div className="sub">This is a real, running API — not documentation of one. Every call below hits the backend behind this demo.</div>
        </div>
      </div>

      <div className="grid grid-2">
        {SNIPPETS.map((s) => (
          <div key={s.title} className="card">
            <h3 style={{ marginBottom: 10, fontSize: 13.5 }}>{s.title}</h3>
            <pre className="mono" style={{ background: "var(--navy)", color: "#CBDCF3", padding: 12, borderRadius: 9, fontSize: 11, overflowX: "auto", whiteSpace: "pre-wrap" }}>
              {s.code}
            </pre>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 10 }}>Try it live</h3>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>Runs a real check against this session's Postgres database.</p>
        <button className="btn primary" onClick={tryIt} disabled={busy}>
          {busy ? "Calling…" : "Run: check(CUS-2048, kyc_aml, core_banking)"}
        </button>
        {live && (
          <pre className="mono" style={{ background: "var(--bg)", padding: 12, borderRadius: 9, fontSize: 11.5, marginTop: 12 }}>
            {live}
          </pre>
        )}
      </div>
    </div>
  );
}
