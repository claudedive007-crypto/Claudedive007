import { IllustrativeNote } from "../components/ui";

export default function Settings() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <div className="sub">Fiduciary profile, notice text, languages, and enforcement defaults.</div>
        </div>
      </div>
      <IllustrativeNote />
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line-2)" }}>
          <span>Notice text · version</span>
          <span className="badge blue">v4.2</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line-2)" }}>
          <span>Languages enabled</span>
          <span className="badge green">9</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line-2)" }}>
          <span>Rights response window</span>
          <span className="badge amber">awaiting counsel sign-off</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0" }}>
          <span>Breach reporting window</span>
          <span className="badge amber">awaiting counsel sign-off</span>
        </div>
      </div>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>Legally sensitive numbers stay configurable — never hard-coded, per SYS-07.</div>
    </div>
  );
}
