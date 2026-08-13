"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ShieldCheck,
  Wallet,
  KeyRound,
  Activity,
  RefreshCcw,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Search,
  Copy,
  Check,
  Code2,
  Terminal,
  Server,
  Clock,
  FileJson,
  ExternalLink,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const SERVICE_CODE = "BVN_VERIFY";
const API_ENDPOINT = "/api/v1/identity/bvn/verify";

const INITIAL_RESPONSE = {
  success: true,
  message:
    "Your live BVN verification response will appear here.",
  data: {
    reference: "AYAX-BVN-XXXXXXXX",
    status: "SUCCESSFUL",
  },
};

const PURPOSES = [
  {
    value: "ACCOUNT_VERIFICATION",
    label: "Account Verification",
  },
  {
    value: "CUSTOMER_ONBOARDING",
    label: "Customer Onboarding",
  },
  {
    value: "KYC_VERIFICATION",
    label: "KYC Verification",
  },
  {
    value: "LOAN_APPLICATION",
    label: "Loan Application",
  },
  {
    value: "OTHER_AUTHORIZED_PURPOSE",
    label: "Other Authorized Purpose",
  },
];

const LANGUAGES = [
  "cURL",
  "Node.js",
  "PHP",
  "Laravel",
  "Python",
  "React Native",
];

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

const formatTierName = (tier = "REGULAR") => {
  const value = String(tier).toLowerCase();

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
};

const normalizePricingPlan = (item = {}) => ({
  id: item.id,
  serviceCode:
    item.serviceCode || SERVICE_CODE,

  serviceName:
    item.serviceName ||
    "BVN Verification",

  tier: String(
    item.tier || "REGULAR"
  ).toUpperCase(),

  price: Number(
    item.sellingPrice ??
      item.price ??
      item.amount ??
      0
  ),

  currency: item.currency || "NGN",

  enabled:
    item.enabled === undefined
      ? true
      : Boolean(item.enabled),

  features: Array.isArray(item.features)
    ? item.features
    : [],
});

const normalizeApiKey = (item = {}) => ({
  id: item.id,
  name: item.name || "Live API Key",
  key: item.key || item.apiKey || "",
  status: String(
    item.status || "ACTIVE"
  ).toUpperCase(),
});

const normalizeRequest = (item = {}) => ({
  id:
    item.id ||
    item.reference ||
    crypto.randomUUID(),

  reference:
    item.reference ||
    item.transactionReference ||
    "-",

  status: String(
    item.status || "PENDING"
  ).toUpperCase(),

  amount: Number(item.amount || 0),

  createdAt:
    item.createdAt ||
    item.date ||
    null,
});

export default function BvnDeveloperApiPage() {
  const [wallet, setWallet] = useState(null);
  const [pricingPlans, setPricingPlans] =
    useState([]);

  const [apiKeys, setApiKeys] = useState([]);
  const [recentRequests, setRecentRequests] =
    useState([]);

  const [selectedPlan, setSelectedPlan] =
    useState(null);

  const [bvn, setBvn] = useState("");
  const [purpose, setPurpose] = useState(
    "KYC_VERIFICATION"
  );

  const [consentAccepted, setConsentAccepted] =
    useState(false);

  const [apiResponse, setApiResponse] =
    useState(INITIAL_RESPONSE);

  const [activeLanguage, setActiveLanguage] =
    useState("cURL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [testing, setTesting] = useState(false);

  const [copiedField, setCopiedField] =
    useState("");

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

  const fetchPricingPlans =
    useCallback(async () => {
      const response = await api.get(
        `/pricing/service/${SERVICE_CODE}`
      );

      const list =
        response.data?.pricing ||
        response.data?.plans ||
        response.data?.data?.pricing ||
        response.data?.data?.plans ||
        response.data?.data ||
        [];

      const plans = Array.isArray(list)
        ? list
            .map(normalizePricingPlan)
            .filter(
              (item) =>
                item.enabled &&
                item.serviceCode ===
                  SERVICE_CODE
            )
        : [];

      setPricingPlans(plans);

      setSelectedPlan((current) => {
        if (current) {
          const existing = plans.find(
            (item) =>
              item.id === current.id
          );

          if (existing) return existing;
        }

        return plans[0] || null;
      });

      return plans;
    }, []);

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await api.get(
        "/api-keys"
      );

      const list =
        response.data?.keys ||
        response.data?.apiKeys ||
        response.data?.data?.keys ||
        response.data?.data ||
        [];

      const keys = Array.isArray(list)
        ? list
            .map(normalizeApiKey)
            .filter(
              (item) =>
                item.status === "ACTIVE"
            )
        : [];

      setApiKeys(keys);

      return keys;
    } catch (error) {
      if (error?.response?.status === 404) {
        setApiKeys([]);
        return [];
      }

      throw error;
    }
  }, []);

  const fetchRecentRequests =
    useCallback(async () => {
      const possibleRoutes = [
        `/transactions?service=${SERVICE_CODE}`,
        `/wallet/transactions?service=${SERVICE_CODE}`,
      ];

      for (const route of possibleRoutes) {
        try {
          const response = await api.get(route);

          const list =
            response.data?.transactions ||
            response.data?.requests ||
            response.data?.data
              ?.transactions ||
            response.data?.data ||
            [];

          const normalized = Array.isArray(
            list
          )
            ? list
                .filter((item) => {
                  const service = String(
                    item.service ||
                      item.serviceCode ||
                      item.description ||
                      ""
                  ).toUpperCase();

                  return (
                    service.includes("BVN") ||
                    service === SERVICE_CODE
                  );
                })
                .slice(0, 10)
                .map(normalizeRequest)
            : [];

          setRecentRequests(normalized);

          return normalized;
        } catch (error) {
          if (
            error?.response?.status !== 404
          ) {
            throw error;
          }
        }
      }

      setRecentRequests([]);
      return [];
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

        const results =
          await Promise.allSettled([
            fetchWallet(),
            fetchPricingPlans(),
            fetchApiKeys(),
            fetchRecentRequests(),
          ]);

        const failed = results.find(
          (result) =>
            result.status === "rejected"
        );

        if (failed) {
          setMessageType("error");
          setMessage(
            getErrorMessage(
              failed.reason,
              "Some BVN API information could not be loaded."
            )
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      fetchWallet,
      fetchPricingPlans,
      fetchApiKeys,
      fetchRecentRequests,
    ]
  );

  useEffect(() => {
    loadPage();

    const token =
      localStorage.getItem("token");

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const refreshWalletAndRequests = () => {
      fetchWallet().catch(console.error);
      fetchRecentRequests().catch(
        console.error
      );
    };

    const refreshPricing = () => {
      fetchPricingPlans().catch(
        console.error
      );
    };

    const refreshKeys = () => {
      fetchApiKeys().catch(console.error);
    };

    socket.on(
      "wallet-updated",
      refreshWalletAndRequests
    );

    socket.on(
      "transaction-updated",
      refreshWalletAndRequests
    );

    socket.on(
      "identity-verification-completed",
      refreshWalletAndRequests
    );

    socket.on(
      "pricing-created",
      refreshPricing
    );

    socket.on(
      "pricing-updated",
      refreshPricing
    );

    socket.on(
      "pricing-status-updated",
      refreshPricing
    );

    socket.on(
      "api-key-created",
      refreshKeys
    );

    return () => {
      socket.off(
        "wallet-updated",
        refreshWalletAndRequests
      );

      socket.off(
        "transaction-updated",
        refreshWalletAndRequests
      );

      socket.off(
        "identity-verification-completed",
        refreshWalletAndRequests
      );

      socket.off(
        "pricing-created",
        refreshPricing
      );

      socket.off(
        "pricing-updated",
        refreshPricing
      );

      socket.off(
        "pricing-status-updated",
        refreshPricing
      );

      socket.off(
        "api-key-created",
        refreshKeys
      );
    };
  }, [
    loadPage,
    fetchWallet,
    fetchPricingPlans,
    fetchApiKeys,
    fetchRecentRequests,
  ]);

  const activeApiKey =
    apiKeys?.[0]?.key || "";

  const publicApiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://ayax-api-marketplace.onrender.com/api/v1";

  const fullEndpoint = `${publicApiBaseUrl.replace(
    /\/$/,
    ""
  )}/identity/bvn/verify`;

  const requestBody = useMemo(
    () => ({
      bvn:
        bvn || "12345678901",

      pricingId:
        selectedPlan?.id ||
        "YOUR_PRICING_ID",

      package:
        selectedPlan?.tier ||
        "REGULAR",

      purpose,

      consent: true,
    }),
    [
      bvn,
      selectedPlan,
      purpose,
    ]
  );

  const codeExamples = useMemo(() => {
    const body = JSON.stringify(
      requestBody,
      null,
      2
    );

    const apiKeyValue =
      activeApiKey ||
      "YOUR_AYAX_API_KEY";

    return {
      cURL: `curl --request POST \\
  --url '${fullEndpoint}' \\
  --header 'Content-Type: application/json' \\
  --header 'x-api-key: ${apiKeyValue}' \\
  --data '${body}'`,

      "Node.js": `const axios = require("axios");

async function verifyBvn() {
  try {
    const response = await axios.post(
      "${fullEndpoint}",
      ${body},
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "${apiKeyValue}"
        }
      }
    );

    console.log(response.data);
  } catch (error) {
    console.error(
      error.response?.data || error.message
    );
  }
}

verifyBvn();`,

      PHP: `<?php

$payload = ${JSON.stringify(
        requestBody
      )};

$curl = curl_init("${fullEndpoint}");

curl_setopt_array($curl, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "x-api-key: ${apiKeyValue}"
  ],
  CURLOPT_POSTFIELDS => json_encode($payload)
]);

$response = curl_exec($curl);

if (curl_errno($curl)) {
  echo curl_error($curl);
} else {
  echo $response;
}

curl_close($curl);`,

      Laravel: `use Illuminate\\Support\\Facades\\Http;

$response = Http::withHeaders([
    "x-api-key" => "${apiKeyValue}",
    "Accept" => "application/json",
])->post("${fullEndpoint}", ${body});

return $response->json();`,

      Python: `import requests

url = "${fullEndpoint}"

headers = {
    "Content-Type": "application/json",
    "x-api-key": "${apiKeyValue}"
}

payload = ${body
        .replace(/true/g, "True")
        .replace(/false/g, "False")
        .replace(/null/g, "None")}

response = requests.post(
    url,
    json=payload,
    headers=headers,
    timeout=30
)

print(response.json())`,

      "React Native": `import axios from "axios";

export async function verifyBvn() {
  try {
    const response = await axios.post(
      "${fullEndpoint}",
      ${body},
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "${apiKeyValue}"
        }
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      "BVN verification failed"
    );
  }
}`,
    };
  }, [
    requestBody,
    fullEndpoint,
    activeApiKey,
  ]);

  const testBvnApi = async (event) => {
    event.preventDefault();

    if (!selectedPlan) {
      setMessageType("error");
      setMessage(
        "Select an active BVN pricing plan."
      );
      return;
    }

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
        "Confirm that the BVN owner authorized this verification."
      );
      return;
    }

    if (
      Number(wallet?.balance || 0) <
      Number(selectedPlan.price || 0)
    ) {
      setMessageType("error");
      setMessage(
        "Insufficient wallet balance for this plan."
      );
      return;
    }

    try {
      setTesting(true);
      setMessage("");

      const response = await api.post(
        "/identity/bvn/verify",
        {
          bvn,
          purpose,
          consent: true,

          pricingId:
            selectedPlan.id,

          package:
            selectedPlan.tier,

          tier:
            selectedPlan.tier,

          serviceCode:
            SERVICE_CODE,
        }
      );

      setApiResponse(response.data);

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "BVN API test completed successfully."
      );

      await Promise.allSettled([
        fetchWallet(),
        fetchRecentRequests(),
      ]);
    } catch (error) {
      const errorResponse =
        error?.response?.data || {
          success: false,
          message: getErrorMessage(
            error,
            "BVN API test failed."
          ),
        };

      setApiResponse(errorResponse);
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "BVN API test failed."
        )
      );
    } finally {
      setTesting(false);
    }
  };

  const copyText = async (
    text,
    field
  ) => {
    try {
      await navigator.clipboard.writeText(
        String(text)
      );

      setCopiedField(field);

      window.setTimeout(() => {
        setCopiedField("");
      }, 1800);
    } catch {
      setMessageType("error");
      setMessage(
        "Unable to copy to clipboard."
      );
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        title="BVN Verification API"
        description="Pricing, testing, documentation and code examples."
      >
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading BVN API...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="BVN Verification API"
      description="View pricing, test requests and integrate Ayax BVN verification in your application."
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

      <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Wallet size={22} />}
          label="Wallet Balance"
          value={formatNaira(
            wallet?.balance
          )}
        />

        <StatCard
          icon={<KeyRound size={22} />}
          label="Active API Keys"
          value={apiKeys.length}
        />

        <StatCard
          icon={<Activity size={22} />}
          label="API Status"
          value="Online"
          status
        />

        <StatCard
          icon={<Server size={22} />}
          label="Available Plans"
          value={pricingPlans.length}
        />
      </section>

      <div className="mb-8 flex justify-end">
        <button
          type="button"
          onClick={() =>
            loadPage({ silent: true })
          }
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCcw
            size={18}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
            <ShieldCheck size={24} />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              BVN API Pricing
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Select the package that matches
              your application requirements.
              Only the selling price is shown.
            </p>
          </div>
        </div>

        {pricingPlans.length === 0 ? (
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-yellow-300">
            No active BVN pricing plan is
            available. The Super Admin must add
            BVN_VERIFY pricing first.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {pricingPlans.map((plan) => {
              const selected =
                selectedPlan?.id === plan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() =>
                    setSelectedPlan(plan)
                  }
                  className={`rounded-3xl border p-6 text-left transition ${
                    selected
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-800 bg-slate-950 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <TierBadge
                      tier={plan.tier}
                    />

                    {selected && (
                      <CheckCircle2
                        size={20}
                        className="text-blue-400"
                      />
                    )}
                  </div>

                  <h3 className="mt-5 text-3xl font-extrabold">
                    {formatNaira(plan.price)}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Per successful API request
                  </p>

                  {plan.features.length > 0 && (
                    <div className="mt-5 space-y-2">
                      {plan.features.map(
                        (feature) => (
                          <div
                            key={feature}
                            className="flex items-start gap-2 text-sm text-slate-400"
                          >
                            <CheckCircle2
                              size={15}
                              className="mt-0.5 shrink-0 text-green-400"
                            />
                            <span>{feature}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8 grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <form
          onSubmit={testBvnApi}
          className="h-fit rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold">
              Live API Tester
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Test the BVN endpoint using your
              authenticated developer account.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-sm text-slate-400">
                BVN
              </label>

              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
                <Search
                  size={18}
                  className="text-slate-500"
                />

                <input
                  inputMode="numeric"
                  value={bvn}
                  onChange={(event) =>
                    setBvn(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 11)
                    )
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
                Purpose
              </label>

              <select
                value={purpose}
                onChange={(event) =>
                  setPurpose(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
              >
                {PURPOSES.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Selected Plan
              </p>

              {selectedPlan ? (
                <div className="mt-2 flex items-center justify-between gap-4">
                  <span className="font-bold">
                    {formatTierName(
                      selectedPlan.tier
                    )}
                  </span>

                  <span className="text-xl font-extrabold text-blue-400">
                    {formatNaira(
                      selectedPlan.price
                    )}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-yellow-400">
                  No plan selected
                </p>
              )}
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
                I confirm that the BVN owner
                authorized this verification and
                that the request is for a lawful
                purpose.
              </span>
            </label>

            <button
              type="submit"
              disabled={
                testing ||
                bvn.length !== 11 ||
                !consentAccepted ||
                !selectedPlan
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testing ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                  Sending Request...
                </>
              ) : (
                <>
                  <Terminal size={18} />
                  Test BVN API
                </>
              )}
            </button>
          </div>
        </form>

        <JsonResponsePanel
          response={apiResponse}
          copied={
            copiedField === "response"
          }
          onCopy={() =>
            copyText(
              JSON.stringify(
                apiResponse,
                null,
                2
              ),
              "response"
            )
          }
        />
      </section>

      <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
            <FileJson size={23} />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              API Documentation
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Use this endpoint from your backend
              server or secured application
              service.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <DocumentationField
            label="Method"
            value="POST"
          />

          <DocumentationField
            label="Content Type"
            value="application/json"
          />

          <DocumentationField
            label="Endpoint"
            value={fullEndpoint}
            copy
            copied={
              copiedField === "endpoint"
            }
            onCopy={() =>
              copyText(
                fullEndpoint,
                "endpoint"
              )
            }
          />

          <DocumentationField
            label="Authentication"
            value="x-api-key: YOUR_AYAX_API_KEY"
            copy
            copied={
              copiedField === "auth"
            }
            onCopy={() =>
              copyText(
                "x-api-key: YOUR_AYAX_API_KEY",
                "auth"
              )
            }
          />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm text-slate-400">
            Request Body
          </p>

          <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <button
              type="button"
              onClick={() =>
                copyText(
                  JSON.stringify(
                    requestBody,
                    null,
                    2
                  ),
                  "request-body"
                )
              }
              className="absolute right-4 top-4 rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
            >
              {copiedField ===
              "request-body" ? (
                <Check size={17} />
              ) : (
                <Copy size={17} />
              )}
            </button>

            <pre className="overflow-x-auto pr-12 text-sm leading-7 text-green-300">
              {JSON.stringify(
                requestBody,
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </section>

      <section className="mb-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
              <Code2 size={23} />
            </div>

            <div>
              <h2 className="text-xl font-bold">
                Code Examples
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Copy an example and add it to your
                application.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-800 p-4">
          {LANGUAGES.map((language) => (
            <button
              key={language}
              type="button"
              onClick={() =>
                setActiveLanguage(language)
              }
              className={`shrink-0 rounded-xl px-4 py-3 text-sm font-semibold ${
                activeLanguage === language
                  ? "bg-blue-600 text-white"
                  : "bg-slate-950 text-slate-400 hover:bg-slate-800"
              }`}
            >
              {language}
            </button>
          ))}
        </div>

        <div className="relative bg-slate-950 p-6">
          <button
            type="button"
            onClick={() =>
              copyText(
                codeExamples[
                  activeLanguage
                ],
                "code"
              )
            }
            className="absolute right-5 top-5 flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
          >
            {copiedField === "code" ? (
              <>
                <Check size={16} />
                Copied
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy
              </>
            )}
          </button>

          <pre className="max-h-[520px] overflow-auto pr-24 text-sm leading-7 text-slate-300">
            <code>
              {codeExamples[
                activeLanguage
              ]}
            </code>
          </pre>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400">
            <Clock size={23} />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              Recent BVN Requests
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Your latest BVN API transactions.
            </p>
          </div>
        </div>

        {recentRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-500">
            No BVN request found yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">
                    {item.reference}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.createdAt
                      ? new Date(
                          item.createdAt
                        ).toLocaleString()
                      : "-"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-bold">
                    {formatNaira(item.amount)}
                  </span>

                  <RequestStatus
                    status={item.status}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  status = false,
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
        {icon}
      </div>

      <p className="mt-5 text-sm text-slate-400">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-2">
        {status && (
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        )}

        <h3 className="break-all text-2xl font-extrabold">
          {value}
        </h3>
      </div>
    </div>
  );
}

function TierBadge({ tier }) {
  const classes = {
    REGULAR:
      "bg-slate-500/10 text-slate-300",
    STANDARD:
      "bg-blue-500/10 text-blue-400",
    PREMIUM:
      "bg-purple-500/10 text-purple-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        classes[tier] || classes.REGULAR
      }`}
    >
      {formatTierName(tier)}
    </span>
  );
}

function JsonResponsePanel({
  response,
  copied,
  onCopy,
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
        <div>
          <h2 className="font-bold">
            JSON Response
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Live response from the Ayax API
          </p>
        </div>

        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
        >
          {copied ? (
            <Check size={16} />
          ) : (
            <Copy size={16} />
          )}

          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre className="min-h-[480px] max-h-[680px] overflow-auto bg-slate-950 p-6 text-sm leading-7 text-green-300">
        {JSON.stringify(
          response,
          null,
          2
        )}
      </pre>
    </section>
  );
}

function DocumentationField({
  label,
  value,
  copy = false,
  copied = false,
  onCopy,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="mt-2 flex items-start justify-between gap-4">
        <code className="break-all text-sm font-semibold text-slate-200">
          {value}
        </code>

        {copy && (
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 text-slate-500 hover:text-white"
          >
            {copied ? (
              <Check size={17} />
            ) : (
              <Copy size={17} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function RequestStatus({ status }) {
  const normalized = String(
    status || "PENDING"
  ).toUpperCase();

  const classes =
    normalized === "SUCCESSFUL" ||
    normalized === "SUCCESS"
      ? "bg-green-500/10 text-green-400"
      : normalized === "FAILED"
      ? "bg-red-500/10 text-red-400"
      : "bg-yellow-500/10 text-yellow-400";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs ${classes}`}
    >
      {normalized}
    </span>
  );
}