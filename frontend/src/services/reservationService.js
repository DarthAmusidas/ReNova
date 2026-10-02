import api from "../api/api";

export const createReservation = async (reservationData) => {
  const response = await api.post("/reservations", reservationData);
  return response.data;
};

export const getReservations = async () => {
  const response = await api.get("/reservations");
  return response.data;
};

export const updateReservationStatus = async (
  reservationId,
  status,
  extraData = {}
) => {
  const response = await api.put(`/reservations/${reservationId}/status`, {
    status,
    ...extraData,
  });

  return response.data;
};

// Entrega con QR
export const createPickupQr = async (reservationId) => {
  const response = await api.post(`/reservations/${reservationId}/pickup-qr`);
  return response.data;
};

export const getPickup = async (token) => {
  const response = await api.get(`/pickup/${encodeURIComponent(token)}`);
  return response.data;
};

export const confirmPickup = async (token) => {
  const response = await api.post(`/pickup/${encodeURIComponent(token)}/confirm`);
  return response.data;
};
