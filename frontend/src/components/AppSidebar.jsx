import { pageStyles as styles } from "../styles/pageStyles";
import renovaLogo from "../assets/renova-logo-tr-verde.png";

function AppSidebar({
  active = "dashboard",
  user = null,
  isAdmin = false,
  navigate,
  onLogout,
}) {
  const getButtonStyle = (key) =>
    active === key ? styles.navButtonActive : styles.navButton;
  const canViewImpact =
    isAdmin || user?.role === "ADMIN" || user?.role === "SUPERMARKET";

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarLogoContainer}>
        <img src={renovaLogo} alt="ReNova" style={styles.sidebarLogoImage} />
      </div>

      <nav style={styles.nav}>
        <button
          type="button"
          style={getButtonStyle("dashboard")}
          onClick={() => navigate("/dashboard")}
        >
          <span>📊</span>
          Dashboard
        </button>

        <button
          type="button"
          style={getButtonStyle("products")}
          onClick={() => navigate("/products")}
        >
          <span>🥦</span>
          Productos
        </button>

        <button
          type="button"
          style={getButtonStyle("reservations")}
          onClick={() => navigate("/reservations")}
        >
          <span>📋</span>
          Reservas
        </button>

        {canViewImpact && (
          <button
            type="button"
            style={getButtonStyle("impact")}
            onClick={() => navigate("/impact")}
          >
            <span>📈</span>
            Impacto
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            style={getButtonStyle("users")}
            onClick={() => navigate("/users")}
          >
            <span>👥</span>
            Usuarios
          </button>
        )}
      </nav>

      <button type="button" style={styles.logoutButton} onClick={onLogout}>
        Cerrar sesión
      </button>
    </aside>
  );
}

export default AppSidebar;
