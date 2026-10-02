import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import ModalPortal from "./ModalPortal";
import { createPickupQr, getPickup } from "../services/reservationService";
import { pageStyles as styles } from "../styles/pageStyles";

// Cada cuánto se consulta si quien retira ya confirmó desde su celular.
const POLL_INTERVAL_MS = 3000;

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
};

// El comercio muestra este QR en el mostrador. Quien retira lo escanea con la
// cámara del celular, se abre /retiro/:token, inicia sesión con la cuenta de la
// ONG y confirma.
function PickupQrModal({ reservation, productName, onClose, onCompleted, onUseCode }) {
  const [qr, setQr] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const completedRef = useRef(false);
  // En un ref para que un callback nuevo del padre no reinicie la espera.
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  // Pide un token nuevo al backend y arma la imagen del QR.
  const fetchQr = useCallback(async () => {
    const data = await createPickupQr(reservation.id);
    const url = `${window.location.origin}/retiro/${data.token}`;
    const image = await QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0f2a14", light: "#ffffff" },
    });

    return {
      token: data.token,
      url,
      image,
      expiresAt: new Date(data.expires_at).getTime(),
    };
  }, [reservation.id]);

  const applyResult = useCallback((promise) => {
    return promise
      .then((nextQr) => {
        setQr(nextQr);
        setNow(Date.now());
      })
      .catch((err) => {
        console.error("Error generando QR de retiro:", err);
        setError(
          err.response?.data?.error || "No se pudo generar el QR. Probá de nuevo."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    applyResult(fetchQr());
  }, [applyResult, fetchQr]);

  const generate = () => {
    setLoading(true);
    setError("");
    applyResult(fetchQr());
  };

  const expired = Boolean(qr) && now >= qr.expiresAt;

  // Cuenta regresiva del QR.
  useEffect(() => {
    if (!qr || completed) return undefined;

    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [qr, completed]);

  // Espera la confirmación desde el celular.
  useEffect(() => {
    if (!qr || completed || expired) return undefined;

    const intervalId = setInterval(async () => {
      try {
        const data = await getPickup(qr.token);

        if (data?.reservation?.status === "COMPLETED" && !completedRef.current) {
          completedRef.current = true;
          setCompleted(true);
          onCompletedRef.current?.();
        }
      } catch {
        // Un error de red puntual no corta la espera: se reintenta solo.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [qr, completed, expired]);

  const pickupPerson = reservation.pickup_person_name || "la persona que retira";

  return (
    <ModalPortal>
      <div style={styles.modalOverlay}>
        <div
          style={styles.modalCard}
          className="renova-inline-modal renova-qr-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="renova-qr-title"
        >
          {completed ? (
            <div className="renova-qr-done">
              <div className="renova-qr-done-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M5 12.5 10 17l9-10" />
                </svg>
              </div>
              <h2 id="renova-qr-title" style={styles.modalTitle}>Entrega completada</h2>
              <p style={styles.modalText}>
                {pickupPerson} confirmó el retiro de <strong>{productName}</strong>.
                La reserva quedó completada y la ONG recibió una notificación.
              </p>
              <div style={styles.modalActions}>
                <button type="button" style={styles.primaryButton} onClick={onClose}>
                  Listo
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 id="renova-qr-title" style={styles.modalTitle}>Entregar con QR</h2>

              <ol className="renova-qr-steps">
                <li>Pedile a <strong>{pickupPerson}</strong> que abra la cámara del celular.</li>
                <li>Que escanee este código.</li>
                <li>Inicia sesión con la cuenta de la ONG y confirma. Esta pantalla se actualiza sola.</li>
              </ol>

              <div className={`renova-qr-frame${expired ? " is-expired" : ""}`}>
                {loading && <span className="renova-qr-placeholder">Generando QR...</span>}

                {!loading && error && (
                  <span className="renova-qr-placeholder is-error">{error}</span>
                )}

                {!loading && !error && qr && (
                  <img src={qr.image} alt={`Código QR para retirar ${productName}`} />
                )}

                {expired && !loading && (
                  <div className="renova-qr-expired">
                    <strong>El QR venció</strong>
                    <button type="button" className="renova-rbtn renova-rbtn-primary" onClick={generate}>
                      Generar otro
                    </button>
                  </div>
                )}
              </div>

              <div className="renova-qr-meta">
                <span>
                  <strong>{productName}</strong> · {reservation.quantity_reserved}{" "}
                  {reservation.unit || ""}
                </span>

                {qr && !expired && (
                  <span className="renova-qr-timer">
                    <span className="renova-qr-pulse" aria-hidden="true" />
                    Esperando confirmación · vence en {formatCountdown(qr.expiresAt - now)}
                  </span>
                )}
              </div>

              {error && !loading && (
                <button type="button" className="renova-rbtn renova-rbtn-ghost" onClick={generate}>
                  Reintentar
                </button>
              )}

              <div style={styles.modalActions} className="renova-qr-actions">
                <button type="button" className="renova-qr-link" onClick={onUseCode}>
                  ¿No puede escanear? Validar con número de pedido
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  className="renova-inline-secondary"
                  onClick={onClose}
                >
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

export default PickupQrModal;
