import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { confirmPickup, getPickup } from "../services/reservationService";
import logo from "../assets/renova-logo-login.png";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

// Página que abre quien retira al escanear el QR del comercio. Pensada para
// celular: pide iniciar sesión con la cuenta de la ONG (solo la ONG dueña de la
// reserva puede confirmarla) y confirma el retiro con un toque.
function PickupConfirm() {
  const { token } = useParams();
  const navigate = useNavigate();

  const user = readUser();
  const hasSession = Boolean(localStorage.getItem("token"));
  const isOng = user?.role === "ONG";

  const [reservation, setReservation] = useState(null);
  // loading | ready | done | error
  const [state, setState] = useState(hasSession && isOng ? "loading" : "login");
  const [errorMessage, setErrorMessage] = useState("");
  const [canSwitchAccount, setCanSwitchAccount] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  const goToLogin = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate(`/login?next=${encodeURIComponent(`/retiro/${token}`)}`);
  };

  const showError = (err, fallback) => {
    setErrorMessage(err.response?.data?.error || fallback);
    setCanSwitchAccount(err.response?.data?.code === "OTHER_ONG");
    setState("error");
  };

  useEffect(() => {
    if (!hasSession || !isOng) return undefined;

    let cancelled = false;

    getPickup(token)
      .then((data) => {
        if (cancelled) return;
        setReservation(data.reservation);
        setState(data.reservation?.status === "COMPLETED" ? "done" : "ready");
      })
      .catch((err) => {
        if (!cancelled) {
          showError(err, "No pudimos abrir el retiro. Revisá tu conexión y volvé a escanear el QR.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, hasSession, isOng]);

  const handleConfirm = async () => {
    if (sendingRef.current) return;

    try {
      sendingRef.current = true;
      setSending(true);

      const data = await confirmPickup(token);

      setReservation(data.reservation || reservation);
      setState("done");
    } catch (err) {
      showError(err, "No se pudo confirmar. Probá de nuevo.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <div className="renova-pickup-page">
      <main className="renova-pickup-card">
        <header className="renova-pickup-brand">
          <img src={logo} alt="ReNova" />
        </header>

        {state === "login" && (
          <section className="renova-pickup-status">
            <div className="renova-pickup-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </div>
            <h1>Confirmá tu retiro</h1>
            <p>
              {hasSession
                ? `Estás con la cuenta de ${user?.name || "otro usuario"}, que no es una organización. Para confirmar el retiro, iniciá sesión con la cuenta de la ONG que hizo la reserva.`
                : "Para confirmar el retiro, iniciá sesión con la cuenta de la ONG que hizo la reserva. Así nadie más puede llevarse el pedido."}
            </p>
            <button type="button" className="renova-pickup-button" onClick={goToLogin}>
              {hasSession ? "Cambiar de cuenta" : "Iniciar sesión"}
            </button>
          </section>
        )}

        {state === "loading" && <p className="renova-pickup-muted">Cargando el retiro...</p>}

        {state === "error" && (
          <section className="renova-pickup-status is-error">
            <div className="renova-pickup-icon" aria-hidden="true">!</div>
            <h1>No se puede confirmar</h1>
            <p>{errorMessage}</p>
            {canSwitchAccount && (
              <button type="button" className="renova-pickup-button" onClick={goToLogin}>
                Cambiar de cuenta
              </button>
            )}
          </section>
        )}

        {state === "done" && (
          <section className="renova-pickup-status is-done">
            <div className="renova-pickup-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 12.5 10 17l9-10" />
              </svg>
            </div>
            <h1>¡Retiro confirmado!</h1>
            <p>
              Ya podés llevarte <strong>{reservation?.product_name}</strong>. Gracias por
              ayudar a que la comida llegue a quien la necesita.
            </p>
            {reservation?.order_code && (
              <p className="renova-pickup-code">Pedido {reservation.order_code}</p>
            )}
          </section>
        )}

        {state === "ready" && reservation && (
          <>
            <p className="renova-pickup-eyebrow">Confirmá tu retiro</p>
            <h1 className="renova-pickup-title">{reservation.product_name}</h1>

            <dl className="renova-pickup-details">
              <div>
                <dt>Cantidad</dt>
                <dd>
                  {reservation.quantity} {reservation.unit || ""}
                </dd>
              </div>
              <div>
                <dt>Comercio</dt>
                <dd>{reservation.supermarket_name}</dd>
              </div>
              <div>
                <dt>Organización</dt>
                <dd>{reservation.ong_name}</dd>
              </div>
              {reservation.pickup_person_name && (
                <div>
                  <dt>Retira</dt>
                  <dd>{reservation.pickup_person_name}</dd>
                </div>
              )}
            </dl>

            <button
              type="button"
              className="renova-pickup-button"
              onClick={handleConfirm}
              disabled={sending}
            >
              {sending ? "Confirmando..." : "Recibí el pedido"}
            </button>

            <p className="renova-pickup-muted">
              Confirmá solo cuando tengas el pedido en la mano.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

export default PickupConfirm;
