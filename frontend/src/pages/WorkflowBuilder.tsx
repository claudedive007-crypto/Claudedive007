import { IllustrativeNote } from "../components/ui";

const STEPS = [
  { k: "WHEN", t: "Consent 30 days from expiry", c: "var(--blue)" },
  { k: "THEN", t: "Send renewal notice · wait 7 days", c: "var(--green)" },
  { k: "IF FAILS", t: "Retry 3× then escalate to DPO", c: "var(--amber)" },
];

const TEMPLATES = [
  "Consent-expiry re-consent",
  "DSR SLA escalation",
  "Breach 72-hour countdown",
  "New connector onboarding checklist",
  "Minor turns 18 — re-consent invite",
  "Vendor DPA renewal reminder",
];

export default function WorkflowBuilder() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Workflow Builder</h1>
          <div className="sub">Where a compliance officer sets the rules by clicking, not coding.</div>
        </div>
      </div>
      <IllustrativeNote />

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Example: consent-expiry renewal</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {STEPS.map((s) => (
              <div key={s.k} style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, borderRadius: 9, border: "1px solid var(--line)", borderLeft: `3px solid ${s.c}` }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: s.c, color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{s.k[0]}</div>
                <div style={{ fontSize: 12.5 }}>
                  <b>{s.k}</b> {s.t}
                </div>
              </div>
            ))}
          </div>
          <button className="btn sm" style={{ marginTop: 14 }}>
            ▶ Test run (sandbox, zero live effect)
          </button>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Templates</h3>
          {TEMPLATES.map((t) => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line-2)", fontSize: 13 }}>
              {t}
              <button className="btn sm">Use</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
