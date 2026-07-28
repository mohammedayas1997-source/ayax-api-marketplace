"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  FileCode2,
  Gauge,
  KeyRound,
  LoaderCircle,
  PlusCircle,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const DEFAULT_SCOPES = [
  "DATA",
  "AIRTIME",
  "ELECTRICITY",
  "CABLE",
  "BVN",
  "NIN",
];

const ENVIRONMENTS = [
  {
    value: "PRODUCTION",
    label: "Production",
    prefix: "ayax_live_",
  },
  {
    value: "SANDBOX",
    label: "Sandbox",
    prefix: "ayax_test_",
  },
  {
    value: "DEVELOPMENT",
    label: "Development",
    prefix: "ayax_dev_",
  },
];

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const normalizeStatus = (value) =>
  String(value || "ACTIVE").trim().toUpperCase();

const normalizeEnvironment = (value) =>
  String(value || "PRODUCTION").trim().toUpperCase();

const getStatusClasses = (status) => {
  const value = normalizeStatus(status);

  if (value === "ACTIVE") {
    return "border-green-500/20 bg-green-500/10 text-green-400";
  }

  if (value === "REVOKED") {
    return "border-red-500/20 bg-red-500/10 text-red-400";
  }

  if (value === "EXPIRED") {
    return "border-yellow-500/20 bg-yellow-500/10 text-yellow-400";
  }

  return "border-slate-500/20 bg-slate-500/10 text-slate-400";
};

const getEnvironmentClasses = (environment) => {
  const value = normalizeEnvironment(environment);

  if (value === "PRODUCTION") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (value === "SANDBOX") {
    return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  }

  return "border-slate-500/20 bg-slate-500/10 text-slate-300";
};

const maskPrefix = (prefix) => {
  if (!prefix) {
    return "Secret key hidden";
  }

  return `${prefix}••••••••••••••••`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleString();
};

const formatExpiry = (value) => {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleDateString();
};

const buildHeader = () => 'x-api-key: YOUR_API_KEY';

const buildCurlExample = () =>
  `curl --request GET \\
  --url https://api.ayaxdigital.solutions/v1/data/plans \\
  --header "accept: application/json" \\
  --header "x-api-key: YOUR_API_KEY"`;

const buildNodeExample = () =>
  `const response = await fetch(
  "https://api.ayaxdigital.solutions/v1/data/plans",
  {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": process.env.AYAX_API_KEY,
    },
  }
);

const result = await response.json();

console.log(result);`;

const normalizeApiKey = (item = {}) => ({
  ...item,

  id:
    item.id ||
    item._id ||
    item.keyId ||
    item.name,

  name:
    item.name ||
    "API Key",

  keyPrefix:
    item.keyPrefix ||
    item.prefix ||
    "",

  status: normalizeStatus(item.status),

  environment:
    normalizeEnvironment(
      item.environment ||
        item.mode ||
        item.type
    ),

  scopes: Array.isArray(item.scopes)
    ? item.scopes
    : Array.isArray(item.permissions)
      ? item.permissions
      : DEFAULT_SCOPES,

  usageCount: Number(
    item.usageCount ||
      item?._count?.usages ||
      item.usage ||
      0
  ),

  todayCalls: Number(
    item.todayCalls ||
      item.usageToday ||
      item.analytics?.today ||
      0
  ),

  monthlyCalls: Number(
    item.monthlyCalls ||
      item.usageThisMonth ||
      item.analytics?.month ||
      0
  ),

  failedCalls: Number(
    item.failedCalls ||
      item.analytics?.failed ||
      0
  ),

  successRate: Number(
    item.successRate ||
      item.analytics?.successRate ||
      100
  ),

  rateLimitPerMinute: Number(
    item.rateLimitPerMinute ||
      item.rateLimit?.minute ||
      100
  ),

  rateLimitPerDay: Number(
    item.rateLimitPerDay ||
      item.rateLimit?.day ||
      10000
  ),

  expiresAt:
    item.expiresAt ||
    item.expiryDate ||
    null,

  lastUsedAt:
    item.lastUsedAt ||
    item.lastUsed ||
    null,

  createdAt:
    item.createdAt ||
    null,
});

const extractPlainApiKey = (response) =>
  response?.data?.plainApiKey ||
  response?.data?.key?.plainApiKey ||
  response?.data?.apiKey ||
  "";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [sampleTab, setSampleTab] = useState({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workingKeyId, setWorkingKeyId] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [secretApiKey, setSecretApiKey] = useState("");
  const [secretKeyTitle, setSecretKeyTitle] = useState(
    "Your API Key"
  );

  const [keyName, setKeyName] = useState("Live API Key");
  const [environment, setEnvironment] = useState("PRODUCTION");
  const [selectedScopes, setSelectedScopes] =
    useState(DEFAULT_SCOPES);
  const [expiresInDays, setExpiresInDays] = useState("");
  const [rateLimitPerMinute, setRateLimitPerMinute] =
    useState("100");
  const [rateLimitPerDay, setRateLimitPerDay] =
    useState("10000");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const fetchApiKeys = useCallback(async () => {
    const response = await api.get("/api-keys");

    const list =
      response.data?.keys ||
      response.data?.apiKeys ||
      response.data?.data?.keys ||
      response.data?.data ||
      [];

    const normalized = Array.isArray(list)
      ? list.map(normalizeApiKey)
      : [];

    setApiKeys(normalized);

    return normalized;
  }, []);

  const loadApiKeys = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage("");
        await fetchApiKeys();
      } catch (error) {
        setMessageType("error");
        setMessage(
          getErrorMessage(
            error,
            "Unable to load API keys."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchApiKeys]
  );

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleKeyChanged = () => {
      fetchApiKeys().catch(console.error);
    };

    socket.on("api-key-created", handleKeyChanged);
    socket.on("api-key-updated", handleKeyChanged);
    socket.on("api-key-regenerated", handleKeyChanged);
    socket.on("api-key-status-changed", handleKeyChanged);
    socket.on("api-key-revoked", handleKeyChanged);
    socket.on("api-key-deleted", handleKeyChanged);
    socket.on("api-key-usage-updated", handleKeyChanged);

    return () => {
      socket.off("api-key-created", handleKeyChanged);
      socket.off("api-key-updated", handleKeyChanged);
      socket.off("api-key-regenerated", handleKeyChanged);
      socket.off("api-key-status-changed", handleKeyChanged);
      socket.off("api-key-revoked", handleKeyChanged);
      socket.off("api-key-deleted", handleKeyChanged);
      socket.off("api-key-usage-updated", handleKeyChanged);
    };
  }, [fetchApiKeys]);

  const activeKeys = useMemo(
    () =>
      apiKeys.filter(
        (item) => item.status === "ACTIVE"
      ),
    [apiKeys]
  );

  const monthlyUsage = useMemo(
    () =>
      apiKeys.reduce(
        (sum, item) => sum + item.monthlyCalls,
        0
      ),
    [apiKeys]
  );

  const failedUsage = useMemo(
    () =>
      apiKeys.reduce(
        (sum, item) => sum + item.failedCalls,
        0
      ),
    [apiKeys]
  );

  const successRate = useMemo(() => {
    if (!apiKeys.length) {
      return 100;
    }

    const total = apiKeys.reduce(
      (sum, item) => sum + item.successRate,
      0
    );

    return (total / apiKeys.length).toFixed(2);
  }, [apiKeys]);

  const openCreateModal = () => {
    setKeyName("Live API Key");
    setEnvironment("PRODUCTION");
    setSelectedScopes(DEFAULT_SCOPES);
    setExpiresInDays("");
    setRateLimitPerMinute("100");
    setRateLimitPerDay("10000");
    setCreateModalOpen(true);
    setMessage("");
  };

  const closeCreateModal = () => {
    if (submitting) {
      return;
    }

    setCreateModalOpen(false);
  };

  const closeSecretModal = () => {
    setSecretApiKey("");
    setSecretModalOpen(false);
  };

  const showSecretKey = (key, title) => {
    setSecretApiKey(key);
    setSecretKeyTitle(title);
    setSecretModalOpen(true);
  };

  const toggleScope = (scope) => {
    setSelectedScopes((current) =>
      current.includes(scope)
        ? current.filter(
            (item) => item !== scope
          )
        : [...current, scope]
    );
  };

  const createApiKey = async (event) => {
    event.preventDefault();

    if (!keyName.trim()) {
      setMessageType("error");
      setMessage("API key name is required.");
      return;
    }

    if (!selectedScopes.length) {
      setMessageType("error");
      setMessage("Select at least one permission.");
      return;
    }

    const minuteLimit = Number(rateLimitPerMinute);
    const dayLimit = Number(rateLimitPerDay);

    if (
      !Number.isInteger(minuteLimit) ||
      minuteLimit < 1
    ) {
      setMessageType("error");
      setMessage(
        "Requests per minute must be a positive whole number."
      );
      return;
    }

    if (
      !Number.isInteger(dayLimit) ||
      dayLimit < minuteLimit
    ) {
      setMessageType("error");
      setMessage(
        "Requests per day must be a whole number greater than or equal to the per-minute limit."
      );
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const payload = {
        name: keyName.trim(),
        environment,
        scopes: selectedScopes,
        rateLimitPerMinute: minuteLimit,
        rateLimitPerDay: dayLimit,
      };

      if (expiresInDays) {
        const days = Number(expiresInDays);

        if (!Number.isInteger(days) || days < 1) {
          throw new Error(
            "Expiry days must be a positive whole number."
          );
        }

        const expiresAt = new Date();

        expiresAt.setDate(
          expiresAt.getDate() + days
        );

        payload.expiresAt =
          expiresAt.toISOString();
      }

      const response = await api.post(
        "/api-keys",
        payload
      );

      const plainApiKey =
        extractPlainApiKey(response);

      if (!plainApiKey) {
        throw new Error(
          "The backend created the key but did not return the one-time secret."
        );
      }

      setCreateModalOpen(false);

      showSecretKey(
        plainApiKey,
        "API Key Created Successfully"
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "API key generated successfully."
      );

      await fetchApiKeys();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to generate API key."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (
    value,
    successMessage
  ) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        value
      );

      setMessageType("success");
      setMessage(successMessage);
    } catch {
      setMessageType("error");
      setMessage("Unable to copy content.");
    }
  };

  const regenerateKey = async (item) => {
    if (
      !window.confirm(
        `Rotate "${item.name}"? The old key will stop working immediately.`
      )
    ) {
      return;
    }

    try {
      setWorkingKeyId(item.id);

      const response = await api.patch(
        `/api-keys/${item.id}/regenerate`,
        {}
      );

      const plainApiKey =
        extractPlainApiKey(response);

      if (!plainApiKey) {
        throw new Error(
          "The key was rotated but the backend did not return the new one-time secret."
        );
      }

      showSecretKey(
        plainApiKey,
        "New Rotated API Key"
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "API key rotated successfully."
      );

      await fetchApiKeys();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to rotate API key."
        )
      );
    } finally {
      setWorkingKeyId("");
    }
  };

  const revokeKey = async (item) => {
    if (
      !window.confirm(
        `Revoke "${item.name}"? Requests using this key will stop working.`
      )
    ) {
      return;
    }

    try {
      setWorkingKeyId(item.id);

      const response = await api.patch(
        `/api-keys/${item.id}/revoke`,
        {}
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "API key revoked."
      );

      await fetchApiKeys();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to revoke API key."
        )
      );
    } finally {
      setWorkingKeyId("");
    }
  };

  const deleteKey = async (item) => {
    if (
      !window.confirm(
        `Delete "${item.name}" permanently?`
      )
    ) {
      return;
    }

    try {
      setWorkingKeyId(item.id);

      const response = await api.delete(
        `/api-keys/${item.id}`
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "API key deleted."
      );

      await fetchApiKeys();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to delete API key."
        )
      );
    } finally {
      setWorkingKeyId("");
    }
  };

  const toggleExpanded = (id) => {
    setExpandedKeys((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const setCodeTab = (id, value) => {
    setSampleTab((current) => ({
      ...current,
      [id]: value,
    }));
  };

  return (
    <DashboardLayout
      title="API Keys"
      description="Generate, manage and monitor secure API credentials."
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

      <section className="mb-8 overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-700/20 via-slate-900 to-slate-900 p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300">
              <ShieldCheck size={16} />
              Enterprise Security
            </div>

            <h1 className="text-4xl font-extrabold">
              API Key Management
            </h1>

            <p className="mt-4 max-w-3xl leading-7 text-slate-400">
              Secret API keys are displayed only once. The dashboard
              stores and displays a safe key prefix, never the full
              credential.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                loadApiKeys({ silent: true })
              }
              disabled={refreshing}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-6 py-4 font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              <RefreshCcw
                size={18}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-700"
            >
              <PlusCircle size={18} />
              Generate API Key
            </button>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total Keys"
          value={apiKeys.length}
          icon={<KeyRound size={21} />}
        />

        <SummaryCard
          title="Active Keys"
          value={activeKeys.length}
          icon={<ShieldCheck size={21} />}
        />

        <SummaryCard
          title="Monthly Calls"
          value={monthlyUsage.toLocaleString()}
          icon={<Activity size={21} />}
        />

        <SummaryCard
          title="Failed Calls"
          value={failedUsage.toLocaleString()}
          icon={<AlertCircle size={21} />}
        />

        <SummaryCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={<Zap size={21} />}
        />
      </section>

      <section className="mb-8 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-500/20 text-yellow-300">
            <ShieldCheck size={22} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-yellow-100">
              Secret keys cannot be recovered
            </h2>

            <p className="mt-2 leading-7 text-yellow-200/80">
              Ayax stores a secure SHA-256 hash, not the original
              secret. Copy every newly generated or rotated key from
              the one-time dialog and keep it in a secure secrets
              manager.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading API Keys...
          </div>
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
          <KeyRound
            size={50}
            className="mx-auto text-slate-600"
          />

          <h2 className="mt-6 text-2xl font-bold">
            No API Keys Found
          </h2>

          <p className="mt-3 text-slate-400">
            Generate your first Production, Sandbox or Development
            API key.
          </p>

          <button
            type="button"
            onClick={openCreateModal}
            className="mx-auto mt-6 flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-700"
          >
            <PlusCircle size={18} />
            Generate First Key
          </button>
        </div>
      ) : (
        <section className="space-y-6">
          {apiKeys.map((item) => {
            const expanded = expandedKeys[item.id];
            const working =
              workingKeyId === item.id;

            return (
              <article
                key={item.id}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <KeyRound className="text-blue-400" />

                      <h2 className="text-2xl font-bold">
                        {item.name}
                      </h2>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getEnvironmentClasses(
                          item.environment
                        )}`}
                      >
                        {item.environment}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <div className="flex-1 break-all font-mono text-sm text-slate-300">
                        {maskPrefix(item.keyPrefix)}
                      </div>

                      <span className="rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-400">
                        Prefix only
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <MetaCard
                        label="Created"
                        value={formatDateTime(
                          item.createdAt
                        )}
                      />

                      <MetaCard
                        label="Last Used"
                        value={formatDateTime(
                          item.lastUsedAt
                        )}
                      />

                      <MetaCard
                        label="Expires"
                        value={formatExpiry(
                          item.expiresAt
                        )}
                      />

                      <MetaCard
                        label="Total Calls"
                        value={item.usageCount.toLocaleString()}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 xl:w-[430px]">
                    <ActionButton
                      icon={<FileCode2 size={17} />}
                      label="Copy Header"
                      onClick={() =>
                        copyText(
                          buildHeader(),
                          "Header template copied."
                        )
                      }
                    />
<Link
  href="/docs"
  className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 font-semibold hover:bg-slate-700"
>
  <Code2 size={17} />
  View Docs
</Link>
                    <ActionButton
                      icon={
                        working ? (
                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <RefreshCcw size={17} />
                        )
                      }
                      label="Rotate Key"
                      onClick={() =>
                        regenerateKey(item)
                      }
                      primary
                      disabled={working}
                    />

                    {item.status === "ACTIVE" ? (
                      <ActionButton
                        icon={
                          <ShieldCheck
                            size={17}
                          />
                        }
                        label="Revoke"
                        onClick={() =>
                          revokeKey(item)
                        }
                        warning
                        disabled={working}
                      />
                    ) : (
                      <ActionButton
                        icon={<Trash2 size={17} />}
                        label="Delete"
                        onClick={() =>
                          deleteKey(item)
                        }
                        danger
                        disabled={working}
                      />
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    toggleExpanded(item.id)
                  }
                  className="mt-6 flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4"
                >
                  <span className="font-semibold">
                    {expanded
                      ? "Hide Details"
                      : "View Details"}
                  </span>

                  {expanded ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>

                {expanded && (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-5 lg:grid-cols-2">
                      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                        <div className="flex items-center gap-2">
                          <ShieldCheck
                            size={18}
                            className="text-blue-400"
                          />

                          <h3 className="font-bold">
                            Permissions / Scopes
                          </h3>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.scopes.map(
                            (scope) => (
                              <span
                                key={scope}
                                className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-300"
                              >
                                {scope}
                              </span>
                            )
                          )}
                        </div>
                      </section>

                      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                        <div className="flex items-center gap-2">
                          <Gauge
                            size={18}
                            className="text-blue-400"
                          />

                          <h3 className="font-bold">
                            Rate Limits
                          </h3>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <MetaCard
                            label="Per Minute"
                            value={`${item.rateLimitPerMinute.toLocaleString()} requests`}
                          />

                          <MetaCard
                            label="Per Day"
                            value={`${item.rateLimitPerDay.toLocaleString()} requests`}
                          />
                        </div>
                      </section>
                    </div>

                    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                      <div className="flex items-center gap-2">
                        <BarChart3
                          size={18}
                          className="text-blue-400"
                        />

                        <h3 className="font-bold">
                          Usage Analytics
                        </h3>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <AnalyticsCard
                          icon={<Zap size={18} />}
                          label="Today"
                          value={item.todayCalls.toLocaleString()}
                        />

                        <AnalyticsCard
                          icon={
                            <Activity size={18} />
                          }
                          label="This Month"
                          value={item.monthlyCalls.toLocaleString()}
                        />

                        <AnalyticsCard
                          icon={
                            <AlertCircle
                              size={18}
                            />
                          }
                          label="Failed"
                          value={item.failedCalls.toLocaleString()}
                        />

                        <AnalyticsCard
                          icon={
                            <CheckCircle2
                              size={18}
                            />
                          }
                          label="Success Rate"
                          value={`${item.successRate.toFixed(
                            2
                          )}%`}
                        />
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Code2
                            size={18}
                            className="text-blue-400"
                          />

                          <h3 className="font-bold">
                            Code Example
                          </h3>
                        </div>

                        <div className="flex rounded-xl bg-slate-900 p-1">
                          <button
                            type="button"
                            onClick={() =>
                              setCodeTab(
                                item.id,
                                "curl"
                              )
                            }
                            className={`rounded-lg px-4 py-2 text-sm ${
                              (sampleTab[
                                item.id
                              ] || "curl") ===
                              "curl"
                                ? "bg-blue-600 text-white"
                                : "text-slate-400"
                            }`}
                          >
                            cURL
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCodeTab(
                                item.id,
                                "node"
                              )
                            }
                            className={`rounded-lg px-4 py-2 text-sm ${
                              sampleTab[
                                item.id
                              ] === "node"
                                ? "bg-blue-600 text-white"
                                : "text-slate-400"
                            }`}
                          >
                            Node.js
                          </button>
                        </div>
                      </div>

                      <div className="relative mt-4">
                        <pre className="overflow-x-auto rounded-2xl border border-slate-800 bg-black/40 p-5 text-sm leading-7 text-slate-300">
                          <code>
                            {sampleTab[
                              item.id
                            ] === "node"
                              ? buildNodeExample()
                              : buildCurlExample()}
                          </code>
                        </pre>

                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              sampleTab[
                                item.id
                              ] === "node"
                                ? buildNodeExample()
                                : buildCurlExample(),
                              "Code example copied."
                            )
                          }
                          className="absolute right-3 top-3 rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
                        >
                          <Copy size={17} />
                        </button>
                      </div>
                    </section>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {createModalOpen && (
        <CreateKeyModal
          keyName={keyName}
          environment={environment}
          selectedScopes={selectedScopes}
          expiresInDays={expiresInDays}
          rateLimitPerMinute={rateLimitPerMinute}
          rateLimitPerDay={rateLimitPerDay}
          submitting={submitting}
          onKeyNameChange={setKeyName}
          onEnvironmentChange={setEnvironment}
          onToggleScope={toggleScope}
          onExpiresChange={setExpiresInDays}
          onMinuteLimitChange={
            setRateLimitPerMinute
          }
          onDailyLimitChange={
            setRateLimitPerDay
          }
          onClose={closeCreateModal}
          onSubmit={createApiKey}
        />
      )}

      {secretModalOpen && (
        <SecretKeyModal
          title={secretKeyTitle}
          secretApiKey={secretApiKey}
          onCopy={() =>
            copyText(
              secretApiKey,
              "Secret API key copied."
            )
          }
          onClose={closeSecretModal}
        />
      )}
    </DashboardLayout>
  );
}

function SecretKeyModal({
  title,
  secretApiKey,
  onCopy,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-green-500/30 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-sm font-semibold text-green-300">
              <CheckCircle2 size={16} />
              One-time secret
            </div>

            <h2 className="mt-4 text-2xl font-bold">
              {title}
            </h2>

            <p className="mt-2 leading-6 text-slate-400">
              This is the only time the full API key will be shown.
              Copy it before closing this window.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
            aria-label="Close secret key dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-green-500/30 bg-black/40 p-5">
          <p className="break-all font-mono text-sm leading-7 text-green-300 sm:text-base">
            {secretApiKey}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-200">
          Do not place this secret in frontend code, public GitHub
          repositories, screenshots or chat messages. Store it in an
          environment variable or secrets manager.
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 font-semibold hover:bg-green-700"
          >
            <Copy size={18} />
            Copy Secret Key
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-700 bg-slate-800 py-4 font-semibold hover:bg-slate-700"
          >
            I Have Saved It
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateKeyModal({
  keyName,
  environment,
  selectedScopes,
  expiresInDays,
  rateLimitPerMinute,
  rateLimitPerDay,
  submitting,
  onKeyNameChange,
  onEnvironmentChange,
  onToggleScope,
  onExpiresChange,
  onMinuteLimitChange,
  onDailyLimitChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              Generate API Key
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Configure the environment, permissions, expiration
              period and rate limits.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-6"
        >
          <div>
            <label
              htmlFor="key-name"
              className="text-sm font-medium text-slate-400"
            >
              API Key Name
            </label>

            <input
              id="key-name"
              type="text"
              value={keyName}
              onChange={(event) =>
                onKeyNameChange(
                  event.target.value
                )
              }
              placeholder="Example: Production Server"
              required
              maxLength={100}
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-400">
              Environment
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {ENVIRONMENTS.map((item) => {
                const active =
                  environment === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      onEnvironmentChange(
                        item.value
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <p className="font-semibold">
                      {item.label}
                    </p>

                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {item.prefix}...
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-400">
              Permissions / Scopes
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DEFAULT_SCOPES.map(
                (scope) => {
                  const selected =
                    selectedScopes.includes(
                      scope
                    );

                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() =>
                        onToggleScope(scope)
                      }
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition ${
                        selected
                          ? "border-blue-500 bg-blue-500/10 text-blue-300"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span>{scope}</span>

                      {selected && (
                        <CheckCircle2
                          size={17}
                        />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label
                htmlFor="expires-days"
                className="text-sm font-medium text-slate-400"
              >
                Expires In Days
              </label>

              <input
                id="expires-days"
                type="number"
                min="1"
                step="1"
                value={expiresInDays}
                onChange={(event) =>
                  onExpiresChange(
                    event.target.value
                  )
                }
                placeholder="Never"
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="minute-limit"
                className="text-sm font-medium text-slate-400"
              >
                Requests / Minute
              </label>

              <input
                id="minute-limit"
                type="number"
                min="1"
                step="1"
                value={rateLimitPerMinute}
                onChange={(event) =>
                  onMinuteLimitChange(
                    event.target.value
                  )
                }
                required
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="daily-limit"
                className="text-sm font-medium text-slate-400"
              >
                Requests / Day
              </label>

              <input
                id="daily-limit"
                type="number"
                min="1"
                step="1"
                value={rateLimitPerDay}
                onChange={(event) =>
                  onDailyLimitChange(
                    event.target.value
                  )
                }
                required
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-200">
            The full secret will be displayed once immediately after
            creation. Ayax will store only its secure hash.
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-2xl border border-slate-700 bg-slate-800 py-4 font-semibold hover:bg-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                  Generating...
                </>
              ) : (
                <>
                  <PlusCircle size={18} />
                  Generate API Key
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
        {icon}
      </div>

      <p className="mt-4 text-sm text-slate-400">
        {title}
      </p>

      <h3 className="mt-2 break-words text-3xl font-extrabold">
        {value}
      </h3>
    </div>
  );
}

function MetaCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-slate-300">
        {value}
      </p>
    </div>
  );
}

function AnalyticsCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2 text-blue-400">
        {icon}

        <span className="text-sm text-slate-400">
          {label}
        </span>
      </div>

      <p className="mt-3 break-words text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  primary = false,
  warning = false,
  danger = false,
}) {
  let classes =
    "bg-slate-800 text-white hover:bg-slate-700";

  if (primary) {
    classes =
      "bg-blue-600 text-white hover:bg-blue-700";
  }

  if (warning) {
    classes =
      "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20";
  }

  if (danger) {
    classes =
      "bg-red-500/10 text-red-400 hover:bg-red-500/20";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}
    >
      {icon}
      {label}
    </button>
  );
}