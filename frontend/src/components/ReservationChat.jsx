import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ModalPortal from "./ModalPortal";
import { emitWithAck, getChatSocket } from "../services/chatSocket";

const MAX_LENGTH = 1000;
const TYPING_THROTTLE_MS = 2500;
const TYPING_VISIBLE_MS = 3500;

const STATUS_CLOSED_TEXT = {
  COMPLETED: "La entrega se completó: el chat quedó como historial.",
  CANCELLED: "La reserva se canceló: el chat quedó como historial.",
};

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

const formatDay = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";

  return date.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
};

// Chat en tiempo real entre la ONG y el comercio de una reserva (panel lateral).
function ReservationChat({ reservation, productName, currentUser, onClose }) {
  const reservationId = String(reservation.id);
  const isAdmin = currentUser?.role === "ADMIN";

  const [state, setState] = useState("connecting"); // connecting | ready | error
  const [errorMessage, setErrorMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [info, setInfo] = useState(null);
  const [canWrite, setCanWrite] = useState(false);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [offline, setOffline] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const typingTimeoutRef = useRef(null);

  // Conexión: entra a la sala de la reserva y escucha los eventos del chat.
  useEffect(() => {
    const socket = getChatSocket();

    if (!socket) {
      return undefined;
    }

    let active = true;

    const join = async () => {
      const response = await emitWithAck(socket, "chat:join", { reservationId });
      if (!active) return;

      if (!response.ok) {
        setErrorMessage(response.error);
        setState("error");
        return;
      }

      setMessages(response.messages || []);
      setCanWrite(Boolean(response.canWrite));
      setInfo({
        status: response.status,
        ongName: response.ongName,
        supermarketName: response.supermarketName,
      });
      setOffline(false);
      setState("ready");
    };

    const handleMessage = (message) => {
      if (String(message.reservation_id) !== reservationId) return;

      setMessages((current) =>
        current.some((item) => item.id === message.id) ? current : [...current, message]
      );

      if (String(message.sender_id) !== String(currentUser?.id)) {
        setOtherTyping(false);
        if (!isAdmin) socket.emit("chat:read", { reservationId });
      }
    };

    const handleRead = ({ reservationId: id, readerId }) => {
      if (String(id) !== reservationId) return;

      setMessages((current) =>
        current.map((message) =>
          String(message.sender_id) !== String(readerId) && !message.read_at
            ? { ...message, read_at: new Date().toISOString() }
            : message
        )
      );
    };

    const handleTyping = ({ reservationId: id, userId }) => {
      if (String(id) !== reservationId || String(userId) === String(currentUser?.id)) return;

      setOtherTyping(true);
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => setOtherTyping(false), TYPING_VISIBLE_MS);
    };

    const handleStatus = ({ reservationId: id, status }) => {
      if (String(id) !== reservationId) return;

      setInfo((current) => (current ? { ...current, status } : current));
      if (status !== "CONFIRMED") setCanWrite(false);
    };

    const handleDisconnect = () => setOffline(true);

    const handleConnectError = (error) => {
      if (error?.message === "UNAUTHORIZED") {
        setErrorMessage("Tu sesión venció. Volvé a iniciar sesión para usar el chat.");
        setState("error");
      } else {
        setOffline(true);
      }
    };

    socket.on("connect", join);
    socket.on("chat:message", handleMessage);
    socket.on("chat:read", handleRead);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:status", handleStatus);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    if (socket.connected) join();

    return () => {
      active = false;
      window.clearTimeout(typingTimeoutRef.current);
      socket.emit("chat:leave", { reservationId });
      socket.off("connect", join);
      socket.off("chat:message", handleMessage);
      socket.off("chat:read", handleRead);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:status", handleStatus);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, [reservationId, currentUser?.id, isAdmin]);

  // Siempre muestra el último mensaje.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, otherTyping]);

  useEffect(() => {
    if (state === "ready" && canWrite) inputRef.current?.focus();
  }, [state, canWrite]);

  // Escape cierra el panel.
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleDraftChange = (event) => {
    setDraft(event.target.value);
    setSendError("");

    const socket = getChatSocket();
    const now = Date.now();

    if (socket?.connected && now - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
      lastTypingSentRef.current = now;
      socket.emit("chat:typing", { reservationId });
    }
  };

  const handleSend = async (event) => {
    event?.preventDefault();

    const body = draft.trim();
    const socket = getChatSocket();

    if (!body || sending || !socket) return;

    if (!socket.connected) {
      setSendError("Sin conexión. El mensaje se puede enviar cuando vuelva la conexión.");
      return;
    }

    setSending(true);
    const response = await emitWithAck(socket, "chat:send", { reservationId, body });
    setSending(false);

    if (!response.ok) {
      setSendError(response.error);
      if (response.code === "CHAT_CLOSED") setCanWrite(false);
      return;
    }

    setDraft("");
    setMessages((current) =>
      current.some((item) => item.id === response.message.id)
        ? current
        : [...current, response.message]
    );
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    // Enter envía; Shift + Enter hace un salto de línea.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      handleSend(event);
    }
  };

  const otherPartyName = isAdmin
    ? null
    : currentUser?.role === "ONG"
    ? info?.supermarketName || reservation.supermarket_name
    : info?.ongName || reservation.ong_name;

  const closedText = info && STATUS_CLOSED_TEXT[info.status];

  let lastDay = null;

  return (
    <ModalPortal>
      <div className="renova-chat-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <aside
          className="renova-chat-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="renova-chat-title"
        >
          <header className="renova-chat-header">
            <div>
              <p className="renova-chat-eyebrow">{productName}</p>
              <h2 id="renova-chat-title">
                {isAdmin
                  ? `${info?.ongName || reservation.ong_name || "ONG"} · ${info?.supermarketName || reservation.supermarket_name || "Comercio"}`
                  : otherPartyName || "Chat de la reserva"}
              </h2>
              <p className="renova-chat-presence">
                {offline ? (
                  <span className="is-offline">Sin conexión · reintentando…</span>
                ) : otherTyping ? (
                  <span className="is-typing">Escribiendo…</span>
                ) : (
                  <span>{reservation.order_code ? `Pedido ${reservation.order_code}` : "Chat de la reserva"}</span>
                )}
              </p>
            </div>

            <button type="button" className="renova-chat-close" onClick={onClose} aria-label="Cerrar chat">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>

          {isAdmin && state === "ready" && (
            <p className="renova-chat-banner">Vista de administrador: solo lectura.</p>
          )}

          {!isAdmin && closedText && <p className="renova-chat-banner">{closedText}</p>}

          <div className="renova-chat-messages" ref={listRef} aria-live="polite">
            {state === "connecting" && <p className="renova-chat-empty">Conectando…</p>}

            {state === "error" && <p className="renova-chat-empty is-error">{errorMessage}</p>}

            {state === "ready" && messages.length === 0 && (
              <p className="renova-chat-empty">
                {canWrite
                  ? "Todavía no hay mensajes. Coordiná acá el horario o cualquier detalle del retiro."
                  : "Esta reserva no tiene mensajes."}
              </p>
            )}

            {state === "ready" &&
              messages.map((message) => {
                const mine = String(message.sender_id) === String(currentUser?.id);
                const day = formatDay(message.created_at);
                const showDay = day !== lastDay;
                lastDay = day;

                return (
                  <div key={message.id} className="renova-chat-row-wrap">
                    {showDay && <p className="renova-chat-day">{day}</p>}

                    <div className={`renova-chat-row${mine ? " is-mine" : ""}`}>
                      <div className="renova-chat-bubble">
                        {isAdmin && (
                          <span className="renova-chat-sender">
                            {message.sender_name}
                            {isAdmin && message.sender_role === "SUPERMARKET" ? " (comercio)" : ""}
                            {isAdmin && message.sender_role === "ONG" ? " (ONG)" : ""}
                          </span>
                        )}
                        <p>{message.body}</p>
                        <span className="renova-chat-meta">
                          {formatTime(message.created_at)}
                          {mine && (
                            <span className={message.read_at ? "is-read" : ""}>
                              {message.read_at ? " · Leído" : " · Enviado"}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {state === "ready" && canWrite && (
            <form className="renova-chat-form" onSubmit={handleSend}>
              {sendError && <p className="renova-chat-send-error" role="alert">{sendError}</p>}

              <div className="renova-chat-compose">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  maxLength={MAX_LENGTH}
                  placeholder="Escribí un mensaje…"
                  aria-label="Mensaje"
                  onChange={handleDraftChange}
                  onKeyDown={handleKeyDown}
                />

                <button
                  type="submit"
                  className="renova-chat-send"
                  disabled={!draft.trim() || sending}
                  aria-label="Enviar mensaje"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 12 20 4l-6 16-3-7-7-1Z" />
                  </svg>
                </button>
              </div>

              {draft.length > MAX_LENGTH - 100 && (
                <span className="renova-chat-counter">{MAX_LENGTH - draft.length} caracteres restantes</span>
              )}
            </form>
          )}
        </aside>
      </div>
    </ModalPortal>
  );
}

export default ReservationChat;
