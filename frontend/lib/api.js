import axios from "axios";

const FALLBACK_API_URL =
  "https://ayax-api-marketplace.onrender.com/api/v1";

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  FALLBACK_API_URL;

const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,

  /*
   * Render free instance na iya ɗaukar lokaci
   * kafin ya farka daga sleep.
   */
  timeout: 90000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },

  withCredentials: false,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");

      if (token) {
        config.headers =
          config.headers || {};

        config.headers.Authorization =
          `Bearer ${token}`;
      }
    }

    /*
     * Yana hana URL kamar:
     * /api/v1/api/v1/wallet
     *
     * Tunda baseURL ya riga yana dauke da /api/v1,
     * request paths su zama /wallet, /auth/me, da sauransu.
     */
    if (
      typeof config.url === "string" &&
      config.url.startsWith("/api/v1/")
    ) {
      config.url = config.url.replace(
        /^\/api\/v1/,
        ""
      );
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;

    if (!error.response) {
      console.error("API Network Error", {
        message: error.message,
        code: error.code,
        baseURL: error.config?.baseURL,
        requestURL: error.config?.url,
        method: error.config?.method,
      });

      error.userMessage =
        error.code === "ECONNABORTED"
          ? "Server response is taking too long. Please try again."
          : "Unable to connect to the server. Check the backend and CORS configuration.";
    } else {
      console.error("API Response Error", {
        status,
        message:
          error.response?.data?.message,
        response:
          error.response?.data,
        url: error.config?.url,
      });

      error.userMessage =
        error.response?.data?.message ||
        "The request could not be completed.";
    }

    if (
      typeof window !== "undefined" &&
      status === 401
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const currentPath =
        window.location.pathname;

      const publicPaths = [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
      ];

      if (
        !publicPaths.includes(currentPath)
      ) {
        window.location.replace(
          "/login"
        );
      }
    }

    return Promise.reject(error);
  }
);

export {
  API_BASE_URL,
};

export default api;