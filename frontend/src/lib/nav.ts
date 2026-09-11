export type NavItem = { path: string; label: string; live: boolean };
export type NavGroup = { label: string; color: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    color: "#1B5FD1",
    items: [{ path: "/dashboard", label: "Dashboard", live: true }],
  },
  {
    label: "Consent lifecycle",
    color: "#0EA672",
    items: [
      { path: "/capture", label: "Consent Capture", live: true },
      { path: "/drives", label: "Consent Drives", live: true },
      { path: "/repository", label: "Consent Repository", live: true },
      { path: "/consent-health", label: "Consent Health", live: true },
      { path: "/validation", label: "Validation Engine", live: true },
      { path: "/privacy", label: "Privacy Center", live: true },
      { path: "/preference", label: "Preference Center", live: true },
    ],
  },
  {
    label: "Automation",
    color: "#C8860D",
    items: [
      { path: "/orchestration", label: "Orchestration", live: true },
      { path: "/workflows", label: "Workflow Builder", live: false },
    ],
  },
  {
    label: "Enterprise",
    color: "#6C4BD8",
    items: [
      { path: "/enterprise", label: "Enterprise Usage", live: true },
      { path: "/notifications", label: "Notifications", live: false },
      { path: "/audit", label: "Audit Center", live: true },
      { path: "/reports", label: "Reports", live: false },
    ],
  },
  {
    label: "Intelligence",
    color: "#3B7DE0",
    items: [{ path: "/ai", label: "AI Compliance", live: false }],
  },
  {
    label: "Governance",
    color: "#DC2B45",
    items: [
      { path: "/breach", label: "Breach Response", live: false },
      { path: "/children", label: "Children's Data", live: true },
      { path: "/sdf", label: "SDF Pack", live: false },
      { path: "/admin", label: "Administration", live: false },
      { path: "/developers", label: "Developers", live: true },
      { path: "/settings", label: "Settings", live: false },
    ],
  },
];

export const ALL_ITEMS = NAV.flatMap((g) => g.items);
