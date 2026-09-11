import { IllustrativeNote } from "../components/ui";

export default function SdfPack() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>SDF Pack</h1>
          <div className="sub">Extra duties for Significant Data Fiduciaries: a formal impact assessment, and an independent annual audit.</div>
        </div>
      </div>
      <IllustrativeNote />
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line-2)" }}>
          <span>Impact assessment (DPIA)</span>
          <span className="badge green">approved</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line-2)" }}>
          <span>Independent annual audit</span>
          <span className="badge amber">not commissioned</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0" }}>
          <span>Auditor workspace</span>
          <span className="badge blue">PII masked</span>
        </div>
      </div>
      <div className="card">
        <b>Auditor sees:</b> <span className="muted">decisions, chains, policies, dates.</span>
        <br />
        <b>Auditor never sees:</b> <span className="muted">names, numbers, addresses.</span>
      </div>
    </div>
  );
}
