"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Lightbulb,
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
  Hash,
  Phone,
  ShieldCheck,
  Zap,
  User,
  MapPin,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const SERVICE_CODE = "ELECTRICITY";

const LANGUAGES = [
  "cURL",
  "Node.js",
  "PHP",
  "Laravel",
  "Python",
  "React Native",
];

const DEFAULT_PROVIDERS = [
  {
    id: "AEDC",
    code: "AEDC",
    name: "Abuja Electricity Distribution Company",
    shortName: "AEDC",
    status: "ACTIVE",
    minimumAmount: 100,
    maximumAmount: 500000,
  },
  {
    id: "EEDC",
    code: "EEDC",
    name: "Enugu Electricity Distribution Company",
    shortName: "EEDC",
    status: "ACTIVE",
    minimumAmount: 100,
    maximumAmount: 500000,
  },
  {
    id: "EKEDC",
    code: "EKEDC",
    name: "Eko Electricity Distribution Company",
    shortName: "EKEDC",
    status: "ACTIVE",
    minimumAmount: 100,
    maximumAmount: 500000,
  },
  {
    id: "IBEDC",
    code: "IBEDC",
    name: "Ibadan Electricity Distribution Company",
    shortName: "IBEDC",
    status: "ACTIVE",
    minimumAmount: 100,
    maximumAmount: 500000,
  },
  {
    id: "IKEDC",
    code: "IKEDC",
    name: "Ikeja Electricity Distribution Company",
    shortName: "IKEDC",
    status: "ACTIVE",
    minimumAmount: 100,
    maximumAmount: 500000,
  },
  {
    id: "JEDC",
    code: "JEDC",
    name: "Jos Electricity Distribution Company",
    shortName: "JEDC",
    status: "ACTIVE",
    minimumAmount: 100,
    maximumAmount: 500000,
  },
  {
    id: "KAEDCO",
    code: "KAEDCO",
    name: "Kaduna Electricity Distribution Company",
    shortName: "KAEDCO",
    status: "ACTIVE",
    minimumAmount: 100,
    maximumAmount: 500000,
  },
  {
    id: "KEDCO",
    code: "KEDCO",
    name: "Kano Electricity Distribution Company",
    shortName: "KEDCO",
    status: "ACTIVE",
    minimumAmount: 100,
    maximumAmount: 500000,
  },
  {
    id: "PHED",
    code: "PHED",
    name: "Port Harcourt Electricity Distribution Company",
    shortName: "PHED",
    status: "ACTIVE",
    minimumAmount: 100,
    maximumAmount: 500000,
  },
  {
    id: "BEDC",
    code: "BEDC",
    name: "Benin Electricity Distribution Company",
    shortName: "BEDC",
    status: "ACTIVE",
    minimumAmount: 100,
    maximumAmount: 500000,
  },
  {
    id: "YEDC",
    code: "YEDC",
    name: "Yola Electricity Distribution Company",
    shortName: "YEDC",
    status: "ACTIVE",
    minimumAmount: 100,
    maximumAmount: 500000,
  },
];

const INITIAL_RESPONSE = {
  success: true,
  message:
    "Your live Electricity API response will appear here.",
  data: {
    reference: "AYAX-ELECTRICITY-XXXXXXXX",
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

const normalizeProvider = (provider = {}) => ({
  id:
    provider.id ||
    provider.code ||
    provider.serviceCode ||
    provider.slug,

  code: String(
    provider.code ||
      provider.serviceCode ||
      provider.id ||
      provider.slug ||
      ""
  ).toUpperCase(),

  name:
    provider.name ||
    provider.displayName ||
    provider.providerName ||
    "Electricity Provider",

  shortName:
    provider.shortName ||
    provider.code ||
    provider.serviceCode ||
    provider.name ||
    "DISCO",

  status: String(
    provider.status || "ACTIVE"
  ).toUpperCase(),

  minimumAmount: Number(
    provider.minimumAmount || 100
  ),

  maximumAmount: Number(
    provider.maximumAmount || 500000
  ),
});

const normalizeApiKey = (item = {}) => ({
  id: item.id,
  key: item.key || item.apiKey || "",
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

  provider:
    item.provider ||
    item.providerCode ||
    "-",

  meterNumber:
    item.meterNumber ||
    item.accountNumber ||
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

export default function ElectricityDeveloperApiPage() {
  const [wallet, setWallet] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [providers, setProviders] = useState([]);
  const [recentRequests, setRecentRequests] =
    useState([]);

  const [selectedProvider, setSelectedProvider] =
    useState(null);

  const [providerSearch, setProviderSearch] =
    useState("");

  const [meterType, setMeterType] =
    useState("PREPAID");

  const [meterNumber, setMeterNumber] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [amount, setAmount] = useState("");

  const [customer, setCustomer] = useState(null);

  const [
    verificationReference,
    setVerificationReference,
  ] = useState("");

  const [apiResponse, setApiResponse] =
    useState(INITIAL_RESPONSE);

  const [activeLanguage, setActiveLanguage] =
    useState("cURL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [verifying, setVerifying] =
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
      const response = await api.get("/api-keys");

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

  const fetchProviders = useCallback(async () => {
    try {
      const response = await api.get(
        "/electricity/providers"
      );

      const list =
        response.data?.providers ||
        response.data?.discos ||
        response.data?.services ||
        response.data?.data?.providers ||
        response.data?.data ||
        [];

      const normalized = Array.isArray(list)
        ? list
            .map(normalizeProvider)
            .filter(
              (item) =>
                item.id &&
                item.status === "ACTIVE"
            )
        : [];

      const finalProviders =
        normalized.length > 0
          ? normalized
          : DEFAULT_PROVIDERS;

      setProviders(finalProviders);

      setSelectedProvider((current) => {
        if (current) {
          const existing =
            finalProviders.find(
              (item) =>
                item.code === current.code
            );

          if (existing) {
            return existing;
          }
        }

        return finalProviders[0] || null;
      });

      return finalProviders;
    } catch (error) {
      if (error?.response?.status === 404) {
        setProviders(DEFAULT_PROVIDERS);

        setSelectedProvider((current) => {
          return current || DEFAULT_PROVIDERS[0];
        });

        return DEFAULT_PROVIDERS;
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
          const response = await api.get(route);

          const list =
            response.data?.transactions ||
            response.data?.requests ||
            response.data?.data?.transactions ||
            response.data?.data ||
            [];

          const normalized = Array.isArray(list)
            ? list
                .filter((item) => {
                  const service = String(
                    item.service ||
                      item.serviceCode ||
                      item.description ||
                      ""
                  ).toUpperCase();

                  return (
                    service.includes("ELECTRICITY") ||
                    service.includes("POWER") ||
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
            fetchProviders(),
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
              "Some Electricity API information could not be loaded."
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
      fetchProviders,
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

    const refreshProviders = () => {
      fetchProviders().catch(console.error);
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
      "electricity-purchase-successful",
      refreshWalletAndRequests
    );

    socket.on(
      "electricity-providers-updated",
      refreshProviders
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
        "electricity-purchase-successful",
        refreshWalletAndRequests
      );

      socket.off(
        "electricity-providers-updated",
        refreshProviders
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
    fetchProviders,
    fetchRecentRequests,
  ]);

  const filteredProviders = useMemo(() => {
    const query = providerSearch
      .trim()
      .toLowerCase();

    return providers.filter((provider) => {
      return (
        !query ||
        provider.name
          .toLowerCase()
          .includes(query) ||
        provider.shortName
          .toLowerCase()
          .includes(query) ||
        provider.code
          .toLowerCase()
          .includes(query)
      );
    });
  }, [providers, providerSearch]);

  const activeApiKey =
    apiKeys?.[0]?.key || "";

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://ayax-api-marketplace.onrender.com/api/v1";

  const fullBuyEndpoint =
    `${apiBaseUrl.replace(
      /\/$/,
      ""
    )}/electricity/buy`;

  const fullVerifyEndpoint =
    `${apiBaseUrl.replace(
      /\/$/,
      ""
    )}/electricity/verify`;

  const requestBody = useMemo(
    () => ({
      providerCode:
        selectedProvider?.code || "AEDC",

      meterNumber:
        meterNumber || "12345678901",

      meterType,

      amount: Number(amount || 1000),

      phoneNumber:
        phoneNumber || "08012345678",
    }),
    [
      selectedProvider,
      meterNumber,
      meterType,
      amount,
      phoneNumber,
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

async function buyElectricity() {
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

buyElectricity();`,

      PHP: `<?php

$payload = ${JSON.stringify(requestBody)};

$curl = curl_init("${fullBuyEndpoint}");

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

export async function buyElectricity() {
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
      "Electricity purchase failed"
    );
  }
}`,
    };
  }, [
    requestBody,
    fullBuyEndpoint,
    activeApiKey,
  ]);

  const validateMeterNumber = () => {
    const cleanMeter =
      meterNumber.replace(/\D/g, "");

    if (
      cleanMeter.length < 6 ||
      cleanMeter.length > 20
    ) {
      setMessageType("error");

      setMessage(
        "Enter a valid meter number."
      );

      return null;
    }

    return cleanMeter;
  };

  const verifyMeter = async () => {
    if (!selectedProvider) {
      setMessageType("error");

      setMessage(
        "Select an electricity provider."
      );

      return;
    }

    const cleanMeter =
      validateMeterNumber();

    if (!cleanMeter) {
      return;
    }

    try {
      setVerifying(true);
      setMessage("");
      setCustomer(null);

      const response = await api.post(
        "/electricity/verify",
        {
          provider:
            selectedProvider.code,

          providerCode:
            selectedProvider.code,

          meterNumber: cleanMeter,

          meterType,
        }
      );

      const source =
        response.data?.customer ||
        response.data?.customerInfo ||
        response.data?.data?.customer ||
        response.data?.data ||
        null;

      if (!source) {
        throw new Error(
          "Customer information was not returned."
        );
      }

      setCustomer({
        name:
          source.name ||
          source.customerName ||
          source.fullName ||
          "Verified Customer",

        address:
          source.address ||
          source.customerAddress ||
          source.location ||
          "-",

        meterNumber:
          source.meterNumber ||
          cleanMeter,

        accountNumber:
          source.accountNumber ||
          source.account ||
          null,

        minimumAmount: Number(
          source.minimumAmount ||
            selectedProvider.minimumAmount ||
            100
        ),
      });

      setVerificationReference(
        response.data?.reference ||
          response.data?.verificationReference ||
          response.data?.data?.reference ||
          ""
      );

      setApiResponse(response.data);

      setMessageType("success");

      setMessage(
        response.data?.message ||
          "Meter verified successfully."
      );
    } catch (error) {
      const errorResponse =
        error?.response?.data || {
          success: false,
          message: getErrorMessage(
            error,
            "Meter verification failed."
          ),
        };

      setApiResponse(errorResponse);

      setMessageType("error");

      setMessage(
        getErrorMessage(
          error,
          "Meter verification failed."
        )
      );
    } finally {
      setVerifying(false);
    }
  };

  const testElectricityApi = async (event) => {
    event.preventDefault();

    if (!selectedProvider) {
      setMessageType("error");
      setMessage(
        "Select an electricity provider."
      );
      return;
    }

    const cleanMeter =
      validateMeterNumber();

    if (!cleanMeter) {
      return;
    }

    const cleanPhone =
      phoneNumber.replace(/\s+/g, "");

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

    const numericAmount = Number(amount);

    const minimumAmount = Number(
      customer?.minimumAmount ||
        selectedProvider.minimumAmount ||
        100
    );

    const maximumAmount = Number(
      selectedProvider.maximumAmount ||
        500000
    );

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < minimumAmount
    ) {
      setMessageType("error");

      setMessage(
        `Minimum amount is ${formatNaira(
          minimumAmount
        )}.`
      );

      return;
    }

    if (numericAmount > maximumAmount) {
      setMessageType("error");

      setMessage(
        `Maximum amount is ${formatNaira(
          maximumAmount
        )}.`
      );

      return;
    }

    if (
      Number(wallet?.balance || 0) <
      numericAmount
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
        "/electricity/buy",
        {
          provider:
            selectedProvider.code,

          providerCode:
            selectedProvider.code,

          meterNumber: cleanMeter,

          meterType,

          amount: numericAmount,

          phoneNumber: cleanPhone,

          verificationReference:
            verificationReference || undefined,

          serviceCode: SERVICE_CODE,
        }
      );

      setApiResponse(response.data);

      setMessageType("success");

      setMessage(
        response.data?.message ||
          "Electricity API test completed successfully."
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
            "Electricity API test failed."
          ),
        };

      setApiResponse(errorResponse);

      setMessageType("error");

      setMessage(
        getErrorMessage(
          error,
          "Electricity API test failed."
        )
      );
    } finally {
      setTesting(false);
    }
  };

  const copyText = async (text, field) => {
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
        title="Electricity API"
        description="Providers, meter verification and API testing."
      >
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />

            Loading Electricity API...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Electricity API"
      description="View supported distribution companies, verify meters and integrate electricity payments."
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
          label="Supported Discos"
          value={providers.length}
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
            Electricity Providers
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Select a distribution company for
            meter verification and API testing.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
          <Search
            size={18}
            className="text-slate-500"
          />

          <input
            value={providerSearch}
            onChange={(event) =>
              setProviderSearch(
                event.target.value
              )
            }
            placeholder="Search AEDC, KEDCO, YEDC..."
            className="w-full bg-transparent py-4 outline-none"
          />
        </div>

        {filteredProviders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-500">
            No electricity provider found.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {filteredProviders.map(
              (provider) => {
                const selected =
                  selectedProvider?.code ===
                  provider.code;

                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(
                        provider
                      );

                      setCustomer(null);

                      setVerificationReference(
                        ""
                      );

                      setApiResponse(
                        INITIAL_RESPONSE
                      );
                    }}
                    className={`rounded-3xl border p-6 text-left transition ${
                      selected
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400">
                        <Lightbulb size={24} />
                      </div>

                      {selected && (
                        <CheckCircle2
                          size={20}
                          className="text-yellow-400"
                        />
                      )}
                    </div>

                    <h3 className="mt-5 text-xl font-bold">
                      {provider.shortName}
                    </h3>

                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                      {provider.name}
                    </p>
                  </button>
                );
              }
            )}
          </div>
        )}
      </section>

      <section className="mb-8 grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <form
          onSubmit={testElectricityApi}
          className="h-fit rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold">
              Live API Tester
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Verify a meter and test an
              electricity payment request.
            </p>
          </div>

          <div className="space-y-5">
            <ReadOnlyField
              label="Distribution Company"
              value={
                selectedProvider?.shortName ||
                "No provider selected"
              }
            />

            <div>
              <label className="text-sm text-slate-400">
                Meter Type
              </label>

              <div className="mt-2 grid grid-cols-2 gap-3">
                {["PREPAID", "POSTPAID"].map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setMeterType(type);
                        setCustomer(null);
                        setVerificationReference(
                          ""
                        );
                      }}
                      className={`rounded-2xl border px-4 py-4 font-semibold ${
                        meterType === type
                          ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                          : "border-slate-800 bg-slate-950 text-slate-400"
                      }`}
                    >
                      {type}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400">
                Meter Number
              </label>

              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-yellow-500">
                <Hash
                  size={18}
                  className="text-slate-500"
                />

                <input
                  inputMode="numeric"
                  value={meterNumber}
                  onChange={(event) => {
                    setMeterNumber(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 20)
                    );

                    setCustomer(null);
                    setVerificationReference("");
                  }}
                  placeholder="Enter meter number"
                  required
                  className="w-full bg-transparent py-4 outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={verifyMeter}
              disabled={
                verifying ||
                !selectedProvider ||
                !meterNumber
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 py-4 font-semibold hover:bg-slate-700 disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />

                  Verifying Meter...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Verify Meter
                </>
              )}
            </button>

            {customer && (
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 size={18} />

                  <p className="font-bold">
                    Meter Verified
                  </p>
                </div>

                <CustomerInfo
                  icon={<User size={16} />}
                  label="Customer"
                  value={customer.name}
                />

                <CustomerInfo
                  icon={<MapPin size={16} />}
                  label="Address"
                  value={customer.address}
                />
              </div>
            )}

            <div>
              <label className="text-sm text-slate-400">
                Phone Number
              </label>

              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-yellow-500">
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
                Amount
              </label>

              <input
                type="number"
                value={amount}
                min={
                  customer?.minimumAmount ||
                  selectedProvider?.minimumAmount ||
                  100
                }
                onChange={(event) =>
                  setAmount(
                    event.target.value
                  )
                }
                placeholder="Enter amount"
                required
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-yellow-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1000, 2000, 5000, 10000].map(
                (quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() =>
                      setAmount(
                        String(quickAmount)
                      )
                    }
                    className="rounded-xl bg-slate-800 py-3 text-sm hover:bg-slate-700"
                  >
                    {formatNaira(
                      quickAmount
                    )}
                  </button>
                )
              )}
            </div>

            <button
              type="submit"
              disabled={
                testing ||
                !selectedProvider ||
                !meterNumber ||
                !phoneNumber ||
                !amount
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-500 py-4 font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-50"
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
                  Test Electricity API
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
              Use the verification and payment
              endpoints from your backend.
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
            label="Payment Endpoint"
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
            label="Verification Endpoint"
            value={fullVerifyEndpoint}
            copy
            copied={
              copiedField ===
              "verify-endpoint"
            }
            onCopy={() =>
              copyText(
                fullVerifyEndpoint,
                "verify-endpoint"
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
              Recent Electricity Requests
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Your latest electricity API
              transactions.
            </p>
          </div>
        </div>

        {recentRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-500">
            No electricity request found yet.
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
                    {item.provider} • Meter:{" "}
                    {item.meterNumber}
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
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400">
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

function CustomerInfo({
  icon,
  label,
  value,
}) {
  return (
    <div className="mt-3 flex items-start gap-3">
      <span className="mt-0.5 text-green-400">
        {icon}
      </span>

      <div>
        <p className="text-xs text-green-300/70">
          {label}
        </p>

        <p className="mt-1 break-all font-semibold text-green-100">
          {value || "-"}
        </p>
      </div>
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
            Live response from Ayax Electricity API
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

      <pre className="min-h-[550px] max-h-[720px] overflow-auto bg-slate-950 p-6 text-sm leading-7 text-green-300">
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