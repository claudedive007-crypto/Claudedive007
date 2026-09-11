import { NavLink, Outlet, useLocation } from "react-router-dom";
import { NAV, ALL_ITEMS } from "../lib/nav";

export default function Layout() {
  const location = useLocation();
  const current = ALL_ITEMS.find((i) => i.path === location.pathname);

  return (
    <div className="app">
      <header className="hdr">
        <div className="brand">
          <div className="brand-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="brand-name">Consentia</div>
            <div className="brand-sub">Meridian Bank</div>
          </div>
        </div>
        <div className="hdr-pulse">
          <span className="pulse-dot" />
          Live demo backend
        </div>
        <div className="user-chip">
          <div className="avatar">AR</div>
          <div>
            <div className="user-name">Ananya Rao</div>
            <div className="user-role">DPO</div>
          </div>
        </div>
      </header>

      <nav className="nav">
        {NAV.map((group) => (
          <div key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item${isActive ? " on" : ""}`}>
                <span className="dot" style={{ background: group.color }} />
                {item.label}
                {!item.live && (
                  <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--ink-4)", fontWeight: 700 }}>ILLUS.</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
        <div className="nav-foot">
          <div className="t">Architecture v2.0 spine</div>
          <div className="s">Ledger · Validation · Evidence · Orchestration are live against Postgres.</div>
        </div>
      </nav>

      <main className="main">
        <div className="crumb">
          Consentia / <b>{current?.label ?? ""}</b>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
