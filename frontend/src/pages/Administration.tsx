import { useState } from "react";
import { IllustrativeNote } from "../components/ui";

const TABS = ["Data map", "Vendors", "Retention", "Roles"];

export default function Administration() {
  const [tab, setTab] = useState("Data map");
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Administration</h1>
          <div className="sub">The engine room — where personal data lives, the vendor register, retention rules, and who can do what.</div>
        </div>
      </div>
      <IllustrativeNote />
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {TABS.map((t) => (
          <button key={t} className="btn sm" style={tab === t ? { background: "var(--navy)", borderColor: "var(--navy)", color: "#fff" } : {}} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="card">
        {tab === "Data map" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line-2)" }}>
              <span>Personal data locations found</span>
              <span className="badge blue">42 systems</span>
            </div>
          </>
        )}
        {tab === "Vendors" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line-2)" }}>
              <span>CloudMailer Inc. · DPA</span>
              <span className="badge red">expired</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0" }}>
              <span>Vendors with data access</span>
              <span className="badge blue">17</span>
            </div>
          </>
        )}
        {tab === "Retention" && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0" }}>
            <span>Retention rules configured</span>
            <span className="badge green">28 categories</span>
          </div>
        )}
        {tab === "Roles" && (
          <div className="muted" style={{ fontSize: 12.5 }}>
            User and role management with maker-checker on privileged grants. No role, including Administrator, can edit or delete a consent event.
          </div>
        )}
      </div>
    </div>
  );
}
