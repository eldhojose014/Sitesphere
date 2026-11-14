// Central place for role names, dashboards and header navigation.

export const ROLES = {
  CONTRACTOR: "Contractor/Administrator",
  SUPERVISOR: "Site Supervisor",
  ENGINEER: "Civil Engineer",
  ACCOUNTANT: "Accountant",
};

export const ROLE_HOME = {
  [ROLES.CONTRACTOR]: "/contractor",
  [ROLES.SUPERVISOR]: "/supervisor",
  [ROLES.ENGINEER]: "/civil-engineer",
  [ROLES.ACCOUNTANT]: "/accountant",
};

export const ROLE_NAV = {
  [ROLES.CONTRACTOR]: [
    { label: "Dashboard", to: "/contractor" },
    { label: "Projects", to: "/projects" },
    { label: "Users", to: "/users" },
    { label: "Material Requests", to: "/material-requests" },
    { label: "Materials", to: "/materials" },
    { label: "Building Plans", to: "/building-plans" },
  ],
  [ROLES.SUPERVISOR]: [
    { label: "Dashboard", to: "/supervisor" },
    { label: "Attendance", to: "/attendance" },
    { label: "Labours", to: "/labours" },
    { label: "Material Requests", to: "/supervisor/material-requests" },
    { label: "Daily Reports", to: "/daily-reports-history" },
    { label: "Building Plans", to: "/building-plans" },
  ],
  [ROLES.ENGINEER]: [
    { label: "Dashboard", to: "/civil-engineer" },
    { label: "Building Plans", to: "/building-plans" },
  ],
  [ROLES.ACCOUNTANT]: [{ label: "Dashboard", to: "/accountant" }],
};

export const getHomeForRole = (role) => ROLE_HOME[role] || "/login";
