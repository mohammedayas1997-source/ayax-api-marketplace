"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  PlusCircle,
  Search,
  RefreshCcw,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Power,
  Trash2,
  X,
  Eye,
  EyeOff,
  Server,
  ShieldCheck,
  Activity,
} from "lucide-react";

import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import api from "@/lib/api";
import useGatewaySocket from "@/hooks/useGatewaySocket";

const EMPTY_FORM = {
  name: "",
  code: "",
  category: "UTILITY",
  baseUrl: "",
  apiKey: "",
  secretKey: "",
  username: "",
  password: "",
  webhookUrl: "",
  status: "ACTIVE",
  priority: 1,
  isFallback: false,
};

const CATEGORIES = [
  { value: "GSM", label: "GSM" },
  { value: "IDENTITY", label: "Identity" },
  { value: "UTILITY", label: "Utility" },
  { value: "FINANCE", label: "Finance" },
  { value: "AI", label: "AI" },
  { value: "OTHER", label: "Other" },
];

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const normalizePartner = (partner = {}) => ({
  id: partner.id,
  name: partner.name || "Unnamed Partner",
  code: partner.code || "",
  category: String(
    partner.category || "OTHER"
  ).toUpperCase(),
  baseUrl: partner.baseUrl || "",
  status: String(
    partner.status || "DISABLED"
  ).toUpperCase(),
  priority: Number(partner.priority || 1),
  isFallback: Boolean(partner.isFallback),
  createdAt: partner.createdAt,
  updatedAt: partner.updatedAt,
  services: partner.services || [],
});

export default function PartnerManagerPage() {
  const [partners, setPartners] = useState([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedPartner, setSelectedPartner] =
    useState(null);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [showApiKey, setShowApiKey] =
    useState(false);

  const [showSecretKey, setShowSecretKey] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [workingId, setWorkingId] =
    useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("info");

  const fetchPartners = useCallback(async () => {
    const response = await api.get(
      "/partners"
    );

    const list =
      response.data?.partners ||
      response.data?.data?.partners ||
      response.data?.data ||
      [];

    const normalized = Array.isArray(list)
      ? list.map(normalizePartner)
      : [];

    setPartners(normalized);

    return normalized;
  }, []);

  const loadPartners = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage("");

        await fetchPartners();
      } catch (error) {
        setMessageType("error");
        setMessage(
          getErrorMessage(
            error,
            "Unable to load partners."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchPartners]
  );

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  useGatewaySocket({
    "partner-created": fetchPartners,
    "partner-updated": fetchPartners,
    "partner-deleted": fetchPartners,
    "partner-status-updated": fetchPartners,
  });

  const filteredPartners = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return partners.filter((partner) => {
      const matchesSearch =
        !query ||
        partner.name
          .toLowerCase()
          .includes(query) ||
        partner.code
          .toLowerCase()
          .includes(query) ||
        partner.baseUrl
          .toLowerCase()
          .includes(query);

      const matchesCategory =
        category === "ALL" ||
        partner.category === category;

      const matchesStatus =
        status === "ALL" ||
        partner.status === status;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [
    partners,
    search,
    category,
    status,
  ]);

  const stats = useMemo(() => {
    return {
      total: partners.length,
      active: partners.filter(
        (partner) =>
          partner.status === "ACTIVE"
      ).length,
      disabled: partners.filter(
        (partner) =>
          partner.status === "DISABLED"
      ).length,
      fallback: partners.filter(
        (partner) =>
          partner.isFallback
      ).length,
    };
  }, [partners]);

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openCreateModal = () => {
    setSelectedPartner(null);
    setForm(EMPTY_FORM);
    setShowApiKey(false);
    setShowSecretKey(false);
    setShowPassword(false);
    setMessage("");
    setModalOpen(true);
  };

  const openEditModal = (partner) => {
    setSelectedPartner(partner);

    setForm({
      name: partner.name || "",
      code: partner.code || "",
      category:
        partner.category || "UTILITY",
      baseUrl: partner.baseUrl || "",
      apiKey: "",
      secretKey: "",
      username: "",
      password: "",
      webhookUrl:
        partner.webhookUrl || "",
      status:
        partner.status || "ACTIVE",
      priority:
        Number(partner.priority || 1),
      isFallback:
        Boolean(partner.isFallback),
    });

    setShowApiKey(false);
    setShowSecretKey(false);
    setShowPassword(false);
    setMessage("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;

    setModalOpen(false);
    setSelectedPartner(null);
    setForm(EMPTY_FORM);
  };

  const submitPartner = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const code = form.code
      .trim()
      .toUpperCase();
    const baseUrl = form.baseUrl.trim();

    if (!name) {
      setMessageType("error");
      setMessage(
        "Partner name is required."
      );
      return;
    }

    if (!code) {
      setMessageType("error");
      setMessage(
        "Partner code is required."
      );
      return;
    }

    if (!baseUrl) {
      setMessageType("error");
      setMessage(
        "API Base URL is required."
      );
      return;
    }

    try {
      new URL(baseUrl);
    } catch {
      setMessageType("error");
      setMessage(
        "Enter a valid API Base URL."
      );
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const payload = {
        name,
        code,
        category: form.category,
        baseUrl,
        status: form.status,
        priority: Number(
          form.priority || 1
        ),
        isFallback:
          Boolean(form.isFallback),
        webhookUrl:
          form.webhookUrl.trim() ||
          undefined,
      };

      if (form.apiKey.trim()) {
        payload.apiKey =
          form.apiKey.trim();
      }

      if (form.secretKey.trim()) {
        payload.secretKey =
          form.secretKey.trim();
      }

      if (form.username.trim()) {
        payload.username =
          form.username.trim();
      }

      if (form.password.trim()) {
        payload.password =
          form.password.trim();
      }

      let response;

      if (selectedPartner?.id) {
        response = await api.patch(
          `/partners/${selectedPartner.id}`,
          payload
        );
      } else {
        response = await api.post(
          "/partners",
          payload
        );
      }

      setMessageType("success");
      setMessage(
        response.data?.message ||
          (selectedPartner
            ? "Partner updated successfully."
            : "Partner created successfully.")
      );

      setModalOpen(false);
      setSelectedPartner(null);
      setForm(EMPTY_FORM);

      await fetchPartners();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          selectedPartner
            ? "Unable to update partner."
            : "Unable to create partner."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const togglePartnerStatus = async (
    partner
  ) => {
    const nextStatus =
      partner.status === "ACTIVE"
        ? "DISABLED"
        : "ACTIVE";

    try {
      setWorkingId(partner.id);
      setMessage("");

      const response = await api.patch(
        `/partners/${partner.id}/status`,
        {
          status: nextStatus,
        }
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          `Partner ${nextStatus.toLowerCase()} successfully.`
      );

      await fetchPartners();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to update partner status."
        )
      );
    } finally {
      setWorkingId("");
    }
  };

  const deletePartner = async (
    partner
  ) => {
    const confirmed = window.confirm(
      `Delete "${partner.name}" permanently?`
    );

    if (!confirmed) return;

    try {
      setWorkingId(partner.id);
      setMessage("");

      const response = await api.delete(
        `/partners/${partner.id}`
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "Partner deleted successfully."
      );

      await fetchPartners();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to delete partner."
        )
      );
    } finally {
      setWorkingId("");
    }
  };

  return (
    <SuperAdminLayout
      title="Partner Management"
      description="Manage GSM, identity, utility, finance and AI service providers."
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
          title="Total Partners"
          value={stats.total}
          icon={<Building2 size={23} />}
          color="blue"
        />

        <StatCard
          title="Active"
          value={stats.active}
          icon={<Activity size={23} />}
          color="green"
        />

        <StatCard
          title="Disabled"
          value={stats.disabled}
          icon={<Power size={23} />}
          color="red"
        />

        <StatCard
          title="Fallback Providers"
          value={stats.fallback}
          icon={<ShieldCheck size={23} />}
          color="yellow"
        />
      </section>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-4 md:grid-cols-[1fr_180px_180px]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4">
            <Search
              size={18}
              className="text-slate-500"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search partner, code or URL..."
              className="w-full bg-transparent py-4 outline-none"
            />
          </div>

          <select
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value
              )
            }
            className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 outline-none"
          >
            <option value="ALL">
              All Categories
            </option>

            {CATEGORIES.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value
              )
            }
            className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 outline-none"
          >
            <option value="ALL">
              All Statuses
            </option>

            <option value="ACTIVE">
              Active
            </option>

            <option value="DISABLED">
              Disabled
            </option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              loadPartners({
                silent: true,
              })
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

            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
          >
            <PlusCircle size={18} />
            Add Partner
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading partners...
          </div>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
          <Building2
            size={44}
            className="mx-auto text-slate-600"
          />

          <h2 className="mt-5 text-xl font-bold">
            No partners found
          </h2>

          <p className="mt-2 text-slate-400">
            Add your first partner API to
            begin routing services.
          </p>

          <button
            type="button"
            onClick={openCreateModal}
            className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
          >
            <PlusCircle size={18} />
            Add First Partner
          </button>
        </div>
      ) : (
        <section className="grid gap-6 xl:grid-cols-2">
          {filteredPartners.map(
            (partner) => {
              const working =
                workingId === partner.id;

              return (
                <article
                  key={partner.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                        <Server size={25} />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-bold">
                            {partner.name}
                          </h2>

                          <StatusBadge
                            status={
                              partner.status
                            }
                          />
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {partner.code} •{" "}
                          {partner.category}
                        </p>
                      </div>
                    </div>

                    <span className="w-fit rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-400">
                      Priority {partner.priority}
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    <InfoRow
                      label="API Base URL"
                      value={partner.baseUrl}
                    />

                    <InfoRow
                      label="Fallback"
                      value={
                        partner.isFallback
                          ? "Enabled"
                          : "Disabled"
                      }
                    />

                    <InfoRow
                      label="Services"
                      value={
                        Array.isArray(
                          partner.services
                        ) &&
                        partner.services.length >
                          0
                          ? partner.services
                              .map(
                                (service) =>
                                  service.name ||
                                  service.code
                              )
                              .join(", ")
                          : "Not mapped yet"
                      }
                    />
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() =>
                        openEditModal(
                          partner
                        )
                      }
                      disabled={working}
                      className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 font-semibold hover:bg-slate-700 disabled:opacity-50"
                    >
                      <Pencil size={17} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        togglePartnerStatus(
                          partner
                        )
                      }
                      disabled={working}
                      className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold disabled:opacity-50 ${
                        partner.status ===
                        "ACTIVE"
                          ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                          : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      }`}
                    >
                      {working ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <Power size={17} />
                      )}

                      {partner.status ===
                      "ACTIVE"
                        ? "Disable"
                        : "Enable"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deletePartner(
                          partner
                        )
                      }
                      disabled={working}
                      className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 size={17} />
                      Delete
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </section>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center py-8">
            <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedPartner
                      ? "Edit Partner"
                      : "Add Partner"}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Configure partner identity,
                    API connection and routing
                    priority.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl bg-slate-800 p-2 hover:bg-slate-700 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={submitPartner}
                className="space-y-6"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <FormInput
                    label="Partner Name"
                    value={form.name}
                    onChange={(value) =>
                      updateForm(
                        "name",
                        value
                      )
                    }
                    placeholder="VTPass"
                    required
                  />

                  <FormInput
                    label="Partner Code"
                    value={form.code}
                    onChange={(value) =>
                      updateForm(
                        "code",
                        value
                          .toUpperCase()
                          .replace(
                            /[^A-Z0-9_]/g,
                            ""
                          )
                      )
                    }
                    placeholder="VTPASS"
                    required
                  />

                  <FormSelect
                    label="Category"
                    value={form.category}
                    onChange={(value) =>
                      updateForm(
                        "category",
                        value
                      )
                    }
                    options={CATEGORIES}
                  />

                  <FormSelect
                    label="Status"
                    value={form.status}
                    onChange={(value) =>
                      updateForm(
                        "status",
                        value
                      )
                    }
                    options={[
                      {
                        value: "ACTIVE",
                        label: "Active",
                      },
                      {
                        value: "DISABLED",
                        label: "Disabled",
                      },
                    ]}
                  />

                  <FormInput
                    label="Priority"
                    type="number"
                    min="1"
                    value={form.priority}
                    onChange={(value) =>
                      updateForm(
                        "priority",
                        value
                      )
                    }
                    required
                  />

                  <FormInput
                    label="Webhook URL"
                    type="url"
                    value={form.webhookUrl}
                    onChange={(value) =>
                      updateForm(
                        "webhookUrl",
                        value
                      )
                    }
                    placeholder="https://example.com/webhook"
                  />
                </div>

                <FormInput
                  label="API Base URL"
                  type="url"
                  value={form.baseUrl}
                  onChange={(value) =>
                    updateForm(
                      "baseUrl",
                      value
                    )
                  }
                  placeholder="https://api.partner.com"
                  required
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <SecretInput
                    label="API Key"
                    value={form.apiKey}
                    onChange={(value) =>
                      updateForm(
                        "apiKey",
                        value
                      )
                    }
                    visible={showApiKey}
                    onToggle={() =>
                      setShowApiKey(
                        (current) =>
                          !current
                      )
                    }
                  />

                  <SecretInput
                    label="Secret Key"
                    value={form.secretKey}
                    onChange={(value) =>
                      updateForm(
                        "secretKey",
                        value
                      )
                    }
                    visible={showSecretKey}
                    onToggle={() =>
                      setShowSecretKey(
                        (current) =>
                          !current
                      )
                    }
                  />

                  <FormInput
                    label="Username"
                    value={form.username}
                    onChange={(value) =>
                      updateForm(
                        "username",
                        value
                      )
                    }
                    placeholder="Optional"
                  />

                  <SecretInput
                    label="Password"
                    value={form.password}
                    onChange={(value) =>
                      updateForm(
                        "password",
                        value
                      )
                    }
                    visible={showPassword}
                    onToggle={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <input
                    type="checkbox"
                    checked={form.isFallback}
                    onChange={(event) =>
                      updateForm(
                        "isFallback",
                        event.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <span>
                    <span className="font-semibold text-slate-200">
                      Use as fallback provider
                    </span>

                    <span className="mt-1 block text-sm leading-6 text-slate-500">
                      The routing engine may use
                      this provider when the
                      primary provider fails.
                    </span>
                  </span>
                </label>

                <p className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-200">
                  API credentials must be
                  encrypted by the backend before
                  storage. They must never be
                  returned in full by GET
                  endpoints.
                </p>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />
                      Saving Partner...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      {selectedPartner
                        ? "Save Changes"
                        : "Create Partner"}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-400",
    green:
      "bg-green-500/10 text-green-400",
    red: "bg-red-500/10 text-red-400",
    yellow:
      "bg-yellow-500/10 text-yellow-400",
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]}`}
      >
        {icon}
      </div>

      <p className="mt-5 text-sm text-slate-400">
        {title}
      </p>

      <h3 className="mt-2 text-3xl font-extrabold">
        {value}
      </h3>
    </div>
  );
}

function StatusBadge({ status }) {
  const active = status === "ACTIVE";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs ${
        active
          ? "bg-green-500/10 text-green-400"
          : "bg-red-500/10 text-red-400"
      }`}
    >
      {status}
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-all font-semibold text-slate-200">
        {value || "-"}
      </p>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  min,
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">
        {label}
      </label>

      <input
        type={type}
        value={value}
        min={min}
        required={required}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
      >
        {options.map((item) => (
          <option
            key={item.value}
            value={item.value}
          >
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SecretInput({
  label,
  value,
  onChange,
  visible,
  onToggle,
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">
        {label}
      </label>

      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder="Leave empty to keep current credential"
          autoComplete="new-password"
          className="w-full bg-transparent py-4 outline-none"
        />

        <button
          type="button"
          onClick={onToggle}
          className="text-slate-500 hover:text-slate-300"
        >
          {visible ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>
      </div>
    </div>
  );
}