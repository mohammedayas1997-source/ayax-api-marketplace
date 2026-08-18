"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Tv,
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
  Clock,
  FileJson,
  Hash,
  Phone,
  Package,
  UserCheck,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const SERVICE_CODE = "CABLE_TV";
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
    id: "dstv",
    code: "DSTV",
    name: "DStv",
    status: "ACTIVE",
  },
  {
    id: "gotv",
    code: "GOTV",
    name: "GOtv",
    status: "ACTIVE",
  },
  {
    id: "startimes",
    code: "STARTIMES",
    name: "StarTimes",
    status: "ACTIVE",
  },
];

const INITIAL_RESPONSE = {
  success: true,
  message: "Your live Cable TV API response will appear here.",
  data: {
    reference: "AYAX_CABLE_XXXXXXXX",
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

const normalizePackage = (item = {}, providerCode = "") => ({
  id: item.id || item.packageCode,
  code: item.packageCode || item.code || item.id,
  name: item.name || item.packageName || "Cable Package",
  providerCode: String(item.cableTv || providerCode).toUpperCase(),
  price: Number(item.apiPrice ?? item.price ?? 0),
  status: item.isActive !== false ? "ACTIVE" : "INACTIVE",
});

const normalizeApiKey = (item = {}) => ({
  id: item.id,
  name: item.name || "Live API Key",
  key: item.key || item.apiKey || "",
  status: String(item.status || "ACTIVE").toUpperCase(),
});

const normalizeRequest = (item = {}) => ({
  id: item.id || item.reference || `${Date.now()}-${Math.random()}`,
  reference: item.reference || "-",
  provider: item.metadata?.cableTv || item.description || "CABLE",
  packageName: item.description || "Cable Subscription",
  amount: Number(item.amount || 0),
  status: String(item.status || "PENDING").toUpperCase(),
  createdAt: item.createdAt || null,
});

export default function CableDeveloperApiPage() {
  const [wallet, setWallet] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  const [packages, setPackages] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);

  const [selectedProvider, setSelectedProvider] = useState(DEFAULT_PROVIDERS[0]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [smartcardNumber, setSmartcardNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [apiResponse, setApiResponse] = useState(INITIAL_RESPONSE);
  const [activeLanguage, setActiveLanguage] = useState("cURL");
  const [providerSearch, setProviderSearch] = useState("");
  const [packageSearch, setPackageSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [testing, setTesting] = useState(false);

  const [copiedField, setCopiedField] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const fetchWallet = useCallback(async () => {
    try {
      const response = await api.get("/wallet");
      const walletData =
        response.data?.wallet ||
        response.data?.data?.wallet ||
        response.data?.data ||
        null;
      setWallet(walletData);
      return walletData;
    } catch {
      return null;
    }
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
        ? list.map(normalizeApiKey).filter((item) => item.status === "ACTIVE")
        : [];

      setApiKeys(keys);
      return keys;
    } catch {
      setApiKeys([]);
      return [];
    }
  }, []);

  const fetchPackages = useCallback(async (providerCode) => {
    if (!providerCode) {
      setPackages([]);
      setSelectedPackage(null);
      return [];
    }

    try {
      setLoadingPackages(true);
      const response = await api.get("/bills/cable/packages", {
        params: {
          cableTv: String(providerCode).toLowerCase(),
        },
      });

      const list =
        response.data?.packages ||
        response.data?.data ||
        [];

      const normalized = Array.isArray(list)
        ? list.map((item) => normalizePackage(item, providerCode))
        : [];

      setPackages(normalized);
      setSelectedPackage(normalized[0] || null);
      return normalized;
    } catch (error) {
      setPackages([]);
      setSelectedPackage(null);
      return [];
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  const fetchRecentRequests = useCallback(async () => {
    try {
      const response = await api.get("/transactions?service=CABLE_TV");
      const list =
        response.data?.transactions ||
        response.data?.data ||
        [];

      const normalized = Array.isArray(list)
        ? list.map(normalizeRequest)
        : [];

      setRecentRequests(normalized);
      return normalized;
    } catch {
      setRecentRequests([]);
      return [];
    }
  }, []);

  const loadPage = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);

        setMessage("");

        await Promise.allSettled([
          fetchWallet(),
          fetchApiKeys(),
          fetchRecentRequests(),
          fetchPackages(selectedProvider?.code || "DSTV"),
        ]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWallet, fetchApiKeys, fetchRecentRequests, fetchPackages, selectedProvider]
  );

  useEffect(() => {
    loadPage();

    const token = localStorage.getItem("token");
    if (token) socket.auth = { token };
    if (!socket.connected) socket.connect();

    const refreshData = () => {
      fetchWallet().catch(console.error);
      fetchRecentRequests().catch(console.error);
    };

    socket.on("wallet-updated", refreshData);
    socket.on("transaction-updated", refreshData);

    return () => {
      socket.off("wallet-updated", refreshData);
      socket.off("transaction-updated", refreshData);
    };
  }, [loadPage, fetchWallet, fetchRecentRequests]);

  const chooseProvider = async (provider) => {
    setSelectedProvider(provider);
    setSelectedPackage(null);
    setPackages([]);
    setCustomerName("");
    setMessage("");
    await fetchPackages(provider.code);
  };

  // Verify IUC / SmartCard Number
  const verifySmartcard = async () => {
    const cleanSmartcard = smartcardNumber.replace(/\D/g, "").trim();
    if (cleanSmartcard.length < 5) {
      setMessageType("error");
      setMessage("Enter a valid smartcard or IUC number to verify.");
      return;
    }

    try {
      setVerifying(true);
      setMessage("");
      setCustomerName("");

      const response = await api.post("/bills/cable/verify", {
        cableTv: selectedProvider.code.toLowerCase(),
        smartCardNo: cleanSmartcard,
      });

      const name = response.data?.data?.customerName || response.data?.customerName;
      if (name) {
        setCustomerName(name);
        setMessageType("success");
        setMessage(`Verified Customer: ${name}`);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(getErrorMessage(error, "Unable to verify smartcard number."));
    } finally {
      setVerifying(false);
    }
  };

  const activeApiKey = apiKeys?.[0]?.key || "";
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://ayax-api-marketplace.onrender.com/api/v1";

  const fullEndpoint = `${apiBaseUrl.replace(/\/$/, "")}/bills/cable/buy`;

  const requestBody = useMemo(
    () => ({
      cableTv: (selectedProvider?.code || "DSTV").toLowerCase(),
      packageCode: selectedPackage?.code || "01",
      smartCardNo: smartcardNumber || "1234567890",
      phone: phoneNumber || "08012345678",
      amount: selectedPackage?.price || 3500,
    }),
    [selectedProvider, selectedPackage, smartcardNumber, phoneNumber]
  );

  const codeExamples = useMemo(() => {
    const body = JSON.stringify(requestBody, null, 2);
    const apiKey = activeApiKey || "YOUR_AYAX_API_KEY";

    return {
      cURL: `curl --request POST \\
  --url '${fullEndpoint}' \\
  --header 'Content-Type: application/json' \\
  --header 'x-api-key: ${apiKey}' \\
  --data '${body}'`,

      "Node.js": `const axios = require("axios");

async function buyCableSubscription() {
  try {
    const response = await axios.post(
      "${fullEndpoint}",
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
    console.error(error.response?.data || error.message);
  }
}

buyCableSubscription();`,

      PHP: `<?php

$payload = ${JSON.stringify(requestBody)};

$curl = curl_init("${fullEndpoint}");

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
    "${fullEndpoint}",
    ${body}
);

return $response->json();`,

      Python: `import requests

url = "${fullEndpoint}"

headers = {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey}"
}

payload = ${body.replace(/true/g, "True").replace(/false/g, "False").replace(/null/g, "None")}

response = requests.post(
    url,
    json=payload,
    headers=headers,
    timeout=30
)

print(response.json())`,

      "React Native": `import axios from "axios";

export async function buyCableSubscription() {
  try {
    const response = await axios.post(
      "${fullEndpoint}",
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
    throw new Error(error.response?.data?.message || "Cable subscription failed");
  }
}`,
    };
  }, [requestBody, fullEndpoint, activeApiKey]);

  // Test Live Subscription
  const testCableApi = async (event) => {
    event.preventDefault();

    if (!selectedProvider || !selectedPackage) {
      setMessageType("error");
      setMessage("Select a cable provider and package.");
      return;
    }

    const cleanSmartcard = smartcardNumber.replace(/\D/g, "").trim();
    if (cleanSmartcard.length < 5) {
      setMessageType("error");
      setMessage("Enter a valid smartcard or IUC number.");
      return;
    }

    const cleanPhone = phoneNumber.replace(/\s+/g, "").trim();
    if (!/^(\+234|0)[789][01]\d{8}$/.test(cleanPhone)) {
      setMessageType("error");
      setMessage("Enter a valid Nigerian phone number.");
      return;
    }

    if (Number(wallet?.balance || 0) < Number(selectedPackage.price || 0)) {
      setMessageType("error");
      setMessage("Insufficient wallet balance for this package.");
      return;
    }

    try {
      setTesting(true);
      setMessage("");

      // Cikakken kiran da ya dace da backend/src/controllers/bills.controller.js
      const response = await api.post("/bills/cable/buy", {
        cableTv: selectedProvider.code.toLowerCase(),
        packageCode: selectedPackage.code,
        smartCardNo: cleanSmartcard,
        phone: cleanPhone,
        amount: Number(selectedPackage.price),
      });

      setApiResponse(response.data);
      setMessageType("success");
      setMessage(response.data?.message || "Cable TV subscription successful.");

      await Promise.allSettled([fetchWallet(), fetchRecentRequests()]);
    } catch (error) {
      const errorResponse = error?.response?.data || {
        success: false,
        message: getErrorMessage(error, "Cable TV API test failed."),
      };

      setApiResponse(errorResponse);
      setMessageType("error");
      setMessage(getErrorMessage(error, "Cable TV API test failed."));
    } finally {
      setTesting(false);
    }
  };

  const copyText = async (text, field) => {
    try {
      await navigator.clipboard.writeText(String(text));
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(""), 1800);
    } catch {
      setMessageType("error");
      setMessage("Unable to copy to clipboard.");
    }
  };

  const filteredPackages = useMemo(() => {
    const query = packageSearch.trim().toLowerCase();
    return packages.filter((item) => {
      return (
        !query ||
        item.name.toLowerCase().includes(query) ||
        String(item.price).includes(query) ||
        item.code?.toLowerCase().includes(query)
      );
    });
  }, [packages, packageSearch]);

  if (loading) {
    return (
      <DashboardLayout
        title="Cable TV API"
        description="Plans, pricing, testing and integration examples."
      >
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle size={22} className="animate-spin" />
            Loading Cable TV API...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Cable TV API"
      description="View providers, packages and prices, test requests and integrate Cable TV subscriptions."
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
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
          )}
          <span className="break-all">{message}</span>
        </div>
      )}

      <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Wallet size={22} />}
          label="Wallet Balance"
          value={formatNaira(wallet?.balance)}
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
          label="Available Packages"
          value={packages.length}
        />
      </section>

      <div className="mb-8 flex justify-end">
        <button
          type="button"
          onClick={() => loadPage({ silent: true })}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCcw
            size={18}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Provider Selection */}
      <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Cable Providers</h2>
          <p className="mt-2 text-sm text-slate-400">
            Select DStv, GOtv or StarTimes to view available packages and prices.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {providers.map((provider) => {
            const selected = selectedProvider?.code === provider.code;
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => chooseProvider(provider)}
                className={`rounded-3xl border p-6 text-left transition ${
                  selected
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-800 bg-slate-950 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                    <Tv size={24} />
                  </div>
                  {selected && (
                    <CheckCircle2 size={20} className="text-blue-400" />
                  )}
                </div>
                <h3 className="mt-5 text-xl font-bold">{provider.name}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Code: {provider.code.toLowerCase()}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Packages Grid */}
      <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Packages and Prices</h2>
          <p className="mt-2 text-sm text-slate-400">
            Wholesale selling prices available to developers through Ayax APIs.
          </p>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
          <Search size={18} className="text-slate-500" />
          <input
            value={packageSearch}
            onChange={(event) => setPackageSearch(event.target.value)}
            placeholder="Search package or price..."
            className="w-full bg-transparent py-4 outline-none"
          />
        </div>

        {loadingPackages ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
            <LoaderCircle size={20} className="animate-spin" />
            Loading packages...
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-500">
            No active package found for this provider in database.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredPackages.map((item) => {
              const selected = selectedPackage?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPackage(item)}
                  className={`rounded-3xl border p-6 text-left transition ${
                    selected
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-800 bg-slate-950 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold">{item.name}</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Code: {item.code}
                      </p>
                    </div>
                    {selected && (
                      <CheckCircle2 size={19} className="shrink-0 text-blue-400" />
                    )}
                  </div>
                  <p className="mt-5 text-2xl font-extrabold text-blue-400">
                    {formatNaira(item.price)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Live API Tester */}
      <section className="mb-8 grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <form
          onSubmit={testCableApi}
          className="h-fit rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold">Live API Tester</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Test Cable TV subscription directly from your marketplace wallet.
            </p>
          </div>

          <div className="space-y-5">
            <ReadOnlyField
              label="Provider"
              value={selectedProvider?.name || "No provider selected"}
            />
            <ReadOnlyField
              label="Package"
              value={selectedPackage?.name || "No package selected"}
            />
            <ReadOnlyField
              label="Amount"
              value={selectedPackage ? formatNaira(selectedPackage.price) : "-"}
            />

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">
                  Smartcard / IUC Number
                </label>
                {customerName && (
                  <span className="text-xs font-semibold text-green-400">
                    {customerName}
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
                  <Hash size={18} className="text-slate-500" />
                  <input
                    inputMode="numeric"
                    value={smartcardNumber}
                    onChange={(event) => {
                      setSmartcardNumber(
                        event.target.value.replace(/\D/g, "").slice(0, 20)
                      );
                      setCustomerName("");
                    }}
                    placeholder="Enter smartcard or IUC"
                    required
                    className="w-full bg-transparent py-4 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={verifySmartcard}
                  disabled={verifying || !smartcardNumber}
                  className="flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-4 text-xs font-semibold hover:bg-slate-700 disabled:opacity-50"
                >
                  {verifying ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <UserCheck size={16} />
                  )}
                  Verify
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400">
                Customer Phone Number
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
                <Phone size={18} className="text-slate-500" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
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
                !selectedProvider ||
                !selectedPackage ||
                !smartcardNumber ||
                !phoneNumber
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testing ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <Terminal size={18} />
                  Test Cable TV API
                </>
              )}
            </button>
          </div>
        </form>

        <JsonResponsePanel
          response={apiResponse}
          copied={copiedField === "response"}
          onCopy={() =>
            copyText(JSON.stringify(apiResponse, null, 2), "response")
          }
        />
      </section>

      {/* API Documentation */}
      <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
            <FileJson size={23} />
          </div>
          <div>
            <h2 className="text-xl font-bold">API Documentation</h2>
            <p className="mt-2 text-sm text-slate-400">
              Call this endpoint from your backend server.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <DocumentationField label="Method" value="POST" />
          <DocumentationField label="Content Type" value="application/json" />
          <DocumentationField
            label="Endpoint"
            value={fullEndpoint}
            copy
            copied={copiedField === "endpoint"}
            onCopy={() => copyText(fullEndpoint, "endpoint")}
          />
          <DocumentationField
            label="Authentication"
            value="x-api-key: YOUR_AYAX_API_KEY"
            copy
            copied={copiedField === "auth"}
            onCopy={() => copyText("x-api-key: YOUR_AYAX_API_KEY", "auth")}
          />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm text-slate-400">Request Body</p>
          <CodeBlock
            value={JSON.stringify(requestBody, null, 2)}
            copied={copiedField === "request-body"}
            onCopy={() =>
              copyText(JSON.stringify(requestBody, null, 2), "request-body")
            }
          />
        </div>
      </section>

      {/* Code Examples */}
      <section className="mb-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
              <Code2 size={23} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Code Examples</h2>
              <p className="mt-2 text-sm text-slate-400">
                Copy code for your preferred programming language.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-800 p-4">
          {LANGUAGES.map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => setActiveLanguage(language)}
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
            onClick={() => copyText(codeExamples[activeLanguage], "code")}
            className="absolute right-5 top-5 flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
          >
            {copiedField === "code" ? (
              <>
                <Check size={16} /> Copied
              </>
            ) : (
              <>
                <Copy size={16} /> Copy
              </>
            )}
          </button>

          <pre className="max-h-[520px] overflow-auto pr-24 text-sm leading-7 text-slate-300">
            <code>{codeExamples[activeLanguage]}</code>
          </pre>
        </div>
      </section>

      {/* Recent Requests */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400">
            <Clock size={23} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Recent Cable Requests</h2>
            <p className="mt-2 text-sm text-slate-400">
              Your latest Cable TV API transactions.
            </p>
          </div>
        </div>

        {recentRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-500">
            No Cable TV request found yet.
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
                    {item.provider} • {item.packageName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : "-"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold">
                    {formatNaira(item.amount)}
                  </span>
                  <RequestStatus status={item.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, status = false }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
        {icon}
      </div>
      <p className="mt-5 text-sm text-slate-400">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {status && <span className="h-2.5 w-2.5 rounded-full bg-green-400" />}
        <h3 className="break-all text-2xl font-extrabold">{value}</h3>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        value={value || ""}
        readOnly
        className="mt-2 w-full cursor-not-allowed rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
      />
    </div>
  );
}

function JsonResponsePanel({ response, copied, onCopy }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
        <div>
          <h2 className="font-bold">JSON Response</h2>
          <p className="mt-1 text-xs text-slate-500">
            Live response from Ayax Cable TV API
          </p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="min-h-[520px] max-h-[680px] overflow-auto bg-slate-950 p-6 text-sm leading-7 text-green-300">
        {JSON.stringify(response, null, 2)}
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
            {copied ? <Check size={17} /> : <Copy size={17} />}
          </button>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ value, copied, onCopy }) {
  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <button
        type="button"
        onClick={onCopy}
        className="absolute right-4 top-4 rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
      >
        {copied ? <Check size={17} /> : <Copy size={17} />}
      </button>
      <pre className="overflow-x-auto pr-12 text-sm leading-7 text-green-300">
        {value}
      </pre>
    </div>
  );
}

function RequestStatus({ status }) {
  const normalized = String(status || "PENDING").toUpperCase();
  const classes =
    normalized === "SUCCESSFUL" || normalized === "SUCCESS"
      ? "bg-green-500/10 text-green-400"
      : normalized === "FAILED"
      ? "bg-red-500/10 text-red-400"
      : "bg-yellow-500/10 text-yellow-400";

  return (
    <span className={`rounded-full px-3 py-1 text-xs ${classes}`}>
      {normalized}
    </span>
  );
}