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

  const formatDate = (dateValue) => {
    if (!dateValue) return "Sin fecha";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Sin fecha";
    }

    return date.toLocaleDateString("es-AR");
  };

  const handlePrintReceipt = (reservation) => {
    const printWindow = window.open('', '', 'width=600,height=800');
    
    const orderCode = reservation.order_code || String(reservation.id).slice(0, 8);
    const productName = getProductName(reservation);
    const quantity = reservation.quantity_reserved || reservation.quantity || 0;
    const ongName = getOngName(reservation) || "No informado";
    const supermarketName = getSupermarketName(reservation) || "No informado";
    const pickupPersonName = reservation.pickup_person_name || "No informado";
    const pickupPersonDni = reservation.pickup_person_dni || "No informado";
    const pickupPersonPhone = reservation.pickup_person_phone || "No informado";
    const pickupTime = reservation.pickup_time || "No informado";
    const pickupNotes = reservation.pickup_notes || "No informado";
    const reservedDate = formatDate(reservation.reserved_at || reservation.created_at);
    const status = getStatusLabel(reservation.status || 'PENDING');

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante de Reserva - ReNova</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0;
            padding: 20px;
            background: white;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #2f9728;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            color: #2f9728;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
            font-size: 12px;
          }
          .section {
            margin-bottom: 20px;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 8px;
          }
          .section-title {
            font-weight: bold;
            color: #2f9728;
            margin-bottom: 10px;
            font-size: 14px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 8px;
          }
          .field {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
          }
          .field-label {
            font-weight: bold;
            color: #555;
          }
          .field-value {
            color: #333;
            text-align: right;
            flex-grow: 1;
            margin-left: 20px;
          }
          .footer {
            text-align: center;
            border-top: 1px solid #e0e0e0;
            padding-top: 20px;
            margin-top: 20px;
            font-size: 11px;
            color: #999;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
            margin-top: 10px;
          }
          .status-pending {
            background: #fff3cd;
            color: #856404;
          }
          .status-confirmed {
            background: #d4edda;
            color: #155724;
          }
          .status-completed {
            background: #d4edda;
            color: #155724;
          }
          .status-cancelled {
            background: #f8d7da;
            color: #721c24;
          }
          @media print {
            body { margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌱 ReNova</h1>
          <p>Comprobante de Reserva</p>
          <p>Pedido: <strong>${orderCode}</strong></p>
        </div>

        <div class="section">
          <div class="section-title">Información del Producto</div>
          <div class="field">
            <span class="field-label">Producto:</span>
            <span class="field-value">${productName}</span>
          </div>
          <div class="field">
            <span class="field-label">Cantidad:</span>
            <span class="field-value">${quantity}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Organizaciones</div>
          <div class="field">
            <span class="field-label">Organización que reserva:</span>
            <span class="field-value">${ongName}</span>
          </div>
          <div class="field">
            <span class="field-label">Comercio donante:</span>
            <span class="field-value">${supermarketName}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Datos de Retiro</div>
          <div class="field">
            <span class="field-label">Persona que retira:</span>
            <span class="field-value">${pickupPersonName}</span>
          </div>
          <div class="field">
            <span class="field-label">DNI:</span>
            <span class="field-value">${pickupPersonDni}</span>
          </div>
          ${pickupPersonPhone !== '-' ? `
          <div class="field">
            <span class="field-label">Teléfono:</span>
            <span class="field-value">${pickupPersonPhone}</span>
          </div>
          ` : ''}
          ${pickupTime !== '-' ? `
          <div class="field">
            <span class="field-label">Horario de retiro:</span>
            <span class="field-value">${pickupTime}</span>
          </div>
          ` : ''}
          ${pickupNotes !== '-' ? `
          <div class="field">
            <span class="field-label">Notas:</span>
            <span class="field-value">${pickupNotes}</span>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">Información de la Reserva</div>
          <div class="field">
            <span class="field-label">Fecha de reserva:</span>
            <span class="field-value">${reservedDate}</span>
          </div>
          <div class="field">
            <span class="field-label">Estado actual:</span>
            <span class="field-value">
              <div class="status-badge status-${status.toLowerCase().replace('á', 'a').replace(' ', '-')}">
                ${status}
              </div>
            </span>
          </div>
        </div>

        <div class="footer">
          <p>Comprobante generado automáticamente por ReNova</p>
          <p>Plataforma solidaria de donación de productos</p>
          <p>Fecha de impresión: ${new Date().toLocaleDateString('es-AR')}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
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
    if (reservation.supermarket_organization_type) {
      return `${reservation.supermarket_name} (${reservation.supermarket_organization_type})`;
    }
    return (
      reservation.supermarket_name ||
      reservation.supermarket?.name ||
      reservation.market_name ||
      "Supermercado"
    );
  };

  const getOngName = (reservation) => {
    if (reservation.organization_type) {
      return `${reservation.ong_name} (${reservation.organization_type})`;
    }
    return (
      reservation.ong_name ||
      reservation.ong?.name ||
      reservation.organization_name ||
      "Organización"
    );
  };

  const getTraceabilityInfo = (reservation) => {
    const items = [];

    // If SUPERMARKET role: show who reserved
    if (isSupermarket) {
      const ongDisplay = getOngName(reservation) || "No informado";
      items.push({ label: "Reservado por:", value: ongDisplay });
    }

    // If ONG role: show who publishes
    if (isOng) {
      const supermarketDisplay = getSupermarketName(reservation) || "No informado";
      items.push({ label: "Publicado por:", value: supermarketDisplay });
    }

    // If ADMIN role: show both
    if (isAdmin) {
      const ongDisplay = getOngName(reservation) || "No informado";
      const supermarketDisplay = getSupermarketName(reservation) || "No informado";
      items.push({ label: "Reservado por:", value: ongDisplay });
      items.push({ label: "Publicado por:", value: supermarketDisplay });
    }

    return items.length > 0 ? items : null;
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
          {isOng && !reservation.ong_completed && (
            <button
              type="button"
              style={styles.primaryButton}
              disabled={isUpdating}
              onClick={() => handleUpdateStatus(reservation.id, "COMPLETED")}
            >
              Confirmar retiro
            </button>
          )}

          {isSupermarket && !reservation.ong_completed && (
            <button
              type="button"
              style={styles.disabledButton}
              disabled
              title="Esperando confirmación de retiro de la organización"
            >
              Esperando confirmación de retiro
            </button>
          )}

          {isSupermarket && reservation.ong_completed && !reservation.supermarket_completed && (
            <button
              type="button"
              style={styles.primaryButton}
              disabled={isUpdating}
              onClick={() => handleUpdateStatus(reservation.id, "COMPLETED")}
            >
              Confirmar entrega
            </button>
          )}

          {isOng && reservation.ong_completed && !reservation.supermarket_completed && (
            <button type="button" style={styles.disabledButton} disabled>
              Retiro confirmado, esperando entrega
            </button>
          )}

          {reservation.ong_completed && reservation.supermarket_completed && (
            <button type="button" style={styles.disabledButton} disabled>
              Entrega completada
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
              const hasPickupInfo =
                reservation.pickup_person_name ||
                reservation.pickup_person_dni ||
                reservation.pickup_person_phone ||
                reservation.pickup_notes;

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

                      {getTraceabilityInfo(reservation) && (
                        <div style={localStyles.traceabilityInfo}>
                          {getTraceabilityInfo(reservation).map((item, idx) => (
                            <div key={idx} style={localStyles.traceabilityItem}>
                              <span style={localStyles.traceabilityLabel}>
                                {item.label}
                              </span>
                              <span style={localStyles.traceabilityValue}>
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
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
                      <span style={styles.metaLabel}>Pedido</span>
                      <span style={styles.orderCodeValue}>
                        {reservation.order_code || String(reservation.id).slice(0, 8)}
                      </span>
                    </div>

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
                  </div>

                  {hasPickupInfo && (
                    <div style={localStyles.pickupSection}>
                      <div style={localStyles.pickupTitle}>Datos de retiro</div>
                      <div style={localStyles.pickupGrid}>
                        {reservation.pickup_person_name && (
                          <div style={localStyles.pickupItem}>
                            <span style={styles.metaLabel}>
                              Persona de retiro
                            </span>
                            <span style={styles.metaValue}>
                              {reservation.pickup_person_name}
                            </span>
                          </div>
                        )}

                        {reservation.pickup_person_dni && (
                          <div style={localStyles.pickupItem}>
                            <span style={styles.metaLabel}>DNI</span>
                            <span style={styles.metaValue}>
                              {reservation.pickup_person_dni}
                            </span>
                          </div>
                        )}

                        {reservation.pickup_person_phone && (
                          <div style={localStyles.pickupItem}>
                            <span style={styles.metaLabel}>Teléfono</span>
                            <span style={styles.metaValue}>
                              {reservation.pickup_person_phone}
                            </span>
                          </div>
                        )}

                        {reservation.pickup_time && (
                          <div style={localStyles.pickupItem}>
                            <span style={styles.metaLabel}>Horario de retiro</span>
                            <span style={styles.metaValue}>
                              {reservation.pickup_time}
                            </span>
                          </div>
                        )}

                        {reservation.pickup_notes && (
                          <div style={localStyles.pickupItem}>
                            <span style={styles.metaLabel}>Notas</span>
                            <span style={styles.metaValue}>
                              {reservation.pickup_notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                    <button
                      type="button"
                      style={{
                        ...styles.secondaryButton,
                        marginLeft: "10px"
                      }}
                      onClick={() => handlePrintReceipt(reservation)}
                    >
                      🖨️ Imprimir comprobante
                    </button>
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

  pickupSection: {
    marginTop: "18px",
    background: "#f8f9f4",
    border: "1px solid #dfe8d7",
    borderRadius: "18px",
    padding: "16px",
  },

  pickupTitle: {
    color: "#102018",
    fontWeight: 900,
    marginBottom: "12px",
    fontSize: "0.95rem",
  },

  pickupGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
  },

  pickupItem: {
    background: "#ffffff",
    border: "1px solid #e1eadc",
    borderRadius: "16px",
    padding: "12px 14px",
  },

  traceabilityInfo: {
    marginTop: "8px",
    paddingTop: "8px",
    borderTop: "1px solid #e1eadc",
  },

  traceabilityItem: {
    display: "flex",
    gap: "6px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: "4px",
    fontSize: "0.9rem",
  },

  traceabilityLabel: {
    fontWeight: 600,
    color: "#647066",
  },

  traceabilityValue: {
    color: "#647066",
  },
};

export default Reservations;