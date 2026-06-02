import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getReservations,
  updateReservationStatus,
} from "../services/reservationService";
import NotificationBell from "../components/NotificationBell";
import { pageStyles as styles, getStatusStyle } from "../styles/pageStyles";

function Reservations() {
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userName = user?.name || "Usuario";
  const userRole = user?.role || "";

  const isSupermarket = userRole === "SUPERMARKET";
  const isOng = userRole === "ONG";
  const isAdmin = userRole === "ADMIN";

  const roleLabel = isSupermarket
    ? "Supermercado"
    : isAdmin
    ? "Administrador"
    : "ONG";

  const userIcon = isSupermarket ? "🛒" : isAdmin ? "🛡️" : "🤝";

  const loadReservations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getReservations();

      const reservationList = Array.isArray(data)
        ? data
        : data.reservations || data.data || [];

      setReservations(reservationList);
    } catch (err) {
      console.error("Error cargando reservas:", err);
      setError("No se pudieron cargar las reservas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleUpdateStatus = async (reservationId, status) => {
    try {
      setUpdatingId(reservationId);
      setError("");
      setSuccess("");

      await updateReservationStatus(reservationId, status);

      let message = "";
      if (status === "CONFIRMED") message = "Reserva confirmada correctamente.";
      if (status === "COMPLETED") message = "Confirmación registrada correctamente.";
      if (status === "CANCELLED") message = "Reserva cancelada correctamente.";
      
      if (message) setSuccess(message);
      
      await loadReservations();
    } catch (err) {
      console.error("Error actualizando reserva:", err);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "No se pudo actualizar la reserva."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-AR");
  };

  const getStatusLabel = (status) => {
    if (status === "PENDING") return "Pendiente";
    if (status === "CONFIRMED") return "Confirmada";
    if (status === "COMPLETED") return "Completada";
    if (status === "CANCELLED" || status === "CANCELED") return "Cancelada";
    return status || "Pendiente";
  };

  const getFilteredReservations = () => {
    if (selectedFilter === "ALL") {
      return reservations;
    }
    return reservations.filter((res) => {
      const status = res.status || "PENDING";
      return status === selectedFilter;
    });
  };

  const getStatusCounts = () => {
    const counts = {
      ALL: reservations.length,
      PENDING: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    reservations.forEach((res) => {
      const status = res.status || "PENDING";
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();
  const filteredReservations = getFilteredReservations();

  const getProductName = (reservation) => {
    return (
      reservation.product_name ||
      reservation.product?.name ||
      reservation.name ||
      "Producto reservado"
    );
  };

  const getSupermarketName = (reservation) => {
    return (
      reservation.supermarket_name ||
      reservation.supermarket?.name ||
      reservation.market_name ||
      "Supermercado"
    );
  };

  const getOngName = (reservation) => {
    return (
      reservation.ong_name ||
      reservation.ong?.name ||
      reservation.organization_name ||
      "Organización"
    );
  };

  const getPageTitle = () => {
    if (isAdmin) return "Reservas registradas";
    if (isSupermarket) return "Reservas recibidas";
    return "Mis reservas";
  };

  const getPageSubtitle = () => {
    if (isAdmin) {
      return "Consultá todas las reservas registradas en la plataforma.";
    }

    if (isSupermarket) {
      return "Revisá las solicitudes realizadas por organizaciones y confirmá las entregas.";
    }

    return "Consultá el estado de tus reservas y confirmá la recepción de productos.";
  };

  const renderActions = (reservation, status, isUpdating) => {
    if (isAdmin) {
      return (
        <button type="button" style={styles.disabledButton} disabled>
          Solo consulta
        </button>
      );
    }

    if (isSupermarket && status === "PENDING") {
      return (
        <>
          <button
            type="button"
            style={styles.primaryButton}
            disabled={isUpdating}
            onClick={() => handleUpdateStatus(reservation.id, "CONFIRMED")}
          >
            Confirmar reserva
          </button>

          <button
            type="button"
            style={styles.dangerButton}
            disabled={isUpdating}
            onClick={() => handleUpdateStatus(reservation.id, "CANCELLED")}
          >
            Cancelar
          </button>
        </>
      );
    }

    if (isOng && status === "PENDING") {
      return (
        <button
          type="button"
          style={styles.dangerButton}
          disabled={isUpdating}
          onClick={() => handleUpdateStatus(reservation.id, "CANCELLED")}
        >
          Cancelar reserva
        </button>
      );
    }

    if (status === "CONFIRMED") {
      return (
        <>
          {isSupermarket && !reservation.supermarket_completed && (
            <button
              type="button"
              style={styles.primaryButton}
              disabled={isUpdating}
              onClick={() => handleUpdateStatus(reservation.id, "COMPLETED")}
            >
              Confirmé entrega
            </button>
          )}

          {isOng && !reservation.ong_completed && (
            <button
              type="button"
              style={styles.primaryButton}
              disabled={isUpdating}
              onClick={() => handleUpdateStatus(reservation.id, "COMPLETED")}
            >
              Confirmé recepción
            </button>
          )}

          {isSupermarket && reservation.supermarket_completed && (
            <button type="button" style={styles.disabledButton} disabled>
              Entrega registrada
            </button>
          )}

          {isOng && reservation.ong_completed && (
            <button type="button" style={styles.disabledButton} disabled>
              Recepción registrada
            </button>
          )}

          <button
            type="button"
            style={styles.dangerButton}
            disabled={isUpdating}
            onClick={() => handleUpdateStatus(reservation.id, "CANCELLED")}
          >
            Cancelar
          </button>
        </>
      );
    }

    return (
      <button type="button" style={styles.disabledButton} disabled>
        Sin acciones pendientes
      </button>
    );
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

          <button
            style={styles.navButtonActive}
            onClick={() => navigate("/reservations")}
          >
            <span>📋</span>
            Reservas
          </button>

          {isAdmin && (
            <button style={styles.navButton} onClick={() => navigate("/users")}>
              <span>👥</span>
              Usuarios
            </button>
          )}
        </nav>

        <button style={styles.logoutButton} onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <span style={styles.badge}>Gestión de reservas</span>
            <h1 style={styles.title}>{getPageTitle()}</h1>
            <p style={styles.subtitle}>{getPageSubtitle()}</p>
          </div>

          <div style={styles.userArea}>
            <div style={styles.userCard}>
              <div style={styles.userAvatar}>{userIcon}</div>

              <div style={styles.userInfo}>
                <span style={styles.sessionText}>Sesión activa</span>
                <strong style={styles.userName}>{userName}</strong>
                <span style={styles.rolePill}>{roleLabel}</span>
              </div>
            </div>

            <div style={styles.bellWrapper}>
              <NotificationBell />
            </div>
          </div>
        </header>

        {error && <div style={styles.errorBox}>{error}</div>}

        {success && <div style={styles.successBox}>{success}</div>}

        {isAdmin && (
          <div style={localStyles.adminInfoBox}>
            El administrador puede consultar todas las reservas, pero no puede
            modificar estados ni confirmar entregas.
          </div>
        )}

        <div style={localStyles.filterBar}>
          {[
            { key: "ALL", label: "Todas", count: statusCounts.ALL },
            { key: "PENDING", label: "Pendientes", count: statusCounts.PENDING, title: "Reservas esperando confirmación del supermercado" },
            { key: "CONFIRMED", label: "Confirmadas", count: statusCounts.CONFIRMED, title: "Reservas confirmadas por el supermercado" },
            { key: "COMPLETED", label: "Completadas", count: statusCounts.COMPLETED, title: "Entregas confirmadas por ambas partes" },
            { key: "CANCELLED", label: "Canceladas", count: statusCounts.CANCELLED, title: "Reservas canceladas" },
          ].map((filter) => (
            <button
              key={filter.key}
              style={
                selectedFilter === filter.key
                  ? localStyles.filterButtonActive
                  : localStyles.filterButton
              }
              onClick={() => setSelectedFilter(filter.key)}
              title={filter.title}
            >
              {filter.label} <span style={localStyles.filterCount}>{filter.count}</span>
            </button>
          ))}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {isAdmin && (
          <div style={localStyles.adminInfoBox}>
            El administrador puede consultar todas las reservas, pero no puede
            modificar estados ni confirmar entregas.
          </div>
        )}

        {loading ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>Cargando reservas...</h2>
            <p style={styles.emptyText}>
              Estamos consultando las reservas registradas.
            </p>
          </section>
        ) : filteredReservations.length === 0 ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>No hay reservas para mostrar</h2>
            <p style={styles.emptyText}>
              {selectedFilter !== "ALL"
                ? `No hay reservas ${selectedFilter === "PENDING" ? "pendientes" : selectedFilter === "CONFIRMED" ? "confirmadas" : selectedFilter === "COMPLETED" ? "completadas" : "canceladas"}.`
                : isAdmin
                ? "Todavía no existen reservas registradas."
                : isSupermarket
                ? "Todavía no recibiste reservas sobre tus productos."
                : "Todavía no realizaste reservas."}
            </p>
          </section>
        ) : (
          <section style={styles.cardsGrid}>
            {filteredReservations.map((reservation) => {
              const status = reservation.status || "PENDING";
              const isUpdating = updatingId === reservation.id;

              return (
                <article key={reservation.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h2 style={styles.cardTitle}>
                        {getProductName(reservation)}
                      </h2>

                      <p style={styles.cardText}>
                        {isAdmin
                          ? "Reserva registrada en la plataforma."
                          : isSupermarket
                          ? "Reserva solicitada por una organización."
                          : "Reserva realizada a un supermercado."}
                      </p>
                    </div>

                    <div style={styles.cardIcon}>📋</div>
                  </div>

                  <span style={getStatusStyle(status)}>
                    {getStatusLabel(status)}
                  </span>

                  <div style={styles.metaGrid}>
                    {isAdmin ? (
                      <>
                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>ONG</span>
                          <span style={styles.metaValue}>
                            {getOngName(reservation)}
                          </span>
                        </div>

                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>Supermercado</span>
                          <span style={styles.metaValue}>
                            {getSupermarketName(reservation)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div style={styles.metaItem}>
                        <span style={styles.metaLabel}>
                          {isSupermarket ? "ONG" : "Supermercado"}
                        </span>
                        <span style={styles.metaValue}>
                          {isSupermarket
                            ? getOngName(reservation)
                            : getSupermarketName(reservation)}
                        </span>
                      </div>
                    )}

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Cantidad</span>
                      <span style={styles.metaValue}>
                        {reservation.quantity_reserved ||
                          reservation.quantity ||
                          0}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Fecha</span>
                      <span style={styles.metaValue}>
                        {formatDate(
                          reservation.reserved_at || reservation.created_at
                        )}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>ID reserva</span>
                      <span style={styles.metaValue}>
                        {String(reservation.id).slice(0, 8)}
                      </span>
                    </div>
                  </div>

                  <div style={localStyles.confirmationBox}>
                    <span style={styles.metaLabel} title="Ambas partes deben confirmar para completar la entrega">Confirmación de entrega</span>

                    <div style={localStyles.confirmationTags}>
                      <span
                        style={getStatusStyle(
                          reservation.supermarket_completed
                            ? "COMPLETED"
                            : "PENDING"
                        )}
                        title="El supermercado debe confirmar que realizó la entrega"
                      >
                        Supermercado:{" "}
                        {reservation.supermarket_completed
                          ? "confirmado"
                          : "pendiente"}
                      </span>

                      <span
                        style={getStatusStyle(
                          reservation.ong_completed ? "COMPLETED" : "PENDING"
                        )}
                        title="La ONG debe confirmar que recibió la entrega"
                      >
                        ONG:{" "}
                        {reservation.ong_completed ? "confirmado" : "pendiente"}
                      </span>
                    </div>
                  </div>

                  <div style={styles.cardActions}>
                    {renderActions(reservation, status, isUpdating)}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

const localStyles = {
  adminInfoBox: {
    background: "#eef7e7",
    border: "1px solid #d8ebce",
    color: "#1f6f21",
    borderRadius: "18px",
    padding: "16px 18px",
    fontWeight: 800,
    marginBottom: "22px",
  },

  filterBar: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },

  filterButton: {
    border: "1px solid #d6e4d0",
    borderRadius: "20px",
    background: "#ffffff",
    color: "#223025",
    padding: "10px 18px",
    fontWeight: 800,
    fontSize: "0.95rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  filterButtonActive: {
    border: "2px solid #2f9728",
    borderRadius: "20px",
    background: "#e8f4df",
    color: "#1d7d24",
    padding: "10px 18px",
    fontWeight: 900,
    fontSize: "0.95rem",
    cursor: "pointer",
  },

  filterCount: {
    marginLeft: "6px",
    background: "rgba(0,0,0,0.08)",
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "0.85rem",
    fontWeight: 900,
  },

  confirmationBox: {
    marginTop: "18px",
    background: "#f7faf4",
    border: "1px solid #e6efdf",
    borderRadius: "18px",
    padding: "14px",
  },

  confirmationTags: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "8px",
  },
};

export default Reservations;