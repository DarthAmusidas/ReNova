import { useCallback, useEffect, useRef, useState } from "react";
import ModalPortal from "../components/ModalPortal";
import PickupQrModal from "../components/PickupQrModal";
import { useNavigate } from "react-router-dom";
import {
  getReservations,
  updateReservationStatus,
} from "../services/reservationService";
import AppSidebar from "../components/AppSidebar";
import HeaderUserCard from "../components/HeaderUserCard";
import { pageStyles as styles } from "../styles/pageStyles";

const RESERVATIONS_PER_PAGE = 4;

function Reservations() {
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [reservationToCancel, setReservationToCancel] = useState(null);
  const updatingRef = useRef(false);
  const [copiedId, setCopiedId] = useState(null);
  const [pickupQrReservation, setPickupQrReservation] = useState(null);

  const handleCopyOrderCode = async (reservationId, code) => {
    const markCopied = () => {
      setCopiedId(reservationId);
      setTimeout(() => setCopiedId(null), 1600);
    };

    try {
      await navigator.clipboard.writeText(code);
      markCopied();
      return;
    } catch {
      // Algunos navegadores bloquean la API del portapapeles: se usa el método clásico.
    }

    const field = document.createElement("textarea");
    field.value = code;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();

    if (copied) {
      markCopied();
    } else {
      setError("No se pudo copiar el número de pedido. Seleccionalo y copialo a mano.");
    }
  };
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [now, setNow] = useState(Date.now());
  const [selectedReservationForDelivery, setSelectedReservationForDelivery] =
    useState(null);
  const [deliveryCode, setDeliveryCode] = useState("");
  const [deliveryCodeError, setDeliveryCodeError] = useState("");
  const [deliveryCodeLoading, setDeliveryCodeLoading] = useState(false);

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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleUpdateStatus = async (reservationId, status, extraData = {}) => {
    // Un cambio de estado por vez: evita envíos duplicados por clics rápidos.
    if (updatingRef.current) return;

    try {
      updatingRef.current = true;
      setUpdatingId(reservationId);
      setError("");
      setSuccess("");

      await updateReservationStatus(reservationId, status, extraData);

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
      updatingRef.current = false;
      setUpdatingId(null);
    }
  };

  const handleOpenDeliveryModal = (reservation) => {
    setSelectedReservationForDelivery(reservation);
    setDeliveryCode("");
    setDeliveryCodeError("");
    setDeliveryCodeLoading(false);
    setError("");
    setSuccess("");
  };

  const handleCloseDeliveryModal = () => {
    setSelectedReservationForDelivery(null);
    setDeliveryCode("");
    setDeliveryCodeError("");
    setDeliveryCodeLoading(false);
  };

  const handleConfirmDelivery = async () => {
    if (!selectedReservationForDelivery) return;

    const code = deliveryCode.trim();

    if (!code) {
      setDeliveryCodeError("Ingresá el número de pedido.");
      return;
    }

    try {
      setDeliveryCodeError("");
      setDeliveryCodeLoading(true);
      setUpdatingId(selectedReservationForDelivery.id);
      setError("");
      setSuccess("");

      await updateReservationStatus(
        selectedReservationForDelivery.id,
        "COMPLETED",
        {
          delivery_code: code,
        }
      );

      setSuccess("Entrega completada.");
      await loadReservations();
      handleCloseDeliveryModal();
    } catch (err) {
      console.error("Error confirmando entrega:", err);
      setDeliveryCodeError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "No se pudo confirmar la entrega."
      );
    } finally {
      setDeliveryCodeLoading(false);
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

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "Sin fecha";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Sin fecha";
    }

    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getConfirmationDeadline = (reservation) => {
    if (reservation.confirmation_deadline) {
      return reservation.confirmation_deadline;
    }

    if (!reservation.reserved_at) return null;

    const reservedDate = new Date(reservation.reserved_at);

    if (Number.isNaN(reservedDate.getTime())) return null;

    return new Date(reservedDate.getTime() + 48 * 60 * 60 * 1000).toISOString();
  };

  const isActiveOngReservation = (reservation) => {
    if (!reservation) return false;

    return (
      ["PENDING", "CONFIRMED"].includes(reservation.status || "PENDING") &&
      reservation.ong_completed !== true
    );
  };

  const isConfirmationExpired = (reservation) => {
    if (!isActiveOngReservation(reservation)) return false;

    if (reservation.is_confirmation_expired === true) return true;
    if (reservation.is_confirmation_expired === "true") return true;

    const deadline = getConfirmationDeadline(reservation);

    if (!deadline) return false;

    const deadlineDate = new Date(deadline);

    if (Number.isNaN(deadlineDate.getTime())) return false;

    return now > deadlineDate.getTime();
  };

  const getConfirmationTimeRemainingMs = (reservation) => {
    if (!isActiveOngReservation(reservation)) return null;

    const deadline = getConfirmationDeadline(reservation);

    if (!deadline) return null;

    const deadlineDate = new Date(deadline);

    if (Number.isNaN(deadlineDate.getTime())) return null;

    return Math.max(0, deadlineDate.getTime() - now);
  };

  const formatRemainingTime = (remainingMs) => {
    const ms = Number(remainingMs);

    if (!Number.isFinite(ms) || ms <= 0) return "Vencida";

    const totalMinutes = Math.ceil(ms / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days >= 1) {
      return `${days}d ${hours}h`;
    }

    if (hours >= 1) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  };

  const handlePrintReceipt = (reservation) => {
    const printWindow = window.open('', '', 'width=600,height=800');

    if (!printWindow) {
      setError("El navegador bloqueó la ventana del comprobante. Permití las ventanas emergentes para ReNova.");
      return;
    }

    // Todos los datos vienen de usuarios: se escapan antes de escribirlos como HTML.
    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    // El comercio no ve el número de pedido hasta que la entrega se completa.
    const orderCode = escapeHtml(reservation.order_code || "En poder de la ONG");
    const productName = escapeHtml(getProductName(reservation));
    const quantity = escapeHtml(reservation.quantity_reserved || reservation.quantity || 0);
    const ongName = escapeHtml(getOngName(reservation) || "No informado");
    const supermarketName = escapeHtml(getSupermarketName(reservation) || "No informado");
    const pickupPersonName = escapeHtml(reservation.pickup_person_name || "No informado");
    const pickupPersonDni = escapeHtml(reservation.pickup_person_dni || "No informado");
    const pickupPersonPhone = escapeHtml(reservation.pickup_person_phone || "No informado");
    const pickupTime = escapeHtml(reservation.pickup_time || "No informado");
    const pickupNotes = escapeHtml(reservation.pickup_notes || "No informado");
    const reservedDate = escapeHtml(formatDate(reservation.reserved_at || reservation.created_at));
    const status = escapeHtml(getStatusLabel(reservation.status || 'PENDING'));
    // Clave en inglés para las clases .status-pending/.status-confirmed/... del comprobante.
    const statusKey = escapeHtml(
      String(reservation.status || 'PENDING').toLowerCase().replace('canceled', 'cancelled')
    );
    const unit = escapeHtml(reservation.unit || "");
    const printedAt = escapeHtml(
      new Date().toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    const completed = reservation.status === "COMPLETED";

    const receiptHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Comprobante ${orderCode} - ReNova</title>
        <style>
          /* Márgenes 0: el navegador no imprime su encabezado/pie (fecha, about:blank). */
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 18mm 16mm;
            font-family: "Segoe UI", Arial, sans-serif;
            color: #102018;
            font-size: 12.5px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .sheet { max-width: 720px; margin: 0 auto; }
          header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #1f8b24;
          }
          .brand { display: flex; align-items: center; gap: 10px; }
          .brand svg { width: 34px; height: 34px; }
          .brand strong { display: block; font-size: 24px; color: #136b19; letter-spacing: -0.5px; }
          .brand span { color: #59695d; font-size: 12px; }
          .ticket {
            text-align: right;
            border: 1.5px dashed #1f8b24;
            border-radius: 12px;
            padding: 8px 14px;
            background: #f3f8ef;
          }
          .ticket small {
            display: block;
            color: #5d6b60;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
          }
          .ticket b {
            font-family: "JetBrains Mono", Consolas, "Courier New", monospace;
            font-size: 20px;
            letter-spacing: 0.5px;
          }
          .summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin: 18px 0 14px;
          }
          .summary h1 { margin: 0; font-size: 20px; }
          .summary p { margin: 4px 0 0; color: #59695d; }
          .status-badge {
            padding: 5px 12px;
            border-radius: 999px;
            font-weight: 700;
            font-size: 12px;
            white-space: nowrap;
          }
          .status-pending { background: #fff2d9; color: #7a5200; }
          .status-confirmed { background: #e3ecf8; color: #1d4f86; }
          .status-completed { background: #e3f2dc; color: #116a18; }
          .status-cancelled { background: #fbe4e2; color: #9b2c22; }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          section {
            border: 1px solid #e1e8dc;
            border-radius: 12px;
            padding: 12px 14px;
          }
          section.wide { grid-column: 1 / -1; }
          section h2 {
            margin: 0 0 8px;
            color: #136b19;
            font-size: 11px;
            letter-spacing: 0.8px;
            text-transform: uppercase;
          }
          dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 5px 14px; }
          dt { color: #5d6b60; }
          dd { margin: 0; font-weight: 600; text-align: right; overflow-wrap: anywhere; }
          .steps { display: flex; gap: 10px; margin-top: 2px; }
          .step {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            border-radius: 10px;
            background: #f4f6f2;
            color: #4b5a4f;
            font-weight: 600;
          }
          .step i {
            width: 20px; height: 20px; border-radius: 999px;
            display: inline-flex; align-items: center; justify-content: center;
            font-style: normal; font-size: 11px; font-weight: 700;
            background: #dfe7da; color: #3f4d43;
          }
          .step.done { background: #e3f2dc; color: #116a18; }
          .step.done i { background: #136b19; color: #fff; }
          .howto { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
          .howto-note { margin: 8px 0 0; color: #5d6b60; font-size: 11.5px; }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-top: 34px;
          }
          .signature { border-top: 1px solid #9aa597; padding-top: 6px; color: #59695d; font-size: 11px; }
          footer {
            margin-top: 26px;
            padding-top: 10px;
            border-top: 1px solid #e1e8dc;
            display: flex;
            justify-content: space-between;
            color: #7a857b;
            font-size: 10.5px;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <header>
            <div class="brand">
              <svg viewBox="0 0 32 32" fill="none" stroke="#1f8b24" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M6 26c0-11 7-18 20-20-1 13-8 20-19 20" />
                <path d="M6 26 18 14" />
              </svg>
              <div>
                <strong>ReNova</strong>
                <span>Comprobante de reserva</span>
              </div>
            </div>
            <div class="ticket">
              <small>Número de pedido</small>
              <b>${orderCode}</b>
            </div>
          </header>

          <div class="summary">
            <div>
              <h1>${productName}</h1>
              <p>${quantity} ${unit} · reservado el ${reservedDate}</p>
            </div>
            <div class="status-badge status-${statusKey}">${status}</div>
          </div>

          <div class="grid">
            <section>
              <h2>Organización que retira</h2>
              <dl>
                <dt>Organización</dt><dd>${ongName}</dd>
                <dt>Persona</dt><dd>${pickupPersonName}</dd>
                <dt>DNI</dt><dd>${pickupPersonDni}</dd>
                <dt>Teléfono</dt><dd>${pickupPersonPhone}</dd>
              </dl>
            </section>

            <section>
              <h2>Comercio donante</h2>
              <dl>
                <dt>Comercio</dt><dd>${supermarketName}</dd>
                <dt>Horario de retiro</dt><dd>${pickupTime}</dd>
                <dt>Notas</dt><dd>${pickupNotes}</dd>
              </dl>
            </section>

            <section class="wide">
              <h2>Cómo se retira</h2>
              ${completed
                ? `<div class="steps"><div class="step done"><i>&#10003;</i> Entrega completada</div></div>`
                : `<ol class="howto">
                    <li>En el comercio te muestran un <b>código QR</b> en la pantalla.</li>
                    <li>Escanealo con la cámara del celular.</li>
                    <li>Iniciá sesión con la cuenta de la ONG y tocá <b>“Recibí el pedido”</b>.</li>
                  </ol>
                  <p class="howto-note">¿Sin celular? Mostrá este comprobante: el comercio carga el número de pedido.</p>`}
            </section>
          </div>

          <div class="signatures">
            <div class="signature">Firma y aclaración de quien retira</div>
            <div class="signature">Firma y aclaración del comercio</div>
          </div>

          <footer>
            <span>Generado por ReNova · Plataforma solidaria de donación de alimentos</span>
            <span>Impreso el ${printedAt}</span>
          </footer>
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

  const getSearchableReservationText = (reservation) => {
    const directValues = Object.values(reservation || {})
      .filter((value) => {
        const valueType = typeof value;
        return (
          value !== null &&
          value !== undefined &&
          (valueType === "string" ||
            valueType === "number" ||
            valueType === "boolean")
        );
      })
      .join(" ");

    return [
      reservation.product_name,
      reservation.product?.name,
      reservation.name,
      reservation.supermarket_name,
      reservation.supermarket?.name,
      reservation.supermarket_organization_type,
      reservation.supermarket_role,
      reservation.market_name,
      reservation.ong_name,
      reservation.ong?.name,
      reservation.organization_name,
      reservation.organization_type,
      reservation.order_code,
      reservation.id,
      reservation.quantity_reserved,
      reservation.quantity,
      reservation.status,
      reservation.pickup_person_name,
      reservation.pickup_person_dni,
      reservation.pickup_person_phone,
      reservation.pickup_time,
      reservation.pickup_notes,
      directValues,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  };

  // Las canceladas (incluidas las vencidas) no se mezclan en "Todas":
  // se ven solo en su pestaña.
  const isCancelledStatus = (status) =>
    ["CANCELLED", "CANCELED"].includes(String(status || "").toUpperCase());

  const getFilteredReservations = () => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return reservations.filter((res) => {
      const status = res.status || "PENDING";
      const matchesStatus =
        selectedFilter === "ALL"
          ? !isCancelledStatus(status)
          : status === selectedFilter;

      if (!matchesStatus) return false;
      if (!normalizedSearch) return true;

      return getSearchableReservationText(res).includes(normalizedSearch);
    });
  };

  const getStatusCounts = () => {
    const counts = {
      ALL: reservations.filter((res) => !isCancelledStatus(res.status)).length,
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
  const totalReservationPages = Math.max(
    1,
    Math.ceil(filteredReservations.length / RESERVATIONS_PER_PAGE)
  );
  const safeCurrentPage = Math.min(currentPage, totalReservationPages);
  const reservationStartIndex =
    (safeCurrentPage - 1) * RESERVATIONS_PER_PAGE;
  const reservationEndIndex = reservationStartIndex + RESERVATIONS_PER_PAGE;
  const paginatedReservations = filteredReservations.slice(
    reservationStartIndex,
    reservationEndIndex
  );

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
    const cancelButton = (label = "Cancelar") => (
      <button
        type="button"
        className="renova-rbtn renova-rbtn-danger"
        disabled={isUpdating}
        onClick={() => setReservationToCancel(reservation)}
      >
        {label}
      </button>
    );

    const waiting = (label) => (
      <span className="renova-rcard-waiting">{label}</span>
    );

    if (isAdmin) {
      return waiting("Solo consulta");
    }

    if (isSupermarket && status === "PENDING") {
      const expired = isConfirmationExpired(reservation);

      return (
        <>
          {expired ? (
            waiting("Confirmación vencida")
          ) : (
            <button
              type="button"
              className="renova-rbtn renova-rbtn-primary"
              disabled={isUpdating}
              onClick={() => handleUpdateStatus(reservation.id, "CONFIRMED")}
            >
              Confirmar reserva
            </button>
          )}
          {cancelButton()}
        </>
      );
    }

    if (isOng && status === "PENDING") {
      return (
        <>
          {waiting("Esperando que el comercio confirme")}
          {cancelButton("Cancelar reserva")}
        </>
      );
    }

    if (status === "CONFIRMED") {
      const confirmationExpired = isConfirmationExpired(reservation);

      if (isOng && !reservation.ong_completed) {
        return (
          <>
            {confirmationExpired
              ? waiting("Reserva vencida")
              : waiting("Listo para retirar")}
            {cancelButton()}
          </>
        );
      }

      if (isSupermarket && !reservation.supermarket_completed) {
        return (
          <>
            {confirmationExpired ? (
              waiting("Reserva vencida")
            ) : (
              <>
                <button
                  type="button"
                  className="renova-rbtn renova-rbtn-primary"
                  disabled={isUpdating}
                  onClick={() => setPickupQrReservation(reservation)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h3v-3" />
                  </svg>
                  Entregar con QR
                </button>
                <button
                  type="button"
                  className="renova-rbtn renova-rbtn-ghost"
                  disabled={isUpdating}
                  onClick={() => handleOpenDeliveryModal(reservation)}
                >
                  Usar código
                </button>
              </>
            )}
            {!reservation.ong_completed && cancelButton()}
          </>
        );
      }

      if (isOng && !reservation.supermarket_completed) {
        return waiting("Retiro confirmado · falta la validación del comercio");
      }
    }

    return null;
  };

  return (
    <div style={styles.layout} className="renova-reservations-shell">
      <AppSidebar
        active="reservations"
        user={user}
        isAdmin={isAdmin}
        navigate={navigate}
        onLogout={handleLogout}
      />

      <main style={styles.main} className="renova-products-main renova-reservations-main">
        <header className="renova-products-header renova-reservations-header">
          <div>
            <span className="renova-section-badge renova-reservations-page-badge">Gestión de reservas</span>
            <h1>{getPageTitle()}</h1>
            <p>{getPageSubtitle()}</p>
          </div>

          <div className="renova-header-actions renova-page-header-actions">
            <HeaderUserCard user={user} />
          </div>
        </header>

        {error && <div style={styles.errorBox} className="renova-inline-error">{error}</div>}

        {success && <div style={styles.successBox} className="renova-inline-success">{success}</div>}

        {isAdmin && (
          <div style={localStyles.adminInfoBox} className="renova-admin-note-inline">
            El administrador puede consultar todas las reservas, pero no puede
            modificar estados ni confirmar entregas.
          </div>
        )}
        <div className="renova-reservations-toolbar">
          <div style={localStyles.filterBar} className="renova-reservations-filter-bar">
            {[
              { key: "ALL", label: "Todas", count: statusCounts.ALL, title: "Pendientes, confirmadas y completadas. Las canceladas están en su pestaña." },
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
                onClick={() => {
                  setSelectedFilter(filter.key);
                  setCurrentPage(1);
                }}
                title={filter.title}
              >
                {filter.label} <span style={localStyles.filterCount}>{filter.count}</span>
              </button>
            ))}
          </div>

          <label className="renova-search-box renova-reservations-search-box">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <input
              type="search"
              placeholder="Buscar reserva, producto o proveedor"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
        </div>

        <p className="renova-reservations-result-count">
          {filteredReservations.length} reservas encontradas
        </p>

        {filteredReservations.length > RESERVATIONS_PER_PAGE && (
          <nav
            className="renova-reservations-pagination renova-reservations-pagination-top"
            aria-label="Paginación superior de reservas"
          >
            <button
              type="button"
              className="renova-pagination-control"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
            >
              Anterior
            </button>

            <div className="renova-pagination-numbers">
              {Array.from(
                { length: totalReservationPages },
                (_, index) => index + 1
              ).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={
                    page === safeCurrentPage
                      ? "renova-pagination-page renova-pagination-page-active"
                      : "renova-pagination-page"
                  }
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="renova-pagination-control"
              disabled={safeCurrentPage === totalReservationPages}
              onClick={() =>
                setCurrentPage(
                  Math.min(totalReservationPages, safeCurrentPage + 1)
                )
              }
            >
              Siguiente
            </button>
          </nav>
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
          <section style={styles.cardsGrid} className="renova-reservations-grid">
            {paginatedReservations.map((reservation) => {
              const status = reservation.status || "PENDING";
              const isUpdating = updatingId === reservation.id;
              const confirmationDeadline = getConfirmationDeadline(reservation);
              const confirmationExpired = isConfirmationExpired(reservation);
              const confirmationRemainingMs =
                getConfirmationTimeRemainingMs(reservation);
              const showConfirmationTimer =
                isOng && isActiveOngReservation(reservation);
              const hasConfirmationWarning =
                showConfirmationTimer &&
                !confirmationExpired &&
                confirmationRemainingMs !== null &&
                confirmationRemainingMs <= 6 * 60 * 60 * 1000;
              const hasPickupInfo =
                reservation.pickup_person_name ||
                reservation.pickup_person_dni ||
                reservation.pickup_person_phone ||
                reservation.pickup_notes;

              return (
                <article key={reservation.id} className="renova-rcard">
                  <header className="renova-rcard-head">
                    <div className="renova-rcard-title">
                      <h2>{getProductName(reservation)}</h2>
                      <p className="renova-rcard-sub">
                        {(isAdmin || isSupermarket) && (
                          <span className="is-who">
                            ONG <strong>{getOngName(reservation) || "No informado"}</strong>
                          </span>
                        )}
                        {(isAdmin || isOng) && (
                          <span className="is-who">
                            Comercio <strong>{getSupermarketName(reservation) || "No informado"}</strong>
                          </span>
                        )}
                        <span className="is-meta">
                          <strong>
                            {reservation.quantity_reserved || reservation.quantity || 0}
                          </strong>{" "}
                          {reservation.unit || ""}
                        </span>
                        <span className="is-meta">
                          {formatDate(reservation.reserved_at || reservation.created_at)}
                        </span>
                      </p>
                    </div>

                    <div className="renova-rcard-tags">
                      <span className={`renova-rcard-status is-${String(status).toLowerCase()}`}>
                        {getStatusLabel(status)}
                      </span>
                      {reservation.order_code ? (
                      <div className="renova-rcard-code">
                        <span className="renova-rcard-code-label">Pedido</span>
                        <strong>
                          {reservation.order_code || String(reservation.id).slice(0, 8)}
                        </strong>
                        <button
                          type="button"
                          className="renova-rcard-copy"
                          aria-label="Copiar número de pedido"
                          title={copiedId === reservation.id ? "Copiado" : "Copiar"}
                          onClick={() =>
                            handleCopyOrderCode(
                              reservation.id,
                              reservation.order_code || String(reservation.id).slice(0, 8)
                            )
                          }
                        >
                          {copiedId === reservation.id ? (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="m5 12 5 5 9-10" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <rect x="9" y="9" width="11" height="11" rx="2" />
                              <path d="M5 15V5a2 2 0 0 1 2-2h8" />
                            </svg>
                          )}
                        </button>
                      </div>
                      ) : (
                        isSupermarket && (
                          <span
                            className="renova-rcard-code-hidden"
                            title="Por seguridad, el número de pedido lo tiene solo la ONG"
                          >
                            Pedido en poder de la ONG
                          </span>
                        )
                      )}
                    </div>
                  </header>

                  {showConfirmationTimer && (
                    <div
                      className={`renova-rcard-timer${
                        confirmationExpired
                          ? " is-expired"
                          : hasConfirmationWarning
                          ? " is-warning"
                          : ""
                      }`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                      {confirmationExpired ? (
                        <span>Reserva vencida. Tenés que hacer una nueva reserva.</span>
                      ) : (
                        <span>
                          Quedan <strong>{formatRemainingTime(confirmationRemainingMs)}</strong>{" "}
                          para completar el retiro · vence {formatDateTime(confirmationDeadline)}
                        </span>
                      )}
                    </div>
                  )}

                  {hasPickupInfo && (
                    <dl className="renova-rcard-pickup">
                      {reservation.pickup_person_name && (
                        <div>
                          <dt>Retira</dt>
                          <dd>
                            {reservation.pickup_person_name}
                            {reservation.pickup_person_dni && (
                              <span className="is-dni"> · DNI {reservation.pickup_person_dni}</span>
                            )}
                          </dd>
                        </div>
                      )}

                      {!reservation.pickup_person_name && reservation.pickup_person_dni && (
                        <div>
                          <dt>DNI</dt>
                          <dd>{reservation.pickup_person_dni}</dd>
                        </div>
                      )}

                      {reservation.pickup_person_phone && (
                        <div>
                          <dt>Teléfono</dt>
                          <dd>{reservation.pickup_person_phone}</dd>
                        </div>
                      )}

                      {reservation.pickup_time && (
                        <div>
                          <dt>Horario</dt>
                          <dd>{reservation.pickup_time}</dd>
                        </div>
                      )}

                      {reservation.pickup_notes && (
                        <div className="is-wide">
                          <dt>Notas</dt>
                          <dd>{reservation.pickup_notes}</dd>
                        </div>
                      )}
                    </dl>
                  )}

                  {status === "CONFIRMED" && !reservation.supermarket_completed && (
                    <p className="renova-rcard-hint">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <path d="M14 14h3v3h-3z" />
                      </svg>
                      {isSupermarket
                        ? "Cuando llegue quien retira, tocá “Entregar con QR”: lo escanea con su celular y confirma con la cuenta de la ONG."
                        : "En el comercio te muestran un QR: escanealo con la cámara del celular e iniciá sesión con la cuenta de la ONG para confirmar."}
                    </p>
                  )}

                  <footer className="renova-rcard-actions">
                    {renderActions(reservation, status, isUpdating)}

                    <button
                      type="button"
                      className="renova-rbtn renova-rbtn-ghost renova-rcard-print"
                      onClick={() => handlePrintReceipt(reservation)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 9V3h10v6" />
                        <rect x="3" y="9" width="18" height="8" rx="2" />
                        <path d="M7 14h10v7H7z" />
                      </svg>
                      Comprobante
                    </button>
                  </footer>
                </article>
              );
            })}
          </section>
        )}

        {filteredReservations.length > RESERVATIONS_PER_PAGE && (
          <nav
            className="renova-reservations-pagination"
            aria-label="Paginación de reservas"
          >
            <button
              type="button"
              className="renova-pagination-control"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
            >
              Anterior
            </button>

            <div className="renova-pagination-numbers">
              {Array.from(
                { length: totalReservationPages },
                (_, index) => index + 1
              ).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={
                    page === safeCurrentPage
                      ? "renova-pagination-page renova-pagination-page-active"
                      : "renova-pagination-page"
                  }
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="renova-pagination-control"
              disabled={safeCurrentPage === totalReservationPages}
              onClick={() =>
                setCurrentPage(
                  Math.min(totalReservationPages, safeCurrentPage + 1)
                )
              }
            >
              Siguiente
            </button>
          </nav>
        )}

        {pickupQrReservation && (
          <PickupQrModal
            reservation={pickupQrReservation}
            productName={getProductName(pickupQrReservation)}
            onClose={() => setPickupQrReservation(null)}
            onCompleted={() => {
              setSuccess("Entrega completada con QR.");
              loadReservations();
            }}
            onUseCode={() => {
              const reservation = pickupQrReservation;
              setPickupQrReservation(null);
              handleOpenDeliveryModal(reservation);
            }}
          />
        )}

        {selectedReservationForDelivery && (
          <ModalPortal>
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard} className="renova-inline-modal">
              <h2 style={styles.modalTitle}>Confirmar entrega</h2>

              <p style={styles.modalText}>
                Si quien retira no puede escanear el QR, pedile el número de pedido:
                lo tiene solo la ONG, en su cuenta y en su comprobante.
              </p>

              {deliveryCodeError && (
                <div style={localStyles.modalErrorBox} className="renova-inline-error">{deliveryCodeError}</div>
              )}

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Número de pedido</label>
                <input
                  style={styles.input}
                  type="text"
                  value={deliveryCode}
                  placeholder="Ej: RN-2026-722062"
                  onChange={(e) => {
                    setDeliveryCode(e.target.value);
                    setDeliveryCodeError("");
                  }}
                  autoFocus
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  className="renova-inline-secondary"
                  onClick={handleCloseDeliveryModal}
                  disabled={deliveryCodeLoading}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={handleConfirmDelivery}
                  disabled={deliveryCodeLoading}
                >
                  Confirmar entrega
                </button>
              </div>
            </div>
          </div>
          </ModalPortal>
        )}

        {reservationToCancel && (
          <ModalPortal>
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard} className="renova-inline-modal">
              <h2 style={styles.modalTitle}>Cancelar reserva</h2>

              <p style={styles.modalText}>
                ¿Seguro que querés cancelar la reserva de{" "}
                <strong>{getProductName(reservationToCancel)}</strong>
                {reservationToCancel.order_code ? ` (${reservationToCancel.order_code})` : ""}?
                La cantidad vuelve al stock y la otra parte recibe una notificación.
              </p>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  className="renova-inline-secondary"
                  onClick={() => setReservationToCancel(null)}
                >
                  Volver
                </button>

                <button
                  type="button"
                  style={styles.dangerButton}
                  className="renova-inline-danger"
                  disabled={updatingId === reservationToCancel.id}
                  onClick={async () => {
                    const reservationId = reservationToCancel.id;
                    await handleUpdateStatus(reservationId, "CANCELLED");
                    setReservationToCancel(null);
                  }}
                >
                  {updatingId === reservationToCancel.id ? "Cancelando..." : "Sí, cancelar"}
                </button>
              </div>
            </div>
          </div>
          </ModalPortal>
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
    borderRadius: "16px",
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
    borderRadius: "16px",
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
    borderRadius: "16px",
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
    borderRadius: "16px",
    padding: "14px",
  },

  confirmationTags: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "8px",
  },

  confirmationDeadline: {
    marginTop: "14px",
    background: "#f7faf4",
    border: "1px solid #dfe8d7",
    borderRadius: "16px",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  confirmationDeadlineExpired: {
    marginTop: "14px",
    background: "#fde9e7",
    border: "1px solid #f3b7b7",
    borderRadius: "16px",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  confirmationDeadlineWarning: {
    marginTop: "14px",
    background: "#fff7df",
    border: "1px solid #efcf73",
    borderRadius: "16px",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  expiredBadge: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "7px 12px",
    borderRadius: "999px",
    background: "#d6453d",
    color: "#ffffff",
    fontSize: "0.78rem",
    fontWeight: 950,
  },

  remainingTimeText: {
    color: "#2f6f28",
    fontSize: "0.9rem",
    fontWeight: 850,
  },

  warningText: {
    color: "#8a5d00",
    fontSize: "0.86rem",
    fontWeight: 900,
  },

  pickupSection: {
    marginTop: "18px",
    background: "#f8f9f4",
    border: "1px solid #dfe8d7",
    borderRadius: "16px",
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

  modalErrorBox: {
    background: "#fdeaea",
    color: "#a32727",
    border: "1px solid #f3b7b7",
    borderRadius: "16px",
    padding: "12px 14px",
    marginBottom: "16px",
    fontWeight: 800,
    fontSize: "0.9rem",
  },
};

export default Reservations;








