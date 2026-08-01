"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import Link from "next/link";
import Image from "next/image";

import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

import api from "@/lib/api";

/* ======================================================
   CONSTANTS
====================================================== */

const OTP_LENGTH = 6;
const DEFAULT_EXPIRY_SECONDS = 600;
const RESEND_COOLDOWN_SECONDS = 60;

/* ======================================================
   HELPERS
====================================================== */

const formatTime = (seconds) => {
  const safeSeconds = Math.max(
    Number(seconds) || 0,
    0
  );

  const minutes = Math.floor(
    safeSeconds / 60
  );

  const remainingSeconds =
    safeSeconds % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
};

const getSecondsUntil = (
  dateValue,
  fallbackSeconds
) => {
  if (!dateValue) {
    return fallbackSeconds;
  }

  const targetTime =
    new Date(dateValue).getTime();

  if (
    Number.isNaN(targetTime)
  ) {
    return fallbackSeconds;
  }

  return Math.max(
    Math.floor(
      (targetTime - Date.now()) /
        1000
    ),
    0
  );
};

const redirectByRole = (
  router,
  user,
  requestedRedirect
) => {
  if (
    requestedRedirect &&
    requestedRedirect.startsWith("/") &&
    !requestedRedirect.startsWith("//")
  ) {
    router.replace(
      requestedRedirect
    );

    router.refresh();

    return;
  }

  const role = String(
    user?.role || "CUSTOMER"
  ).toUpperCase();

  switch (role) {
    case "SUPER_ADMIN":
      router.replace(
        "/super-admin"
      );
      break;

    case "ADMIN":
      router.replace("/admin");
      break;

    case "STAFF_ADMIN":
      router.replace(
        "/staff-admin"
      );
      break;

    case "CUSTOMER_SERVICE":
      router.replace(
        "/customer-service"
      );
      break;

    default:
      router.replace(
        "/dashboard"
      );
  }

  router.refresh();
};

/* ======================================================
   VERIFY OTP PAGE
====================================================== */

export default function VerifyOtpPage() {
  const router = useRouter();

  const inputRefs = useRef([]);

  const [otpSession, setOtpSession] =
    useState(null);

  const [otp, setOtp] = useState(
    Array(OTP_LENGTH).fill("")
  );

  const [expirySeconds, setExpirySeconds] =
    useState(DEFAULT_EXPIRY_SECONDS);

  const [
    resendSeconds,
    setResendSeconds,
  ] = useState(
    RESEND_COOLDOWN_SECONDS
  );

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const otpCode = useMemo(
    () => otp.join(""),
    [otp]
  );

  /* ======================================================
     LOAD OTP SESSION
  ====================================================== */

  useEffect(() => {
    const storedSession =
      sessionStorage.getItem(
        "loginOtpSession"
      );

    if (!storedSession) {
      router.replace("/login");
      return;
    }

    try {
      const parsedSession =
        JSON.parse(storedSession);

      if (
        !parsedSession?.userId ||
        !parsedSession?.otpId
      ) {
        throw new Error(
          "Invalid OTP session."
        );
      }

      setOtpSession(
        parsedSession
      );

      setExpirySeconds(
        getSecondsUntil(
          parsedSession.expiresAt,
          Number(
            parsedSession.expiresInSeconds
          ) ||
            DEFAULT_EXPIRY_SECONDS
        )
      );

      setResendSeconds(
        RESEND_COOLDOWN_SECONDS
      );

      const developmentOtp =
        sessionStorage.getItem(
          "developmentLoginOtp"
        );

      if (
        developmentOtp &&
        /^\d{6}$/.test(
          developmentOtp
        )
      ) {
        setOtp(
          developmentOtp.split("")
        );
      }
    } catch (error) {
      console.error(
        "Invalid OTP session:",
        error
      );

      sessionStorage.removeItem(
        "loginOtpSession"
      );

      router.replace("/login");
    }
  }, [router]);

  /* ======================================================
     EXPIRY COUNTDOWN
  ====================================================== */

  useEffect(() => {
    if (
      !otpSession ||
      expirySeconds <= 0
    ) {
      return;
    }

    const timer = setInterval(() => {
      setExpirySeconds(
        (current) =>
          Math.max(current - 1, 0)
      );
    }, 1000);

    return () =>
      clearInterval(timer);
  }, [
    otpSession,
    expirySeconds,
  ]);

  /* ======================================================
     RESEND COUNTDOWN
  ====================================================== */

  useEffect(() => {
    if (
      !otpSession ||
      resendSeconds <= 0
    ) {
      return;
    }

    const timer = setInterval(() => {
      setResendSeconds(
        (current) =>
          Math.max(current - 1, 0)
      );
    }, 1000);

    return () =>
      clearInterval(timer);
  }, [
    otpSession,
    resendSeconds,
  ]);

  /* ======================================================
     OTP INPUT HANDLERS
  ====================================================== */

  const updateOtpValue = (
    index,
    value
  ) => {
    const digit = String(value)
      .replace(/\D/g, "")
      .slice(-1);

    const updatedOtp = [...otp];

    updatedOtp[index] = digit;

    setOtp(updatedOtp);
    setErrorMessage("");
    setSuccessMessage("");

    if (
      digit &&
      index < OTP_LENGTH - 1
    ) {
      inputRefs.current[
        index + 1
      ]?.focus();
    }
  };

  const handleKeyDown = (
    index,
    event
  ) => {
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      inputRefs.current[
        index - 1
      ]?.focus();
    }

    if (
      event.key === "ArrowLeft" &&
      index > 0
    ) {
      inputRefs.current[
        index - 1
      ]?.focus();
    }

    if (
      event.key === "ArrowRight" &&
      index < OTP_LENGTH - 1
    ) {
      inputRefs.current[
        index + 1
      ]?.focus();
    }
  };

  const handlePaste = (
    event
  ) => {
    event.preventDefault();

    const pastedCode =
      event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, OTP_LENGTH);

    if (!pastedCode) {
      return;
    }

    const updatedOtp =
      Array(OTP_LENGTH).fill("");

    pastedCode
      .split("")
      .forEach(
        (digit, index) => {
          updatedOtp[index] =
            digit;
        }
      );

    setOtp(updatedOtp);
    setErrorMessage("");

    const focusIndex =
      Math.min(
        pastedCode.length,
        OTP_LENGTH - 1
      );

    inputRefs.current[
      focusIndex
    ]?.focus();
  };

  /* ======================================================
     VERIFY OTP
  ====================================================== */

  const handleVerifyOtp = async (
    event
  ) => {
    event.preventDefault();

    if (
      loading ||
      !otpSession
    ) {
      return;
    }

    if (
      expirySeconds <= 0
    ) {
      setErrorMessage(
        "This verification code has expired. Request a new code."
      );

      return;
    }

    if (
      !/^\d{6}$/.test(
        otpCode
      )
    ) {
      setErrorMessage(
        "Enter the complete 6-digit verification code."
      );

      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response =
        await api.post(
          "/auth/login/verify-otp",
          {
            userId:
              otpSession.userId,

            otpId:
              otpSession.otpId,

            code: otpCode,
          }
        );

      const data =
        response?.data || {};

      const token =
        data.token;

      const user =
        data.user;

      if (
        !token ||
        !user?.id
      ) {
        throw new Error(
          "Invalid OTP verification response from server."
        );
      }
      console.log("========== LOGIN USER ==========");
      console.log("TOKEN:", token);
      console.log("USER:", user);
      console.log("ROLE:", user.role);
      console.log("================================");

      const storage =
        otpSession.rememberMe
          ? localStorage
          : sessionStorage;

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      sessionStorage.removeItem(
        "token"
      );

      sessionStorage.removeItem(
        "user"
      );

      storage.setItem(
        "token",
        token
      );

      storage.setItem(
        "user",
        JSON.stringify(user)
      );
      console.log(
  "LOCAL USER:",
  JSON.parse(
    storage.getItem("user")
  )
);

      sessionStorage.removeItem(
        "loginOtpSession"
      );

      sessionStorage.removeItem(
        "developmentLoginOtp"
      );

      setSuccessMessage(
        "Verification successful. Redirecting..."
      );

      setTimeout(() => {
        redirectByRole(
          router,
          user,
          otpSession.redirect
        );
      }, 500);
    } catch (error) {
      console.error(
        "OTP verification error:",
        {
          status:
            error?.response
              ?.status,

          code:
            error?.response?.data
              ?.code,

          response:
            error?.response
              ?.data,

          message:
            error?.message,
        }
      );

      const remainingAttempts =
        error?.response?.data
          ?.remainingAttempts;

      const message =
        error?.userMessage ||
        error?.response?.data
          ?.message ||
        error?.message ||
        "Unable to verify the code.";

      if (
        Number.isInteger(
          remainingAttempts
        )
      ) {
        setErrorMessage(
          `${message} ${remainingAttempts} attempt(s) remaining.`
        );
      } else {
        setErrorMessage(
          message
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     RESEND OTP
  ====================================================== */

  const handleResendOtp = async () => {
    if (
      !otpSession ||
      resending ||
      resendSeconds > 0
    ) {
      return;
    }

    try {
      setResending(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response =
        await api.post(
          "/auth/login/resend-otp",
          {
            userId:
              otpSession.userId,

            otpId:
              otpSession.otpId,
          }
        );

      const data =
        response?.data || {};

      if (
        !data.otpId ||
        !data.userId
      ) {
        throw new Error(
          "Invalid resend OTP response from server."
        );
      }

      const updatedSession = {
        ...otpSession,

        userId:
          data.userId,

        otpId:
          data.otpId,

        maskedEmail:
          data.maskedEmail ||
          otpSession.maskedEmail,

        expiresAt:
          data.expiresAt ||
          null,

        expiresInSeconds:
          Number(
            data.expiresInSeconds ||
              DEFAULT_EXPIRY_SECONDS
          ),

        createdAt:
          new Date().toISOString(),
      };

      sessionStorage.setItem(
        "loginOtpSession",
        JSON.stringify(
          updatedSession
        )
      );

      setOtpSession(
        updatedSession
      );

      setOtp(
        Array(OTP_LENGTH).fill("")
      );

      setExpirySeconds(
        getSecondsUntil(
          updatedSession.expiresAt,
          updatedSession.expiresInSeconds
        )
      );

      setResendSeconds(
        RESEND_COOLDOWN_SECONDS
      );

      if (
        data.developmentOtp
      ) {
        sessionStorage.setItem(
          "developmentLoginOtp",
          String(
            data.developmentOtp
          )
        );

        setOtp(
          String(
            data.developmentOtp
          ).split("")
        );
      } else {
        sessionStorage.removeItem(
          "developmentLoginOtp"
        );
      }

      setSuccessMessage(
        "A new verification code has been sent."
      );

      inputRefs.current[0]?.focus();
    } catch (error) {
      console.error(
        "Resend OTP error:",
        {
          status:
            error?.response
              ?.status,

          code:
            error?.response?.data
              ?.code,

          response:
            error?.response
              ?.data,

          message:
            error?.message,
        }
      );

      const retryAfter = Number(
        error?.response?.data
          ?.retryAfter
      );

      if (
        Number.isFinite(
          retryAfter
        ) &&
        retryAfter > 0
      ) {
        setResendSeconds(
          retryAfter
        );
      }

      setErrorMessage(
        error?.userMessage ||
          error?.response?.data
            ?.message ||
          error?.message ||
          "Unable to resend the verification code."
      );
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = () => {
    sessionStorage.removeItem(
      "loginOtpSession"
    );

    sessionStorage.removeItem(
      "developmentLoginOtp"
    );
  };

  if (!otpSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading verification...
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-3"
        >
          <Image
            src="/assets/logo.png"
            alt="Ayax Logo"
            width={50}
            height={50}
            priority
          />

          <div>
            <h1 className="text-2xl font-bold">
              Ayax{" "}
              <span className="text-blue-500">
                APIs
              </span>
            </h1>

            <p className="text-sm text-slate-400">
              Login Security
            </p>
          </div>
        </Link>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
          <ShieldCheck size={34} />
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold">
          Verify Your Login
        </h2>

        <p className="mt-3 text-center text-slate-400">
          Enter the 6-digit code sent
          to{" "}
          <span className="font-semibold text-slate-200">
            {otpSession.maskedEmail ||
              otpSession.email}
          </span>
          .
        </p>

        {errorMessage && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-300">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-300">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0"
            />

            <span>
              {successMessage}
            </span>
          </div>
        )}

        <form
          onSubmit={handleVerifyOtp}
          className="mt-8"
        >
          <div
            className="flex justify-center gap-2 sm:gap-3"
            onPaste={handlePaste}
          >
            {otp.map(
              (digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[
                      index
                    ] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={
                    index === 0
                      ? "one-time-code"
                      : "off"
                  }
                  maxLength={1}
                  value={digit}
                  disabled={
                    loading ||
                    expirySeconds <= 0
                  }
                  onChange={(event) =>
                    updateOtpValue(
                      index,
                      event.target.value
                    )
                  }
                  onKeyDown={(
                    event
                  ) =>
                    handleKeyDown(
                      index,
                      event
                    )
                  }
                  aria-label={`OTP digit ${
                    index + 1
                  }`}
                  className="h-14 w-11 rounded-xl border border-slate-700 bg-slate-950 text-center text-2xl font-bold outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:h-16 sm:w-12"
                />
              )
            )}
          </div>

          <div className="mt-5 text-center">
            {expirySeconds > 0 ? (
              <p className="text-sm text-slate-400">
                Code expires in{" "}
                <span className="font-semibold text-blue-400">
                  {formatTime(
                    expirySeconds
                  )}
                </span>
              </p>
            ) : (
              <p className="text-sm font-medium text-red-400">
                This code has expired.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              expirySeconds <= 0 ||
              otpCode.length !==
                OTP_LENGTH
            }
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Verifying..."
              : "Verify and Login"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Didn&apos;t receive the
            code?
          </p>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={
              resending ||
              resendSeconds > 0
            }
            className="mt-2 inline-flex items-center gap-2 font-semibold text-blue-400 transition hover:text-blue-300 disabled:cursor-not-allowed disabled:text-slate-500"
          >
            <RefreshCw
              size={17}
              className={
                resending
                  ? "animate-spin"
                  : ""
              }
            />

            {resending
              ? "Sending..."
              : resendSeconds > 0
              ? `Resend in ${resendSeconds}s`
              : "Resend Code"}
          </button>
        </div>

        <div className="mt-7 border-t border-slate-800 pt-6 text-center">
          <Link
            href="/login"
            onClick={
              handleBackToLogin
            }
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}