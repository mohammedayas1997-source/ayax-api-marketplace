"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Smartphone,
  Phone,
  Wallet,
  KeyRound,
  Activity,
  Server,
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
  BadgePercent,
} from "lucide-react";

import api from "@/lib/api";
import { socket } from "@/lib/socket";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const SERVICE_CODE = "AIRTIME";

const LANGUAGES = [
  "cURL",
  "Node.js",
  "PHP",
  "Laravel",
  "Python",
  "React Native",
];

const DEFAULT_NETWORKS = [
  {
    id: "MTN",
    code: "MTN",
    name: "MTN",
    discount: 2,
    status: "ACTIVE",
    minimumAmount: 50,
    maximumAmount: 50000,
  },
  {
    id: "AIRTEL",
    code: "AIRTEL",
    name: "Airtel",
    discount: 2,
    status: "ACTIVE",
    minimumAmount: 50,
    maximumAmount: 50000,
  },
  {
    id: "GLO",
    code: "GLO",
    name: "Glo",
    discount: 2,
    status: "ACTIVE",
    minimumAmount: 50,
    maximumAmount: 50000,
  },
  {
    id: "9MOBILE",
    code: "9MOBILE",
    name: "9mobile",
    discount: 2,
    status: "ACTIVE",
    minimumAmount: 50,
    maximumAmount: 50000,
  },
];

const QUICK_AMOUNTS = [
  100,
  200,
  500,
  1000,
  2000,
  5000,
];

const INITIAL_RESPONSE = {
  success: true,
  message:
    "Your live Airtime API response will appear here.",
  data: {
    reference: "AYAX-AIRTIME-XXXXXXXX",
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

const normalizeNetwork = (item = {}) => ({
  id:
    item.id ||
    item.code ||
    item.networkCode ||
    item.slug,

  code: String(
    item.code ||
      item.networkCode ||
      item.id ||
      item.slug ||
      ""
  ).toUpperCase(),

  name:
    item.name ||
    item.displayName ||
    item.networkName ||
    "Network",

  discount: Number(
    item.discount ??
      item.discountPercent ??
      item.commission ??
      0
  ),

  status: String(
    item.status || "ACTIVE"
  ).toUpperCase(),

  minimumAmount: Number(
    item.minimumAmount || 50
  ),

  maximumAmount: Number(
    item.maximumAmount || 50000
  ),
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

export default function AirtimeDeveloperApiPage() {
  const [wallet, setWallet] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [recentRequests, setRecentRequests] =
    useState([]);

  const [selectedNetwork, setSelectedNetwork] =
    useState(null);

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [amount, setAmount] = useState("");

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

  const fetchNetworks = useCallback(async () => {
    const possibleRoutes = [
      "/airtime/networks",
      "/airtime/providers",
      "/networks?service=AIRTIME",
    ];

    for (const route of possibleRoutes) {
      try {
        const response = await api.get(route);

        const list =
          response.data?.networks ||
          response.data?.providers ||
          response.data?.services ||
          response.data?.data?.networks ||
          response.data?.data ||
          [];

        const normalized = Array.isArray(list)
          ? list
              .map(normalizeNetwork)
              .filter(
                (item) =>
                  item.id &&
                  item.status === "ACTIVE"
              )
          : [];

        const finalNetworks =
          normalized.length > 0
            ? normalized
            : DEFAULT_NETWORKS;

        setNetworks(finalNetworks);

        setSelectedNetwork((current) => {
          if (current) {
            const existing =
              finalNetworks.find(
                (item) =>
                  item.code === current.code
              );

            if (existing) {
              return existing;
            }
          }

          return finalNetworks[0] || null;
        });

        return finalNetworks;
      } catch (error) {
        if (error?.response?.status !== 404) {
          throw error;
        }
      }
    }

    setNetworks(DEFAULT_NETWORKS);

    setSelectedNetwork((current) => {
      return current || DEFAULT_NETWORKS[0];
    });

    return DEFAULT_NETWORKS;
  }, []);

  const fetchRecentRequests =
    useCallback(async () => {
      const routes = [
        `/transactions?service=${SERVICE_CODE}`,
        `/wallet/transactions?service=${SERVICE_CODE}`,
      ];

      for (const route of routes) {
        try {
          const response = await api.get(route);

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
                    service.includes("AIRTIME") ||
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
            fetchApiKeys(),
            fetchNetworks(),
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
              "Some Airtime API information could not be loaded."
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
      fetchApiKeys,
      fetchNetworks,
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

    const refreshNetworks = () => {
      fetchNetworks().catch(console.error);
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
      "airtime-purchase-successful",
      refreshWalletAndRequests
    );

    socket.on(
      "transaction-updated",
      refreshWalletAndRequests
    );

    socket.on(
      "airtime-networks-updated",
      refreshNetworks
    );

    socket.on(
      "airtime-pricing-updated",
      refreshNetworks
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
        "airtime-purchase-successful",
        refreshWalletAndRequests
      );

      socket.off(
        "transaction-updated",
        refreshWalletAndRequests
      );

      socket.off(
        "airtime-networks-updated",
        refreshNetworks
      );

      socket.off(
        "airtime-pricing-updated",
        refreshNetworks
      );

      socket.off(
        "api-key-created",
        refreshKeys
      );
    };
  }, [
    loadPage,
    fetchWallet,
    fetchApiKeys,
    fetchNetworks,
    fetchRecentRequests,
  ]);

  const activeApiKey =
    apiKeys?.[0]?.key || "";

  const numericAmount = Number(amount || 0);

  const discountPercent = Number(
    selectedNetwork?.discount || 0
  );

  const estimatedCharge = useMemo(() => {
    if (!Number.isFinite(numericAmount)) {
      return 0;
    }

    const discountAmount =
      (numericAmount * discountPercent) / 100;

    return Math.max(
      numericAmount - discountAmount,
      0
    );
  }, [numericAmount, discountPercent]);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://ayax-api-marketplace.onrender.com/api/v1";

  const fullBuyEndpoint =
    `${apiBaseUrl.replace(
      /\/$/,
      ""
    )}/airtime/buy`;

  const fullNetworksEndpoint =
    `${apiBaseUrl.replace(
      /\/$/,
      ""
    )}/airtime/networks`;

  const requestBody = useMemo(
    () => ({
      network:
        selectedNetwork?.code || "MTN",

      phoneNumber:
        phoneNumber || "08012345678",

      amount:
        Number(amount || 100),
    }),
    [
      selectedNetwork,
      phoneNumber,
      amount,
    ]
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

async function buyAirtime() {
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

buyAirtime();`,

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

export async function buyAirtime() {
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
      "Airtime purchase failed"
    );
  }
}`,
    };
  }, [
    requestBody,
    fullBuyEndpoint,
    activeApiKey,
  ]);

  const testAirtimeApi = async (event) => {
    event.preventDefault();

    if (!selectedNetwork) {
      setMessageType("error");

      setMessage(
        "Select an active airtime network."
      );

      return;
    }

    const cleanPhone =
      phoneNumber
        .replace(/\s+/g, "")
        .trim();

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

    const minimumAmount = Number(
      selectedNetwork.minimumAmount || 50
    );

    const maximumAmount = Number(
      selectedNetwork.maximumAmount || 50000
    );

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < minimumAmount
    ) {
      setMessageType("error");

      setMessage(
        `Minimum airtime amount is ${formatNaira(
          minimumAmount
        )}.`
      );

      return;
    }

    if (numericAmount > maximumAmount) {
      setMessageType("error");

      setMessage(
        `Maximum airtime amount is ${formatNaira(
          maximumAmount
        )}.`
      );

      return;
    }

    if (
      Number(wallet?.balance || 0) <
      estimatedCharge
    ) {
      setMessageType("error");

      setMessage(
        "Insufficient wallet balance."
      );

      return;
    }

    try {
      setTesting(true);
      setMessage("");

      const response = await api.post(
        "/airtime/buy",
        {
          network:
            selectedNetwork.code,

          providerCode:
            selectedNetwork.code,

          phoneNumber:
            cleanPhone,

          phone:
            cleanPhone,

          recipient:
            cleanPhone,

          amount:
            numericAmount,

          serviceCode:
            SERVICE_CODE,
        }
      );

      setApiResponse(response.data);

      setMessageType("success");

      setMessage(
        response.data?.message ||
          "Airtime API test completed successfully."
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
            "Airtime API test failed."
          ),
        };

      setApiResponse(errorResponse);

      setMessageType("error");

      setMessage(
        getErrorMessage(
          error,
          "Airtime API test failed."
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
        title="Airtime API"
        description="Networks, pricing, live testing and integration examples."
      >
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />

            Loading Airtime API...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Airtime API"
      description="View supported networks, test airtime requests and integrate Ayax Airtime API."
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
          icon={<Server size={22} />}
          label="Supported Networks"
          value={networks.length}
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
            Airtime Networks
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Select a network to view the current
            developer discount and test the API.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {networks.map((network) => {
            const selected =
              selectedNetwork?.code ===
              network.code;

            return (
              <button
                key={network.id}
                type="button"
                onClick={() => {
                  setSelectedNetwork(network);

                  setApiResponse(
                    INITIAL_RESPONSE
                  );
                }}
                className={`rounded-3xl border p-6 text-left transition ${
                  selected
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-800 bg-slate-950 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                    <Smartphone size={24} />
                  </div>

                  {selected && (
                    <CheckCircle2
                      size={20}
                      className="text-blue-400"
                    />
                  )}
                </div>

                <h3 className="mt-5 text-2xl font-extrabold">
                  {network.name}
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Airtime Recharge API
                </p>

                <div className="mt-5 flex items-center gap-2 text-blue-400">
                  <BadgePercent size={19} />

                  <span className="text-2xl font-extrabold">
                    {network.discount}%
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Developer discount
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-8 grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <form
          onSubmit={testAirtimeApi}
          className="h-fit rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold">
              Live API Tester
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Test an airtime request using your
              authenticated developer account.
            </p>
          </div>

          <div className="space-y-5">
            <ReadOnlyField
              label="Network"
              value={
                selectedNetwork?.name ||
                "No network selected"
              }
            />

            <ReadOnlyField
              label="Developer Discount"
              value={`${discountPercent}%`}
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
                  value={phoneNumber}
                  onChange={(event) =>
                    setPhoneNumber(
                      event.target.value
                    )
                  }
                  placeholder="08012345678"
                  required
                  className="w-full bg-transparent py-4 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400">
                Airtime Amount
              </label>

              <input
                type="number"
                min={
                  selectedNetwork
                    ?.minimumAmount || 50
                }
                max={
                  selectedNetwork
                    ?.maximumAmount || 50000
                }
                step="1"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value
                  )
                }
                placeholder="Enter amount"
                required
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {QUICK_AMOUNTS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setAmount(String(item))
                  }
                  className="rounded-xl bg-slate-800 py-3 text-sm hover:bg-slate-700"
                >
                  {formatNaira(item)}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-blue-200">
                    Airtime Value
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {formatNaira(
                      numericAmount
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-blue-200">
                    Estimated Charge
                  </p>

                  <p className="mt-1 text-xl font-bold text-green-400">
                    {formatNaira(
                      estimatedCharge
                    )}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                testing ||
                !selectedNetwork ||
                !phoneNumber ||
                !amount
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
                  Test Airtime API
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
              Call the Airtime API from your
              secured backend server.
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
            label="Networks Endpoint"
            value={fullNetworksEndpoint}
            copy
            copied={
              copiedField ===
              "networks-endpoint"
            }
            onCopy={() =>
              copyText(
                fullNetworksEndpoint,
                "networks-endpoint"
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
              Recent Airtime Requests
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Your latest Airtime API
              transactions.
            </p>
          </div>
        </div>

        {recentRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-500">
            No airtime request found yet.
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
                    {item.phoneNumber}
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
            Live response from Ayax Airtime API
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