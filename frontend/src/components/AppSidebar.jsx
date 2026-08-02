import { useEffect, useState } from "react";
import renovaLogo from "../assets/renova-logo-login.png";

function SidebarIcon({ type }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (type === "dashboard") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </svg>
    );
  }

  if (type === "products") {
    return (
      <svg {...commonProps}>
        <path d="M21 8.5 12 3 3 8.5" />
        <path d="M21 8.5v7L12 21l-9-5.5v-7" />
        <path d="M12 12 3 8.5" />
        <path d="M12 12l9-3.5" />
        <path d="M12 12v9" />
      </svg>
    );
  }

  if (type === "reservations") {
    return (
      <svg {...commonProps}>
        <rect x="4" y="5" width="16" height="16" rx="3" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 10h16" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    );
  }

  if (type === "impact") {
    return (
      <svg {...commonProps}>
        <path d="M21 12a9 9 0 1 1-9-9v9z" />
        <path d="M21 12a9 9 0 0 0-9-9" />
      </svg>
    );
  }

  if (type === "users") {
    return (
      <svg {...commonProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  return null;
}

function ThemeIcon({ darkMode }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (darkMode) {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function AppSidebar({
  active = "dashboard",
  user = null,
  isAdmin = false,
  navigate,
  onLogout,
}) {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("renova-theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("renova-dark-mode", darkMode);
    document.body.classList.toggle("renova-dark-mode", darkMode);
    localStorage.setItem("renova-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const canViewImpact =
    isAdmin || user?.role === "ADMIN" || user?.role === "SUPERMARKET";

  const navItems = [
    { key: "dashboard", label: "Dashboard", path: "/dashboard" },
    { key: "products", label: "Productos", path: "/products" },
    { key: "reservations", label: "Reservas", path: "/reservations" },
    ...(canViewImpact
      ? [{ key: "impact", label: "Impacto", path: "/impact" }]
      : []),
    ...(isAdmin
      ? [{ key: "users", label: "Usuarios", path: "/users" }]
      : []),
  ];

  return (
    <aside className="renova-sidebar">
      <div className="renova-sidebar-brand">
        <img src={renovaLogo} alt="ReNova" />
      </div>

      <nav className="renova-sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={
              active === item.key
                ? "renova-sidebar-link renova-sidebar-link-active"
                : "renova-sidebar-link"
            }
            onClick={() => navigate(item.path)}
          >
            <span className="renova-sidebar-svg-icon">
              <SidebarIcon type={item.key} />
            </span>

            {item.label}
          </button>
        ))}
      </nav>

      <div className="renova-sidebar-footer">
        <button
          type="button"
          className="renova-sidebar-theme-button"
          onClick={() => setDarkMode((current) => !current)}
        >
          <span className="renova-sidebar-footer-icon">
            <ThemeIcon darkMode={darkMode} />
          </span>

          {darkMode ? "Modo claro" : "Modo oscuro"}
        </button>

        <button type="button" className="renova-sidebar-logout" onClick={onLogout}>
          <span className="renova-sidebar-footer-icon">
            <LogoutIcon />
          </span>

          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

export default AppSidebar;
