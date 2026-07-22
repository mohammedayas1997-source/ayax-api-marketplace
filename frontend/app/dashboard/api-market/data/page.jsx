"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Wifi,
  Wallet,
  KeyRound,
  Activity,
  Server,
  Search,
  RefreshCcw,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Code2,
  Terminal,
  FileJson,
  Clock,
  Phone,
  Package,
} from "lucide-react";

import api from "@/lib/api";
import { socket } from "@/lib/socket";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const SERVICE_CODE = "DATA";

const LANGUAGES = [
  "cURL",
  "Node.js",
  "PHP",
  "Laravel",
  "Python",
  "React Native",
];

const INITIAL_RESPONSE = {
  success: true,
  message:
    "Your live Data API response will appear here.",
  data: {
    reference: "AYAX-DATA-XXXXXXXX",
    status: "SUCCESSFUL",
  },
};

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

const getPlanNetwork = (plan = {}) =>
  String(
    plan.network ||
      plan.provider?.name ||
      plan.provider ||
      plan.service?.provider?.name ||
      plan.service?.provider ||
      plan.service?.category ||
      ""
  )
    .trim()
    .toUpperCase();

const getPlanName = (plan = {}) =>
  plan.size ||
  plan.name ||
  plan.title ||
  plan.planName ||
  "Data Plan";

const getPlanCode = (plan = {}) =>
  plan.code ||
  plan.planCode ||
  plan.providerPlanCode ||
  plan.id ||
  "";

const getPlanPrice = (plan = {}) =>
  Number(
    plan.sellingPrice ??
      plan.price ??
      plan.amount ??
      0
  );

const normalizePlan = (plan = {}) => ({
  id:
    plan.id ||
    plan.planId ||
    plan.code ||
    plan.planCode,

  code: getPlanCode(plan),

  network: getPlanNetwork(plan),

  name: getPlanName(plan),

  price: getPlanPrice(plan),

  status: String(
    plan.status || "ACTIVE"
  ).toUpperCase(),

  validity:
    plan.validity ||
    plan.duration ||
    plan.expiry ||
    "",

  category: String(
    plan.category ||
      plan.serviceType ||
      plan.type ||
      plan.service?.category ||
      "DATA"
  ).toUpperCase(),

  description:
    plan.description || "",

  raw: plan,
});

const normalizeApiKey = (item = {}) => ({
  id: item.id,

  key:
    item.key ||
    item.apiKey ||
    "",

  status: String(
    item.status || "ACTIVE"
  ).toUpperCase(),
});

const normalizeRequest = (item = {}) => ({
  id:
    item.id ||
    item.reference ||
    `${Date.now()}-${Math.random()}`,

  reference:
    item.reference ||
    item.transactionReference ||
    "-",

  network:
    item.network ||
    item.provider ||
    item.providerCode ||
    "-",

  planName:
    item.planName ||
    item.plan ||
    item.description ||
    "-",

  phoneNumber:
    item.phoneNumber ||
    item.phone ||
    item.recipient ||
    "-",

  amount: Number(item.amount || 0),

  status: String(
    item.status || "PENDING"
  ).toUpperCase(),

  createdAt:
    item.createdAt ||
    item.date ||
    null,
});

export default function DataDeveloperApiPage() {
  const [plans, setPlans] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [recentRequests, setRecentRequests] =
    useState([]);

  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState("ALL");

  const [selectedPlan, setSelectedPlan] =
    useState(null);

  const [phone, setPhone] = useState("");

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

  const fetchPlans = useCallback(async () => {
    const routes = [
      "/plans",
      "/data-plans",
      "/marketplace/plans",
      "/api-marketplace/plans",
    ];

    let lastError = null;

    for (const route of routes) {
      try {
        const response = await api.get(route);

        const list =
          response.data?.plans ||
          response.data?.dataPlans ||
          response.data?.products ||
          response.data?.data?.plans ||
          response.data?.data ||
          [];

        const normalized = Array.isArray(list)
          ? list
              .map(normalizePlan)
              .filter((plan) => {
                return (
                  plan.id &&
                  plan.status === "ACTIVE" &&
                  plan.category.includes("DATA")
                );
              })
          : [];

        setPlans(normalized);

        setSelectedPlan((current) => {
          if (current) {
            const existing = normalized.find(
              (item) =>
                item.id === current.id
            );

            if (existing) {
              return existing;
            }
          }

          return normalized[0] || null;
        });

        return normalized;
      } catch (error) {
        lastError = error;

        if (
          error?.response?.status !== 404
        ) {
          throw error;
        }
      }
    }

    throw (
      lastError ||
      new Error(
        "Data plans endpoint was not found."
      )
    );
  }, []);

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

  const fetchApiKeys = useCallback(async () => {
    try {
      const response =
        await api.get("/api-keys");

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
      if (
        error?.response?.status === 404
      ) {
        setApiKeys([]);
        return [];
      }

      throw error;
    }
  }, []);

  const fetchRecentRequests =
    useCallback(async () => {
      const routes = [
        `/transactions?service=${SERVICE_CODE}`,
        `/wallet/transactions?service=${SERVICE_CODE}`,
      ];

      for (const route of routes) {
        try {
          const response =
            await api.get(route);

          const list =
            response.data?.transactions ||
            response.data?.requests ||
            response.data?.data
              ?.transactions ||
            response.data?.data ||
            [];

          const normalized = Array.isArray(list)
            ? list
                .filter((item) => {
                  const service = String(
                    item.service ||
                      item.serviceCode ||
                      item.category ||
                      item.description ||
                      ""
                  ).toUpperCase();

                  return (
                    service.includes("DATA") ||
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
            fetchPlans(),
            fetchWallet(),
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
              "Some Data API information could not be loaded."
            )
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      fetchPlans,
      fetchWallet,
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

    const refreshPlans = () => {
      fetchPlans().catch(console.error);
    };

    const refreshKeys = () => {
      fetchApiKeys().catch(console.error);
    };

    socket.on(
      "wallet-updated",
      refreshWalletAndRequests
    );

    socket.on(
      "purchase-successful",
      refreshWalletAndRequests
    );

    socket.on(
      "data-purchase-successful",
      refreshWalletAndRequests
    );

    socket.on(
      "transaction-updated",
      refreshWalletAndRequests
    );

    socket.on(
      "data-plan-created",
      refreshPlans
    );

    socket.on(
      "data-plan-updated",
      refreshPlans
    );

    socket.on(
      "data-plan-deleted",
      refreshPlans
    );

    socket.on(
      "plan-created",
      refreshPlans
    );

    socket.on(
      "plan-updated",
      refreshPlans
    );

    socket.on(
      "plan-deleted",
      refreshPlans
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
        "purchase-successful",
        refreshWalletAndRequests
      );

      socket.off(
        "data-purchase-successful",
        refreshWalletAndRequests
      );

      socket.off(
        "transaction-updated",
        refreshWalletAndRequests
      );

      socket.off(
        "data-plan-created",
        refreshPlans
      );

      socket.off(
        "data-plan-updated",
        refreshPlans
      );

      socket.off(
        "data-plan-deleted",
        refreshPlans
      );

      socket.off(
        "plan-created",
        refreshPlans
      );

      socket.off(
        "plan-updated",
        refreshPlans
      );

      socket.off(
        "plan-deleted",
        refreshPlans
      );

      socket.off(
        "api-key-created",
        refreshKeys
      );
    };
  }, [
    loadPage,
    fetchPlans,
    fetchWallet,
    fetchApiKeys,
    fetchRecentRequests,
  ]);

  const availableNetworks = useMemo(() => {
    return [
      ...new Set(
        plans
          .map((plan) => plan.network)
          .filter(Boolean)
      ),
    ];
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const searchText =
      query.trim().toLowerCase();

    return plans.filter((plan) => {
      const matchesSearch =
        !searchText ||
        plan.network
          .toLowerCase()
          .includes(searchText) ||
        plan.name
          .toLowerCase()
          .includes(searchText) ||
        String(plan.code)
          .toLowerCase()
          .includes(searchText) ||
        String(plan.price).includes(
          searchText
        );

      const matchesNetwork =
        network === "ALL" ||
        plan.network === network;

      return (
        matchesSearch && matchesNetwork
      );
    });
  }, [plans, query, network]);

  const activeApiKey =
    apiKeys?.[0]?.key || "";

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://ayax-api-marketplace.onrender.com/api/v1";

  const fullBuyEndpoint =
    `${apiBaseUrl.replace(
      /\/$/,
      ""
    )}/data/buy`;

  const fullPlansEndpoint =
    `${apiBaseUrl.replace(
      /\/$/,
      ""
    )}/plans`;

  const requestBody = useMemo(
    () => ({
      network:
        selectedPlan?.network || "MTN",

      planCode:
        selectedPlan?.code ||
        "YOUR_PLAN_CODE",

      phoneNumber:
        phone || "08012345678",
    }),
    [selectedPlan, phone]
  );

  const codeExamples = useMemo(() => {
    const body = JSON.stringify(
      requestBody,
      null,
      2
    );

    const apiKey =
      activeApiKey ||
      "YOUR_AYAX_API_KEY";

    return {
      cURL: `curl --request POST \\
  --url '${fullBuyEndpoint}' \\
  --header 'Content-Type: application/json' \\
  --header 'x-api-key: ${apiKey}' \\
  --data '${body}'`,

      "Node.js": `const axios = require("axios");

async function buyData() {
  try {
    const response = await axios.post(
      "${fullBuyEndpoint}",
      ${body},
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "${apiKey}"
        }
      }
    );

    console.log(response.data);
  } catch (error) {
    console.error(
      error.response?.data ||
      error.message
    );
  }
}

buyData();`,

      PHP: `<?php

$payload = ${JSON.stringify(
        requestBody
      )};

$curl = curl_init(
  "${fullBuyEndpoint}"
);

curl_setopt_array($curl, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "x-api-key: ${apiKey}"
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
    "x-api-key" => "${apiKey}",
    "Accept" => "application/json",
])->post(
    "${fullBuyEndpoint}",
    ${body}
);

return $response->json();`,

      Python: `import requests

url = "${fullBuyEndpoint}"

headers = {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey}"
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

export async function buyData() {
  try {
    const response = await axios.post(
      "${fullBuyEndpoint}",
      ${body},
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "${apiKey}"
        }
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      "Data purchase failed"
    );
  }
}`,
    };
  }, [
    requestBody,
    fullBuyEndpoint,
    activeApiKey,
  ]);

  const testDataApi = async (event) => {
    event.preventDefault();

    if (!selectedPlan) {
      setMessageType("error");

      setMessage(
        "Select an active data plan."
      );

      return;
    }

    const cleanPhone =
      phone.replace(/\s+/g, "").trim();

    if (
      !/^(\+234|0)[789][01]\d{8}$/.test(
        cleanPhone
      )
    ) {
      setMessageType("error");

      setMessage(
        "Enter a valid Nigerian phone number."
      );

      return;
    }

    if (
      Number(wallet?.balance || 0) <
      Number(selectedPlan.price || 0)
    ) {
      setMessageType("error");

      setMessage(
        "Insufficient wallet balance for this data plan."
      );

      return;
    }

    try {
      setTesting(true);
      setMessage("");

      const response = await api.post(
        "/data/buy",
        {
          phoneNumber: cleanPhone,

          phone: cleanPhone,

          recipient: cleanPhone,

          planId:
            selectedPlan.id,

          planCode:
            selectedPlan.code,

          network:
            selectedPlan.network,

          serviceCode:
            SERVICE_CODE,
        }
      );

      setApiResponse(response.data);

      setMessageType("success");

      setMessage(
        response.data?.message ||
          "Data API test completed successfully."
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
            "Data API test failed."
          ),
        };

      setApiResponse(errorResponse);

      setMessageType("error");

      setMessage(
        getErrorMessage(
          error,
          "Data API test failed."
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
        title="Data API"
        description="Plans, pricing, live testing and integration examples."
      >
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />

            Loading Data API...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Data API"
      description="View data plans and prices, test requests and integrate Ayax Data API."
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

          <span className="break-all">
            {message}
          </span>
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
          icon={<Package size={22} />}
          label="Available Plans"
          value={plans.length}
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
        <div className="mb-6">
          <h2 className="text-xl font-bold">
            Available Data Plans
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Developers can view active plans and
            selling prices published by Ayax.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
            <Search
              size={18}
              className="text-slate-500"
            />

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search network, plan, code or price..."
              className="w-full bg-transparent py-4 outline-none"
            />
          </div>

          <select
            value={network}
            onChange={(event) =>
              setNetwork(event.target.value)
            }
            className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
          >
            <option value="ALL">
              All Networks
            </option>

            {availableNetworks.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>
        </div>

        {filteredPlans.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-500">
            No active data plan matches your
            filters.
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {filteredPlans.map((plan) => {
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
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                      <Wifi size={24} />
                    </div>

                    {selected && (
                      <CheckCircle2
                        size={20}
                        className="text-blue-400"
                      />
                    )}
                  </div>

                  <h3 className="mt-5 text-xl font-bold">
                    {plan.network || "DATA"}
                  </h3>

                  <p className="mt-2 text-2xl font-extrabold">
                    {plan.name}
                  </p>

                  {plan.validity && (
                    <p className="mt-2 text-sm text-slate-500">
                      Validity: {plan.validity}
                    </p>
                  )}

                  <p className="mt-5 text-2xl font-extrabold text-blue-400">
                    {formatNaira(plan.price)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Per successful request
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8 grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <form
          onSubmit={testDataApi}
          className="h-fit rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold">
              Live API Tester
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Test a live data request using your
              authenticated developer account.
            </p>
          </div>

          <div className="space-y-5">
            <ReadOnlyField
              label="Network"
              value={
                selectedPlan?.network ||
                "No plan selected"
              }
            />

            <ReadOnlyField
              label="Plan"
              value={
                selectedPlan?.name ||
                "No plan selected"
              }
            />

            <ReadOnlyField
              label="Plan Code"
              value={
                selectedPlan?.code ||
                "-"
              }
            />

            <ReadOnlyField
              label="Amount"
              value={
                selectedPlan
                  ? formatNaira(
                      selectedPlan.price
                    )
                  : "-"
              }
            />

            <div>
              <label className="text-sm text-slate-400">
                Recipient Phone Number
              </label>

              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
                <Phone
                  size={18}
                  className="text-slate-500"
                />

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value
                    )
                  }
                  placeholder="08012345678"
                  required
                  className="w-full bg-transparent py-4 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={
                testing ||
                !selectedPlan ||
                !phone
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
                  Test Data API
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
              Call the Data API from your secured
              backend server.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <DocumentationField
            label="Purchase Method"
            value="POST"
          />

          <DocumentationField
            label="Content Type"
            value="application/json"
          />

          <DocumentationField
            label="Purchase Endpoint"
            value={fullBuyEndpoint}
            copy
            copied={
              copiedField === "buy-endpoint"
            }
            onCopy={() =>
              copyText(
                fullBuyEndpoint,
                "buy-endpoint"
              )
            }
          />

          <DocumentationField
            label="Plans Endpoint"
            value={fullPlansEndpoint}
            copy
            copied={
              copiedField === "plans-endpoint"
            }
            onCopy={() =>
              copyText(
                fullPlansEndpoint,
                "plans-endpoint"
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

          <CodeBlock
            value={JSON.stringify(
              requestBody,
              null,
              2
            )}
            copied={
              copiedField === "request-body"
            }
            onCopy={() =>
              copyText(
                JSON.stringify(
                  requestBody,
                  null,
                  2
                ),
                "request-body"
              )
            }
          />
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
                Copy the example for your
                preferred programming language.
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
              Recent Data Requests
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Your latest Data API transactions.
            </p>
          </div>
        </div>

        {recentRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-500">
            No data request found yet.
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

                  <p className="mt-1 text-sm text-slate-400">
                    {item.network} •{" "}
                    {item.planName}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.phoneNumber} •{" "}
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

function ReadOnlyField({
  label,
  value,
}) {
  return (
    <div>
      <label className="text-sm text-slate-400">
        {label}
      </label>

      <input
        value={value || ""}
        readOnly
        className="mt-2 w-full cursor-not-allowed rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
      />
    </div>
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
            Live response from Ayax Data API
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

      <pre className="min-h-[520px] max-h-[700px] overflow-auto bg-slate-950 p-6 text-sm leading-7 text-green-300">
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

function CodeBlock({
  value,
  copied,
  onCopy,
}) {
  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <button
        type="button"
        onClick={onCopy}
        className="absolute right-4 top-4 rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
      >
        {copied ? (
          <Check size={17} />
        ) : (
          <Copy size={17} />
        )}
      </button>

      <pre className="overflow-x-auto pr-12 text-sm leading-7 text-green-300">
        {value}
      </pre>
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