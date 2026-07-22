"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ShieldCheck,
  Search,
  Printer,
  RefreshCcw,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  User,
  Hash,
  Phone,
  CalendarDays,
  MapPin,
  FileText,
  Wallet,
  X,
  Download,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const maskBvn = (value = "") => {
  const digits = String(value).replace(/\D/g, "");

  if (digits.length !== 11) {
    return "***********";
  }

  return `${digits.slice(0, 3)}*****${digits.slice(-3)}`;
};

const normalizeGender = (value) => {
  const gender = String(value || "").trim().toUpperCase();

  if (gender === "M" || gender === "MALE") {
    return "Male";
  }

  if (gender === "F" || gender === "FEMALE") {
    return "Female";
  }

  return value || "-";
};

const normalizeBvnRecord = (source = {}) => ({
  reference:
    source.reference ||
    source.transactionReference ||
    source.requestReference ||
    source.requestId ||
    "",

  bvn:
    source.bvn ||
    source.bvnNumber ||
    "",

  firstName:
    source.firstName ||
    source.firstname ||
    "",

  middleName:
    source.middleName ||
    source.middlename ||
    "",

  lastName:
    source.lastName ||
    source.lastname ||
    source.surname ||
    "",

  fullName:
    source.fullName ||
    source.name ||
    [
      source.firstName || source.firstname,
      source.middleName || source.middlename,
      source.lastName ||
        source.lastname ||
        source.surname,
    ]
      .filter(Boolean)
      .join(" "),

  phoneNumber:
    source.phoneNumber ||
    source.phone ||
    source.mobile ||
    "",

  dateOfBirth:
    source.dateOfBirth ||
    source.dob ||
    source.birthDate ||
    "",

  gender: normalizeGender(
    source.gender ||
      source.sex
  ),

  stateOfOrigin:
    source.stateOfOrigin ||
    source.state ||
    "",

  localGovernment:
    source.localGovernment ||
    source.lga ||
    source.lgaOfOrigin ||
    "",

  residentialAddress:
    source.residentialAddress ||
    source.address ||
    "",

  enrollmentBank:
    source.enrollmentBank ||
    source.registrationBank ||
    source.bankName ||
    "",

  enrollmentBranch:
    source.enrollmentBranch ||
    source.registrationBranch ||
    source.branchName ||
    "",

  image:
    source.image ||
    source.photo ||
    source.base64Image ||
    source.profileImage ||
    "",

  verificationStatus:
    String(
      source.verificationStatus ||
        source.status ||
        "VERIFIED"
    ).toUpperCase(),

  verifiedAt:
    source.verifiedAt ||
    source.createdAt ||
    new Date().toISOString(),
});

export default function BvnVerificationPage() {
  const printAreaRef = useRef(null);

  const [wallet, setWallet] = useState(null);
  const [servicePrice, setServicePrice] = useState(0);

  const [bvn, setBvn] = useState("");
  const [purpose, setPurpose] = useState(
    "ACCOUNT_VERIFICATION"
  );

  const [consentAccepted, setConsentAccepted] =
    useState(false);

  const [record, setRecord] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [verifying, setVerifying] =
    useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("info");

  const fetchWallet = useCallback(async () => {
    const response = await api.get("/wallet");

    const walletData =
      response.data?.wallet ||
      response.data?.data?.wallet ||
      response.data?.data ||
      null;

    setWallet(walletData);

    return walletData;
  }, []);

  const fetchServicePrice = useCallback(async () => {
    try {
      const response = await api.get(
        "/identity/bvn/config"
      );

      const config =
        response.data?.config ||
        response.data?.service ||
        response.data?.data?.config ||
        response.data?.data ||
        {};

      const price = Number(
        config.price ||
          config.verificationFee ||
          config.amount ||
          0
      );

      setServicePrice(price);

      return price;
    } catch (error) {
      if (error?.response?.status === 404) {
        setServicePrice(0);
        return 0;
      }

      throw error;
    }
  }, []);

  const loadPage = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage("");

        const results = await Promise.allSettled([
          fetchWallet(),
          fetchServicePrice(),
        ]);

        const failed = results.find(
          (result) => result.status === "rejected"
        );

        if (failed) {
          setMessageType("error");
          setMessage(
            getErrorMessage(
              failed.reason,
              "Some BVN service information could not be loaded."
            )
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWallet, fetchServicePrice]
  );

  useEffect(() => {
    loadPage();

    const token = localStorage.getItem("token");

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const refreshWallet = () => {
      fetchWallet().catch(console.error);
    };

    socket.on(
      "wallet-updated",
      refreshWallet
    );

    socket.on(
      "identity-verification-completed",
      refreshWallet
    );

    socket.on(
      "transaction-updated",
      refreshWallet
    );

    return () => {
      socket.off(
        "wallet-updated",
        refreshWallet
      );

      socket.off(
        "identity-verification-completed",
        refreshWallet
      );

      socket.off(
        "transaction-updated",
        refreshWallet
      );
    };
  }, [loadPage, fetchWallet]);

  const updateBvn = (value) => {
    const digits = value
      .replace(/\D/g, "")
      .slice(0, 11);

    setBvn(digits);
    setRecord(null);
    setMessage("");
  };

  const verifyBvn = async (event) => {
    event.preventDefault();

    if (!/^\d{11}$/.test(bvn)) {
      setMessageType("error");
      setMessage(
        "BVN must contain exactly 11 digits."
      );
      return;
    }

    if (!consentAccepted) {
      setMessageType("error");
      setMessage(
        "You must confirm that the BVN owner has authorized this verification."
      );
      return;
    }

    if (
      servicePrice > 0 &&
      Number(wallet?.balance || 0) < servicePrice
    ) {
      setMessageType("error");
      setMessage(
        "Insufficient wallet balance for BVN verification."
      );
      return;
    }

    try {
      setVerifying(true);
      setMessage("");
      setRecord(null);

      const response = await api.post(
        "/identity/bvn/verify",
        {
          bvn,
          purpose,
          consent: true,
        }
      );

      const source =
        response.data?.record ||
        response.data?.result ||
        response.data?.identity ||
        response.data?.data?.record ||
        response.data?.data ||
        null;

      if (!source) {
        throw new Error(
          "The BVN partner did not return a verification record."
        );
      }

      const normalizedRecord =
        normalizeBvnRecord({
          ...source,
          reference:
            source.reference ||
            response.data?.reference ||
            response.data
              ?.transactionReference,
          bvn:
            source.bvn ||
            source.bvnNumber ||
            bvn,
        });

      setRecord(normalizedRecord);

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "BVN verified successfully."
      );

      await fetchWallet();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to verify BVN."
        )
      );
    } finally {
      setVerifying(false);
    }
  };

  const resetVerification = () => {
    setBvn("");
    setPurpose("ACCOUNT_VERIFICATION");
    setConsentAccepted(false);
    setRecord(null);
    setMessage("");
  };

  const printSlip = () => {
    if (!record || !printAreaRef.current) {
      return;
    }

    const printableHtml =
      printAreaRef.current.innerHTML;

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=1000"
    );

    if (!printWindow) {
      setMessageType("error");
      setMessage(
        "Your browser blocked the print window. Allow pop-ups and try again."
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>BVN Verification Slip</title>
          <meta charset="UTF-8" />

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 24px;
              color: #0f172a;
              background: #ffffff;
              font-family: Arial, Helvetica, sans-serif;
            }

            .print-slip {
              max-width: 760px;
              margin: 0 auto;
              border: 2px solid #1d4ed8;
              border-radius: 16px;
              overflow: hidden;
            }

            .print-header {
              padding: 24px;
              color: white;
              background: #1d4ed8;
              text-align: center;
            }

            .print-header h1 {
              margin: 0;
              font-size: 26px;
            }

            .print-header p {
              margin: 8px 0 0;
              font-size: 13px;
            }

            .print-body {
              padding: 26px;
            }

            .print-status {
              margin-bottom: 22px;
              padding: 12px;
              border: 1px solid #86efac;
              border-radius: 10px;
              color: #166534;
              background: #f0fdf4;
              font-weight: 700;
              text-align: center;
            }

            .print-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
            }

            .print-field {
              padding: 12px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
            }

            .print-label {
              margin-bottom: 5px;
              color: #64748b;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
            }

            .print-value {
              color: #0f172a;
              font-size: 14px;
              font-weight: 700;
              word-break: break-word;
            }

            .print-photo {
              display: flex;
              justify-content: center;
              margin-bottom: 20px;
            }

            .print-photo img {
              width: 120px;
              height: 140px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              object-fit: cover;
            }

            .print-footer {
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #cbd5e1;
              color: #64748b;
              font-size: 10px;
              line-height: 1.6;
              text-align: center;
            }

            @media print {
              body {
                padding: 0;
              }

              .print-slip {
                border-radius: 0;
              }
            }
          </style>
        </head>

        <body>
          ${printableHtml}

          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <DashboardLayout
      title="BVN Verification Slip"
      description="Verify authorized BVN records and generate printable verification slips."
    >
      {message && (
        <div
          className={`mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4 ${
            messageType === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : messageType === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />
          )}

          <span>{message}</span>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-3">
          <Wallet
            size={20}
            className="text-blue-400"
          />

          <div>
            <p className="text-xs text-slate-400">
              Wallet Balance
            </p>

            <p className="font-bold">
              {formatNaira(wallet?.balance)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadPage({ silent: true })
          }
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:opacity-60"
        >
          <RefreshCcw
            size={18}
            className={
              refreshing ? "animate-spin" : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading BVN service...
          </div>
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="h-fit rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <ShieldCheck size={24} />
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Verify BVN
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Enter an authorized BVN to retrieve its
                  verification record.
                </p>
              </div>
            </div>

            <form
              onSubmit={verifyBvn}
              className="space-y-5"
            >
              <div>
                <label className="text-sm text-slate-400">
                  BVN Number
                </label>

                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
                  <Hash
                    size={18}
                    className="text-slate-500"
                  />

                  <input
                    inputMode="numeric"
                    value={bvn}
                    onChange={(event) =>
                      updateBvn(event.target.value)
                    }
                    placeholder="Enter 11-digit BVN"
                    maxLength={11}
                    required
                    autoComplete="off"
                    className="w-full bg-transparent py-4 font-mono tracking-wider outline-none"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  {bvn.length}/11 digits
                </p>
              </div>

              <div>
                <label className="text-sm text-slate-400">
                  Verification Purpose
                </label>

                <select
                  value={purpose}
                  onChange={(event) =>
                    setPurpose(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
                >
                  <option value="ACCOUNT_VERIFICATION">
                    Account Verification
                  </option>

                  <option value="CUSTOMER_ONBOARDING">
                    Customer Onboarding
                  </option>

                  <option value="KYC_VERIFICATION">
                    KYC Verification
                  </option>

                  <option value="LOAN_APPLICATION">
                    Loan Application
                  </option>

                  <option value="OTHER_AUTHORIZED_PURPOSE">
                    Other Authorized Purpose
                  </option>
                </select>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(event) =>
                    setConsentAccepted(
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4"
                />

                <span className="text-sm leading-6 text-slate-400">
                  I confirm that the BVN owner has authorized
                  this verification and that the information
                  will only be used for the stated lawful
                  purpose.
                </span>
              </label>

              {servicePrice > 0 && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <p className="text-sm text-blue-200">
                    Verification Fee
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {formatNaira(servicePrice)}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  verifying ||
                  bvn.length !== 11 ||
                  !consentAccepted
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                    Verifying BVN...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Verify BVN
                  </>
                )}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            {!record ? (
              <div className="flex min-h-[460px] flex-col items-center justify-center text-center">
                <FileText
                  size={54}
                  className="text-slate-700"
                />

                <h2 className="mt-5 text-xl font-bold">
                  No verification record
                </h2>

                <p className="mt-2 max-w-md leading-7 text-slate-500">
                  After a successful authorized BVN
                  verification, the printable slip will appear
                  here.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      Verification Result
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Reference: {record.reference || "-"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={printSlip}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
                    >
                      <Printer size={18} />
                      Print Slip
                    </button>

                    <button
                      type="button"
                      onClick={resetVerification}
                      className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700"
                    >
                      <X size={18} />
                      New Search
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <ResultField
                    icon={<User size={18} />}
                    label="Full Name"
                    value={record.fullName}
                  />

                  <ResultField
                    icon={<Hash size={18} />}
                    label="BVN"
                    value={maskBvn(record.bvn || bvn)}
                  />

                  <ResultField
                    icon={<Phone size={18} />}
                    label="Phone Number"
                    value={
                      record.phoneNumber
                        ? `${record.phoneNumber.slice(
                            0,
                            4
                          )}****${record.phoneNumber.slice(-3)}`
                        : "-"
                    }
                  />

                  <ResultField
                    icon={<CalendarDays size={18} />}
                    label="Date of Birth"
                    value={record.dateOfBirth}
                  />

                  <ResultField
                    icon={<User size={18} />}
                    label="Gender"
                    value={record.gender}
                  />

                  <ResultField
                    icon={<MapPin size={18} />}
                    label="State / LGA"
                    value={[
                      record.stateOfOrigin,
                      record.localGovernment,
                    ]
                      .filter(Boolean)
                      .join(" / ")}
                  />
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {record && (
        <div className="hidden">
          <div ref={printAreaRef}>
            <div className="print-slip">
              <div className="print-header">
                <h1>AYAX BVN VERIFICATION SLIP</h1>

                <p>
                  Secure Identity Verification Record
                </p>
              </div>

              <div className="print-body">
                <div className="print-status">
                  BVN VERIFIED SUCCESSFULLY
                </div>

                {record.image && (
                  <div className="print-photo">
                    <img
                      src={
                        record.image.startsWith("data:")
                          ? record.image
                          : `data:image/jpeg;base64,${record.image}`
                      }
                      alt="BVN holder"
                    />
                  </div>
                )}

                <div className="print-grid">
                  <PrintField
                    label="Verification Reference"
                    value={record.reference || "-"}
                  />

                  <PrintField
                    label="BVN"
                    value={maskBvn(record.bvn || bvn)}
                  />

                  <PrintField
                    label="Full Name"
                    value={record.fullName || "-"}
                  />

                  <PrintField
                    label="Gender"
                    value={record.gender || "-"}
                  />

                  <PrintField
                    label="Date of Birth"
                    value={record.dateOfBirth || "-"}
                  />

                  <PrintField
                    label="Phone Number"
                    value={
                      record.phoneNumber
                        ? `${record.phoneNumber.slice(
                            0,
                            4
                          )}****${record.phoneNumber.slice(-3)}`
                        : "-"
                    }
                  />

                  <PrintField
                    label="State of Origin"
                    value={record.stateOfOrigin || "-"}
                  />

                  <PrintField
                    label="Local Government"
                    value={record.localGovernment || "-"}
                  />

                  <PrintField
                    label="Enrollment Bank"
                    value={record.enrollmentBank || "-"}
                  />

                  <PrintField
                    label="Enrollment Branch"
                    value={record.enrollmentBranch || "-"}
                  />

                  <PrintField
                    label="Verification Status"
                    value={record.verificationStatus}
                  />

                  <PrintField
                    label="Verified At"
                    value={
                      record.verifiedAt
                        ? new Date(
                            record.verifiedAt
                          ).toLocaleString()
                        : "-"
                    }
                  />
                </div>

                <div className="print-footer">
                  This slip confirms that the supplied BVN was
                  verified through an authorized identity
                  service. It is not a bank account statement,
                  identification card or proof of ownership.
                  Unauthorized use, alteration or distribution
                  is prohibited.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function ResultField({
  icon,
  label,
  value,
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <span className="mt-0.5 text-blue-400">
        {icon}
      </span>

      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-all font-semibold text-slate-200">
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

function PrintField({ label, value }) {
  return (
    <div className="print-field">
      <div className="print-label">
        {label}
      </div>

      <div className="print-value">
        {value || "-"}
      </div>
    </div>
  );
}