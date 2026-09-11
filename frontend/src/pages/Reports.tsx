import { IllustrativeNote } from "../components/ui";

const PACKS = ["Consent coverage", "Rights SLA performance", "Breach summary", "Vendor status", "Board pack (quarterly)", "Regulator evidence bundle", "Children's data compliance", "Connector health"];

export default function Reports() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <div className="sub">Regulator-ready report packs, built from the audit trail — figures are not manually editable.</div>
        </div>
      </div>
      <IllustrativeNote />
      <div className="grid grid-4">
        {PACKS.map((p) => (
          <div key={p} className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 650, color: "var(--ink)", marginBottom: 10 }}>{p}</div>
            <button className="btn sm">Generate</button>
          </div>
        ))}
      </div>
    </div>
  );
}
