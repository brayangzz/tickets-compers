import { API_BASE_URL } from "../config/api";
import { normalizeLoginResponse } from "../utils/auth";

const API_URL = API_BASE_URL;

export const loginUser = async (sUser: string, sPass: string) => {
  const response = await fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sUser,
      sPass,
    }),
  });

  if (!response.ok) {
    throw new Error("Credenciales incorrectas o error en el servidor");
  }

  const data = await response.json().catch(() => ({}));
  return normalizeLoginResponse(data);
};
