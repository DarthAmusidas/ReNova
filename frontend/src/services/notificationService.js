import api from "../api/api";

export const getNotifications = async () => {
  const response = await api.get("/notifications");
  return response.data;
};

export const markNotificationsAsRead = async () => {
  const response = await api.put("/notifications/read/all");
  return response.data;
};