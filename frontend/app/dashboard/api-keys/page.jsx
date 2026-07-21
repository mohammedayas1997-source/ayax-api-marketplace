"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Copy,
  RefreshCcw,
  Trash2,
  PlusCircle,
  ShieldCheck,
  X,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const getStatusClasses = (status) => {
  const value = String(status || "").toUpperCase();

  if (value === "ACTIVE") {
    return "bg-green-500/10 text-green-400";
  }

  if (value === "REVOKED") {
    return "bg-red-500/10 text-red-400";
  }

  if (value === "EXPIRED") {
    return "bg-yellow-500/10 text-yellow-400";
  }

  return "bg-slate-500/10 text-slate-400";
};

const maskKey = (key) => {
  if (!key) return "-";

  if (key.length <= 16) {
    return `${key.slice(0, 5)}••••••`;
  }

  return `${key.slice(0, 12)}••••••••••••${key.slice(-6)}`;
};

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState([]);
  const [visibleKeys, setVisibleKeys] = useState({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workingKeyId, setWorkingKeyId] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState("Live API Key");

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

    setApiKeys(Array.isArray(list) ? list : []);

    return list;
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
    socket.on("api-key-revoked", handleKeyChanged);
    socket.on("api-key-deleted", handleKeyChanged);

    return () => {
      socket.off("api-key-created", handleKeyChanged);
      socket.off("api-key-updated", handleKeyChanged);
      socket.off("api-key-revoked", handleKeyChanged);
      socket.off("api-key-deleted", handleKeyChanged);
    };
  }, [loadApiKeys, fetchApiKeys]);

  const activeKeys = useMemo(
    () =>
      apiKeys.filter(
        (item) =>
          String(item?.status || "").toUpperCase() === "ACTIVE"
      ),
    [apiKeys]
  );

  const totalUsage = useMemo(
    () =>
      apiKeys.reduce(
        (sum, item) =>
          sum +
          Number(
            item?.usageCount ||
            item?._count?.usages ||
            item?.usage ||
            0
          ),
        0
      ),
    [apiKeys]
  );

  const openCreateModal = () => {
    setKeyName("Live API Key");
    setMessage("");
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (submitting) return;

    setCreateModalOpen(false);
    setKeyName("Live API Key");
  };

  const createApiKey = async (event) => {
    event.preventDefault();

    const cleanName = keyName.trim();

    if (!cleanName) {
      setMessageType("error");
      setMessage("API key name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const response = await api.post("/api-keys", {
        name: cleanName,
      });

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "API key generated successfully."
      );

      setCreateModalOpen(false);
      setKeyName("Live API Key");

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

  const copyKey = async (key) => {
    if (!key) return;

    try {
      await navigator.clipboard.writeText(key);

      setMessageType("success");
      setMessage("API key copied successfully.");
    } catch {
      setMessageType("error");
      setMessage("Unable to copy API key.");
    }
  };

  const regenerateKey = async (item) => {
    const accepted = window.confirm(
      `Regenerate "${item.name || "API Key"}"? The current key will stop working immediately.`
    );

    if (!accepted) return;

    try {
      setWorkingKeyId(item.id);
      setMessage("");

      const response = await api.patch(
        `/api-keys/${item.id}/regenerate`
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "API key regenerated successfully."
      );

      await fetchApiKeys();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to regenerate API key."
        )
      );
    } finally {
      setWorkingKeyId("");
    }
  };

  const revokeKey = async (item) => {
    const accepted = window.confirm(
      `Revoke "${item.name || "API Key"}"? Applications using it will stop working.`
    );

    if (!accepted) return;

    try {
      setWorkingKeyId(item.id);
      setMessage("");

      const response = await api.patch(
        `/api-keys/${item.id}/revoke`
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "API key revoked successfully."
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
    const accepted = window.confirm(
      `Delete "${item.name || "API Key"}" permanently?`
    );

    if (!accepted) return;

    try {
      setWorkingKeyId(item.id);
      setMessage("");

      const response = await api.delete(
        `/api-keys/${item.id}`
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "API key deleted successfully."
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

  const toggleVisibility = (id) => {
    setVisibleKeys((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  return (
    <DashboardLayout
      title="API Keys"
      description="Generate, copy, regenerate, revoke and monitor your API keys."
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

      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
        <button
          type="button"
          onClick={() => loadApiKeys({ silent: true })}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            size={18}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
        >
          <PlusCircle size={18} />
          Generate New Key
        </button>
      </div>

      <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600">
            <ShieldCheck size={24} />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              API Key Security
            </h2>

            <p className="mt-2 leading-7 text-slate-400">
              Never expose your live API key in frontend code.
              Always call Ayax APIs from your secure backend server.
              Revoke or regenerate a key immediately if it is leaked.
            </p>
          </div>
        </div>
      </section>

      {!loading && (
        <section className="mb-8 grid gap-5 sm:grid-cols-3">
          <SummaryCard
            title="Total Keys"
            value={apiKeys.length}
          />

          <SummaryCard
            title="Active Keys"
            value={activeKeys.length}
          />

          <SummaryCard
            title="Total Calls"
            value={totalUsage.toLocaleString("en-US")}
          />
        </section>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading API keys...
          </div>
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
          <KeyRound
            size={42}
            className="mx-auto text-slate-600"
          />

          <h2 className="mt-5 text-xl font-bold">
            No API keys yet
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-slate-400">
            Generate an API key to authenticate requests from
            your backend application.
          </p>

          <button
            type="button"
            onClick={openCreateModal}
            className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
          >
            <PlusCircle size={18} />
            Generate First Key
          </button>
        </div>
      ) : (
        <section className="space-y-5">
          {apiKeys.map((item) => {
            const status = String(
              item?.status || "ACTIVE"
            ).toUpperCase();

            const usageCount = Number(
              item?.usageCount ||
              item?._count?.usages ||
              item?.usage ||
              0
            );

            const keyVisible = Boolean(
              visibleKeys[item.id]
            );

            const working = workingKeyId === item.id;

            return (
              <div
                key={item.id || item.key}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <KeyRound className="text-blue-400" />

                      <h2 className="text-xl font-bold">
                        {item.name || "API Key"}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${getStatusClasses(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <div className="min-w-0 flex-1 break-all font-mono text-sm text-slate-300">
                        {keyVisible
                          ? item.key || "-"
                          : maskKey(item.key)}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleVisibility(item.id)
                        }
                        className="shrink-0 rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
                        aria-label={
                          keyVisible
                            ? "Hide API key"
                            : "Show API key"
                        }
                      >
                        {keyVisible ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                      <span>
                        Created:{" "}
                        {item.createdAt
                          ? new Date(
                              item.createdAt
                            ).toLocaleString()
                          : "-"}
                      </span>

                      <span>
                        Usage:{" "}
                        {usageCount.toLocaleString("en-US")} calls
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[420px]">
                    <button
                      type="button"
                      onClick={() => copyKey(item.key)}
                      disabled={!item.key || working}
                      className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 font-semibold hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Copy size={17} />
                      Copy
                    </button>

                    <button
                      type="button"
                      onClick={() => regenerateKey(item)}
                      disabled={working}
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {working ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <RefreshCcw size={17} />
                      )}
                      Regenerate
                    </button>

                    {status === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => revokeKey(item)}
                        disabled={working}
                        className="flex items-center justify-center gap-2 rounded-xl bg-yellow-500/10 py-3 font-semibold text-yellow-400 hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={17} />
                        Revoke
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteKey(item)}
                      disabled={working}
                      className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 font-semibold text-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={17} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Generate API Key
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Give this key a name that identifies the
                  application using it.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={submitting}
                className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={createApiKey}
              className="space-y-5"
            >
              <div>
                <label className="text-sm text-slate-400">
                  Key Name
                </label>

                <input
                  value={keyName}
                  onChange={(event) =>
                    setKeyName(event.target.value)
                  }
                  placeholder="Production Server"
                  required
                  maxLength={80}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{title}</p>
      <h3 className="mt-2 text-3xl font-extrabold">
        {value}
      </h3>
    </div>
  );
}