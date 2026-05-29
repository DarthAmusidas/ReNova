import api from "../api/api";

export const getUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};