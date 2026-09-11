import { useEffect, useState } from "react";
import { api, type Customer, type CheckResponse } from "../lib/api";
import { MINOR_BLOCKED_LABEL } from "../lib/constants";

export default function ChildrensData() {
  const [minors, setMinors] = useState<Customer[]>([]);
  const [proof, setProof] = useState<Record<string, CheckResponse>>({});

  useEffect(() => {
    api.customers().then((c) => setMinors(c.filter((x) => x.isMinor)));
  }, []);

  async function proveBlock(ref: string) {
    const r = await api.check({ customer_ref: ref, purpose: "marketing", system: "crm" });
    setProof((prev) => ({ ...prev, [ref]: r }));
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Children's Data</h1>
          <div className="sub">A minor cannot legally consent. A verified guardian must — and {MINOR_BLOCKED_LABEL.toLowerCase()} are hard-blocked with no override role.</div>
        </div>
      </div>

      <div className="grid grid-2">
        {minors.map((m) => (
          <div key={m.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--ink)" }}>{m.displayName}</div>
                <div className="muted mono" style={{ fontSize: 11 }}>{m.externalRef}</div>
              </div>
              <span className={`badge ${m.guardianVerified ? "green" : "red"}`}>{m.guardianVerified ? "guardian verified" : "no verified guardian"}</span>
            </div>
            {m.guardianVerified && <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Verified via {m.guardianMethod.replace(/_/g, " ").toLowerCase()}.</div>}
            {!m.guardianVerified && (
              <>
                <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  {MINOR_BLOCKED_LABEL} are structurally blocked for this account regardless of any role or override.
                </div>
                <button className="btn sm" onClick={() => proveBlock(m.externalRef)}>
                  Prove it — check marketing via CRM
                </button>
                {proof[m.externalRef] && (
                  <div style={{ marginTop: 10, fontSize: 12.5, padding: 10, background: "var(--red-lt)", borderRadius: 8 }}>
                    <b style={{ color: "var(--red)" }}>{proof[m.externalRef].decision}</b> — {proof[m.externalRef].reason}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {minors.length === 0 && <div className="empty">No minor accounts on file.</div>}
      </div>
    </div>
  );
}
