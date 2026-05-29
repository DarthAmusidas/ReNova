import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers } from "../services/userService";
import NotificationBell from "../components/NotificationBell";
import { pageStyles as baseStyles } from "../styles/pageStyles";

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userName = user?.name || "Administrador";
  const userRole = user?.role || "";

  const isAdmin = userRole === "ADMIN";

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getUsers();

      const userList = Array.isArray(data)
        ? data
        : data.users || data.data || [];

      setUsers(userList);
    } catch (err) {
      console.error("Error cargando usuarios:", err);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "No se pudieron cargar los usuarios."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }

    loadUsers();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-AR");
  };

  const getRoleLabel = (role) => {
    if (role === "ADMIN") return "Administrador";
    if (role === "SUPERMARKET") return "Supermercado";
    if (role === "ONG") return "ONG";
    return role || "-";
  };

  const getRoleIcon = (role) => {
    if (role === "ADMIN") return "🛡️";
    if (role === "SUPERMARKET") return "🛒";
    if (role === "ONG") return "🤝";
    return "👤";
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.logoBox}>
          <div style={styles.logoIcon}>🌱</div>
          <h2 style={styles.logoText}>ReNova</h2>
        </div>

        <nav style={styles.nav}>
          <button style={styles.navButton} onClick={() => navigate("/dashboard")}>
            <span>📊</span>
            Dashboard
          </button>

          <button style={styles.navButton} onClick={() => navigate("/products")}>
            <span>🥬</span>
            Productos
          </button>

          <button style={styles.navButton} onClick={() => navigate("/reservations")}>
            <span>📋</span>
            Reservas
          </button>

          <button style={styles.navButtonActive} onClick={() => navigate("/users")}>
            <span>👥</span>
            Usuarios
          </button>
        </nav>

        <button style={styles.logoutButton} onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <span style={styles.badge}>Administración</span>

            <h1 style={styles.title}>Usuarios registrados</h1>

            <p style={styles.subtitle}>
              Consultá los usuarios registrados en la plataforma ReNova.
            </p>
          </div>

          <div style={styles.userArea}>
            <div style={styles.userCard}>
              <div style={styles.userAvatar}>🛡️</div>

              <div style={styles.userInfo}>
                <span style={styles.sessionText}>Sesión activa</span>
                <strong style={styles.userName}>{userName}</strong>
                <span style={styles.rolePill}>Administrador</span>
              </div>
            </div>

            <div style={styles.bellWrapper}>
              <NotificationBell />
            </div>
          </div>
        </header>

        {error && <div style={styles.errorBox}>{error}</div>}

        {loading ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>Cargando usuarios...</h2>
            <p style={styles.emptyText}>Estamos consultando los usuarios registrados.</p>
          </section>
        ) : users.length === 0 ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>No hay usuarios para mostrar</h2>
            <p style={styles.emptyText}>Todavía no existen usuarios registrados.</p>
          </section>
        ) : (
          <section style={styles.cardsGrid}>
            {users.map((item) => (
              <article key={item.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h2 style={styles.cardTitle}>{item.name}</h2>

                    <p style={styles.cardText}>{item.email}</p>
                  </div>

                  <div style={styles.cardIcon}>{getRoleIcon(item.role)}</div>
                </div>

                <span style={getRoleBadgeStyle(item.role)}>
                  {getRoleLabel(item.role)}
                </span>

                <div style={styles.metaGrid}>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Teléfono</span>
                    <span style={styles.metaValue}>{item.phone || "-"}</span>
                  </div>

                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Fecha alta</span>
                    <span style={styles.metaValue}>{formatDate(item.created_at)}</span>
                  </div>

                  <div style={styles.metaItemWide}>
                    <span style={styles.metaLabel}>Dirección</span>
                    <span style={styles.metaValue}>{item.address || "-"}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

const getRoleBadgeStyle = (role) => {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "0.78rem",
    fontWeight: 950,
  };

  if (role === "ADMIN") {
    return {
      ...base,
      background: "#efe7ff",
      color: "#5a32a3",
    };
  }

  if (role === "SUPERMARKET") {
    return {
      ...base,
      background: "#e8f4df",
      color: "#1d7d24",
    };
  }

  if (role === "ONG") {
    return {
      ...base,
      background: "#e3f0ff",
      color: "#1d5f9d",
    };
  }

  return {
    ...base,
    background: "#f1f4ef",
    color: "#58645b",
  };
};

const styles = {
  ...baseStyles,

  metaItemWide: {
    background: "#f7faf4",
    border: "1px solid #e6efdf",
    borderRadius: "18px",
    padding: "13px 14px",
    gridColumn: "span 2",
  },
};

export default AdminUsers;