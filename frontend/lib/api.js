import axios from "axios";

const FALLBACK_API_URL =
  "https://api.ayaxapis.com/api/v1";

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  FALLBACK_API_URL;

const API_BASE_URL = String(rawApiUrl)
  .trim()
  .replace(/\/+$/, "");

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-otp",
];

const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/login/verify-otp",
  "/auth/login/resend-otp",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

const SESSION_ERROR_CODES = new Set([
  "TOKEN_REQUIRED",
  "TOKEN_EXPIRED",
  "TOKEN_REVOKED",
  "INVALID_TOKEN",
  "INVALID_TOKEN_ID",
  "INVALID_TOKEN_TYPE",
  "INVALID_TOKEN_SUBJECT",
  "TOKEN_NOT_ACTIVE",
  "PASSWORD_CHANGED",
  "ACCOUNT_NOT_FOUND",
]);

const normalizeRequestUrl = (url) => {
  if (typeof url !== "string") {
    return url;
  }

  /*
   * baseURL already contains /api/v1.
   *
   * /api/v1/wallet becomes /wallet.
   */
  return url.replace(
    /^\/api\/v1(?=\/|$)/,
    ""
  );
};

const getStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  return token?.trim() || null;
};

const getStoredUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");

    if (!rawUser) {
      return null;
    }

    return JSON.parse(rawUser);
  } catch (error) {
    console.error(
      "Unable to read stored user:",
      error
    );

    return null;
  }
};

const clearStoredSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("auth");
  localStorage.removeItem(
    "currentUser"
  );

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("auth");
  sessionStorage.removeItem(
    "currentUser"
  );

  sessionStorage.removeItem(
    "loginOtpSession"
  );

  sessionStorage.removeItem(
    "developmentLoginOtp"
  );
};

const isPublicPage = (pathname) => {
  return PUBLIC_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(
        `${path}/`
      )
  );
};

const isAuthEndpoint = (
  requestUrl
) => {
  const normalizedUrl =
    normalizeRequestUrl(
      requestUrl
    ) || "";

  return AUTH_ENDPOINTS.some(
    (endpoint) =>
      normalizedUrl === endpoint ||
      normalizedUrl.startsWith(
        `${endpoint}?`
      )
  );
};

const redirectToLogin = () => {
  if (typeof window === "undefined") {
    return;
  }

  const currentPath =
    window.location.pathname;

  if (isPublicPage(currentPath)) {
    return;
  }

  const redirectTarget =
    `${currentPath}${window.location.search}`;

  const loginUrl =
    `/login?redirect=${encodeURIComponent(
      redirectTarget
    )}`;

  window.location.replace(
    loginUrl
  );
};

const api = axios.create({
  baseURL: API_BASE_URL,

  /*
   * Render free instances may require
   * extra time to wake from sleep.
   */
  timeout: 90000,

  headers: {
    Accept: "application/json",
    "Content-Type":
      "application/json",
  },

  /*
   * JWT currently comes through Authorization,
   * not an authentication cookie.
   */
  withCredentials: false,
});

/* ======================================================
   REQUEST INTERCEPTOR
====================================================== */

api.interceptors.request.use(
  (config) => {
    config.url =
      normalizeRequestUrl(
        config.url
      );

    config.headers =
      config.headers || {};

    const token =
      getStoredToken();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    /*
     * Useful for request tracing.
     */
    if (
      typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"
    ) {
      config.headers[
        "x-request-id"
      ] = crypto.randomUUID();
    }

    return config;
  },

  (error) => {
    return Promise.reject(
      error
    );
  }
);

/* ======================================================
   RESPONSE INTERCEPTOR
====================================================== */

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const response =
      error.response;

    const status =
      response?.status;

    const responseCode =
      response?.data?.code;

    const responseMessage =
      response?.data?.message;

    const requestUrl =
      error.config?.url || "";

    if (!response) {
      console.error(
        "API Network Error",
        {
          message:
            error.message,

          code:
            error.code,

          baseURL:
            error.config?.baseURL,

          requestURL:
            requestUrl,

          method:
            error.config?.method,
        }
      );

      if (
        error.code ===
          "ECONNABORTED" ||
        error.code ===
          "ETIMEDOUT"
      ) {
        error.userMessage =
          "Server response is taking too long. Please try again.";
      } else if (
        typeof navigator !==
          "undefined" &&
        navigator.onLine === false
      ) {
        error.userMessage =
          "You appear to be offline. Check your internet connection.";
      } else {
        error.userMessage =
          "Unable to connect to the server. Please try again.";
      }

      return Promise.reject(
        error
      );
    }

    console.error(
      "API Response Error",
      {
        status,
        code:
          responseCode,

        message:
          responseMessage,

        response:
          response.data,

        url:
          requestUrl,

        method:
          error.config?.method,
      }
    );

    error.userMessage =
      responseMessage ||
      "The request could not be completed.";

    /*
     * Kada login/OTP request ya jawo
     * unnecessary redirect loop.
     */
    const authenticationRequest =
      isAuthEndpoint(
        requestUrl
      );

    const sessionIsInvalid =
      status === 401 &&
      (
        SESSION_ERROR_CODES.has(
          responseCode
        ) ||
        !authenticationRequest
      );

    if (
      typeof window !==
        "undefined" &&
      sessionIsInvalid
    ) {
      clearStoredSession();

      window.dispatchEvent(
        new CustomEvent(
          "ayax:session-expired",
          {
            detail: {
              code:
                responseCode ||
                "UNAUTHORIZED",

              message:
                responseMessage ||
                "Your session has expired.",
            },
          }
        )
      );

      redirectToLogin();
    }

    /*
     * Account blocked or suspended.
     */
    if (
      typeof window !==
        "undefined" &&
      status === 403 &&
      responseCode ===
        "ACCOUNT_NOT_ACTIVE"
    ) {
      clearStoredSession();

      window.dispatchEvent(
        new CustomEvent(
          "ayax:account-disabled",
          {
            detail: {
              code:
                responseCode,

              message:
                responseMessage,
            },
          }
        )
      );

      redirectToLogin();
    }

    /*
     * Rate limit information.
     */
    if (status === 429) {
      const retryAfter =
        response.headers?.[
          "retry-after"
        ];

      error.retryAfter =
        retryAfter || null;

      error.userMessage =
        responseMessage ||
        "Too many requests. Please wait and try again.";
    }

    return Promise.reject(
      error
    );
  }
);

export {
  API_BASE_URL,
  getStoredToken,
  getStoredUser,
  clearStoredSession,
};

export default api;