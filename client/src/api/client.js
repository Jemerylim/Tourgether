import axios from "axios";
import { API_URL } from "../config";
import { getToken } from "./session";

// Every request to the backend goes through this instance: it knows the base URL and
// attaches the signed-in user's token, so callers never build an Authorization header.
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
