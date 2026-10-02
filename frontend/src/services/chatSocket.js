import { io } from "socket.io-client";
import api, { API_URL } from "../api/api";

// Una sola conexión de Socket.IO por sesión, compartida por toda la app.
let socket = null;
let socketToken = null;

export const getChatSocket = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    disconnectChatSocket();
    return null;
  }

  // Cambió la sesión (otro usuario): se reconecta con el token nuevo.
  if (socket && socketToken === token) return socket;

  disconnectChatSocket();

  socketToken = token;
  socket = io(API_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  return socket;
};

export const disconnectChatSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = null;
  socketToken = null;
};

// Envía un evento y espera la respuesta del servidor (con tiempo límite).
export const emitWithAck = (activeSocket, event, payload, timeoutMs = 10000) =>
  new Promise((resolve) => {
    activeSocket
      .timeout(timeoutMs)
      .emit(event, payload, (error, response) => {
        if (error) {
          resolve({ ok: false, error: "Sin respuesta del servidor. Revisá tu conexión." });
        } else {
          resolve(response || { ok: false, error: "Respuesta inválida del servidor." });
        }
      });
  });

export const getChatSummary = async () => {
  const response = await api.get("/reservations/chat/summary");
  return response.data?.summary || {};
};
