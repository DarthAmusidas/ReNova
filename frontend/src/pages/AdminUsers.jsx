import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers } from "../services/userService";
import AppSidebar from "../components/AppSidebar";
import HeaderUserCard from "../components/HeaderUserCard";
import UiIcon from "../components/UiIcon";
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

  const loadUsers = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }

    loadUsers();
  }, [isAdmin, navigate, loadUsers]);

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
    if (role === "ADMIN") return <UiIcon name="shield" size={22} />;
    if (role === "SUPERMARKET") return <UiIcon name="store" size={22} />;
    if (role === "ONG") return <UiIcon name="heartHand" size={22} />;
    return <UiIcon name="user" size={22} />;
  };

  return (
    <div style={styles.layout} className="renova-users-shell">
      <AppSidebar
        active="users"
        user={user}
        isAdmin={isAdmin}
        navigate={navigate}
        onLogout={handleLogout}
      />

      <main style={styles.main} className="renova-products-main renova-users-main">
        <header className="renova-products-header">
          <div>
            <span className="renova-section-badge renova-users-badge">Administración</span>

            <h1>Usuarios registrados</h1>

            <p>
              Consultá los usuarios registrados en la plataforma ReNova.
            </p>
          </div>

          <div className="renova-header-actions">
            <HeaderUserCard user={user} />

          </div>
        </header>

        {error && <div style={styles.errorBox} className="renova-users-error">{error}</div>}

        {loading ? (
          <section style={styles.emptyState} className="renova-users-empty">
            <h2 style={styles.emptyTitle}>Cargando usuarios...</h2>
            <p style={styles.emptyText}>
              Estamos consultando los usuarios registrados.
            </p>
          </section>
        ) : users.length === 0 ? (
          <section style={styles.emptyState} className="renova-users-empty">
            <h2 style={styles.emptyTitle}>No hay usuarios para mostrar</h2>
            <p style={styles.emptyText}>
              Todavía no existen usuarios registrados.
            </p>
          </section>
        ) : (
          <section style={styles.cardsGrid}>
            {users.map((item) => (
              <article key={item.id} style={styles.card} className="renova-users-card">
                <div style={styles.cardHeader}>
                  <div>
                    <h2 style={styles.cardTitle}>{item.name}</h2>

                    <p style={styles.cardText}>{item.email}</p>
                  </div>

                  <div style={styles.cardIcon} className="renova-users-card-icon">{getRoleIcon(item.role)}</div>
                </div>

                <span
                  style={getRoleBadgeStyle(item.role)}
                  className={`renova-users-role renova-users-role-${String(item.role).toLowerCase()}`}
                >
                  {getRoleLabel(item.role)}
                </span>

                <div style={styles.metaGrid}>
                  <div style={styles.metaItem} className="renova-users-meta">
                    <span style={styles.metaLabel}>Teléfono</span>
                    <span style={styles.metaValue}>{item.phone || "-"}</span>
                  </div>

                  <div style={styles.metaItem} className="renova-users-meta">
                    <span style={styles.metaLabel}>Fecha alta</span>
                    <span style={styles.metaValue}>
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  {item.organization_type && (
                    <div style={styles.metaItem} className="renova-users-meta">
                      <span style={styles.metaLabel}>Tipo de organización</span>
                      <span style={styles.metaValue}>{item.organization_type}</span>
                    </div>
                  )}

                  <div style={styles.metaItemWide} className="renova-users-meta">
                    <span style={styles.metaLabel}>Dirección</span>
                    <span style={styles.metaValue}>{item.address || "-"}</span>
                  </div>

                  <div style={styles.metaItemWide} className="renova-users-meta">
                    <span style={styles.metaLabel}>ID usuario</span>
                    <span style={styles.metaValue}>
                      {String(item.id).slice(0, 8)}
                    </span>
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
    borderRadius: "16px",
    padding: "13px 14px",
    gridColumn: "span 2",
  },
};

export default AdminUsers;




