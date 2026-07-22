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
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileCheck2,
  Fingerprint,
  KeyRound,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  RefreshCcw,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  Tv,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const FALLBACK_SERVICES = [
  {
    id: "data-api",
    code: "DATA",
    name: "Data API",
    category: "TELECOM",
    description:
      "Purchase SME, corporate and other supported data bundles for MTN, Airtel, Glo and 9mobile.",
    status: "ACTIVE",
    startingPrice: 0,
    endpointCount: 2,
    href: "/dashboard/api-market/data",
    documentationHref: "/docs#data",
    icon: "WIFI",
  },
  {
    id: "airtime-api",
    code: "AIRTIME",
    name: "Airtime API",
    category: "TELECOM",
    description:
      "Send airtime recharge to MTN, Airtel, Glo and 9mobile phone numbers.",
    status: "ACTIVE",
    startingPrice: 50,
    endpointCount: 2,
    href: "/dashboard/api-market/airtime",
    documentationHref: "/docs#airtime",
    icon: "SMARTPHONE",
  },
  {
    id: "electricity-api",
    code: "ELECTRICITY",
    name: "Electricity API",
    category: "UTILITY",
    description:
      "Verify prepaid or postpaid meters and process electricity payments for supported Nigerian Discos.",
    status: "ACTIVE",
    startingPrice: 100,
    endpointCount: 3,
    href: "/dashboard/api-market/electricity",
    documentationHref: "/docs#electricity",
    icon: "LIGHTBULB",
  },
  {
    id: "cable-api",
    code: "CABLE_TV",
    name: "Cable TV API",
    category: "UTILITY",
    description:
      "Retrieve packages and process DStv, GOtv and StarTimes subscriptions.",
    status: "ACTIVE",
    startingPrice: 0,
    endpointCount: 4,
    href: "/dashboard/api-market/cable",
    documentationHref: "/docs#cable",
    icon: "TV",
  },
  {
    id: "bvn-api",
    code: "BVN_VERIFY",
    name: "BVN Verification API",
    category: "IDENTITY",
    description:
      "Verify BVN information securely for authorized KYC and account verification workflows.",
    status: "ACTIVE",
    startingPrice: 0,
    endpointCount: 2,
    href: "/dashboard/api-market/bvn",
    documentationHref: "/docs#bvn",
    icon: "SHIELD",
  },
  {
    id: "nin-api",
    code: "NIN_VERIFY",
    name: "NIN Verification API",
    category: "IDENTITY",
    description:
      "Verify National Identification Number information for approved identity verification purposes.",
    status: "ACTIVE",
    startingPrice: 0,
    endpointCount: 2,
    href: "/dashboard/api-market/nin",
    documentationHref: "/docs#nin",
    icon: "FINGERPRINT",
  },
  {
    id: "bvn-slip-api",
    code: "BVN_SLIP",
    name: "BVN Slip API",
    category: "IDENTITY",
    description:
      "Generate supported BVN slip packages through one secure Ayax API integration.",
    status: "COMING_SOON",
    startingPrice: 0,
    endpointCount: 2,
    href: "/dashboard/api-market/bvn-slip",
    documentationHref: "/docs#bvn-slip",
    icon: "FILE",
  },
  {
    id: "nin-slip-api",
    code: "NIN_SLIP",
    name: "NIN Slip API",
    category: "IDENTITY",
    description:
      "Access regular, standard and premium NIN slip packages from a unified API.",
    status: "COMING_SOON",
    startingPrice: 0,
    endpointCount: 2,
    href: "/dashboard/api-market/nin-slip",
    documentationHref: "/docs#nin-slip",
    icon: "CREDIT_CARD",
  },
  {
    id: "sms-api",
    code: "SMS",
    name: "SMS API",
    category: "MESSAGING",
    description:
      "Send SMS through the Ayax GSM Gateway and monitor delivery status in real time.",
    status: "COMING_SOON",
    startingPrice: 0,
    endpointCount: 3,
    href: "/dashboard/api-market/sms",
    documentationHref: "/docs#sms",
    icon: "MESSAGE",
  },
  {
    id: "gsm-gateway-api",
    code: "GSM_GATEWAY",
    name: "GSM Gateway API",
    category: "GATEWAY",
    description:
      "Connect Android GSM gateway devices for SMS, USSD, balance checks and device management.",
    status: "COMING_SOON",
    startingPrice: 0,
    endpointCount: 8,
    href: "/dashboard/api-market/gsm-gateway",
    documentationHref: "/docs#gsm-gateway",
    icon: "SERVER",
  },
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

const normalizeStatus = (value) =>
  String(value || "ACTIVE")
    .trim()
    .toUpperCase();

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const createServiceHref = (service = {}) => {
  if (service.href) {
    return service.href;
  }

  const code = normalizeCode(
    service.code ||
      service.serviceCode ||
      service.slug
  );

  const paths = {
    DATA: "/dashboard/api-market/data",
    AIRTIME: "/dashboard/api-market/airtime",
    ELECTRICITY:
      "/dashboard/api-market/electricity",
    CABLE: "/dashboard/api-market/cable",
    CABLE_TV: "/dashboard/api-market/cable",
    BVN: "/dashboard/api-market/bvn",
    BVN_VERIFY: "/dashboard/api-market/bvn",
    NIN: "/dashboard/api-market/nin",
    NIN_VERIFY: "/dashboard/api-market/nin",
    BVN_SLIP: "/dashboard/api-market/bvn-slip",
    NIN_SLIP: "/dashboard/api-market/nin-slip",
    SMS: "/dashboard/api-market/sms",
    GSM_GATEWAY:
      "/dashboard/api-market/gsm-gateway",
  };

  if (paths[code]) {
    return paths[code];
  }

  const slug = String(
    service.slug ||
      code
        .toLowerCase()
        .replace(/_/g, "-")
  );

  return `/dashboard/api-market/${slug}`;
};

const normalizeService = (service = {}) => ({
  id:
    service.id ||
    service.code ||
    service.serviceCode ||
    service.slug,

  code: normalizeCode(
    service.code ||
      service.serviceCode ||
      service.slug
  ),

  name:
    service.name ||
    service.serviceName ||
    service.title ||
    "API Service",

  description:
    service.description ||
    service.summary ||
    "Integrate this service through the Ayax APIs platform.",

  category: normalizeCode(
    service.category || "OTHER"
  ),

  status: normalizeStatus(
    service.status ||
      (service.enabled === false
        ? "DISABLED"
        : "ACTIVE")
  ),

  startingPrice: Number(
    service.startingPrice ??
      service.basePrice ??
      service.minimumPrice ??
      service.sellingPrice ??
      0
  ),

  endpointCount: Number(
    service.endpointCount ??
      service.endpoints?.length ??
      1
  ),

  href: createServiceHref(service),

  documentationHref:
    service.documentationHref ||
    service.documentationUrl ||
    `/docs#${String(
      service.code ||
        service.serviceCode ||
        service.slug ||
        ""
    )
      .toLowerCase()
      .replace(/_/g, "-")}`,

  icon:
    service.icon ||
    service.iconName ||
    service.category ||
    service.code ||
    "SERVER",

  metadata: service.metadata || null,
});

const normalizeApiKey = (item = {}) => ({
  id: item.id,
  status: normalizeStatus(
    item.status || "ACTIVE"
  ),
});

export default function ApiMarketplacePage() {
  const [services, setServices] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);

  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState("ALL");
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [message, setMessage] =
    useState("");
  const [messageType, setMessageType] =
    useState("info");

  const fetchServices = useCallback(async () => {
    const routes = [
      "/services",
      "/api-services",
      "/marketplace/services",
      "/api-marketplace/services",
    ];

    for (const route of routes) {
      try {
        const response = await api.get(route);

        const list =
          response.data?.services ||
          response.data?.apiServices ||
          response.data?.products ||
          response.data?.data?.services ||
          response.data?.data ||
          [];

        const normalized = Array.isArray(list)
          ? list
              .map(normalizeService)
              .filter((item) => item.id)
          : [];

        if (normalized.length > 0) {
          setServices(normalized);
          return normalized;
        }
      } catch (error) {
        if (
          error?.response?.status !== 404
        ) {
          throw error;
        }
      }
    }

    const fallback =
      FALLBACK_SERVICES.map(
        normalizeService
      );

    setServices(fallback);

    return fallback;
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const response =
        await api.get("/wallet");

      const walletData =
        response.data?.wallet ||
        response.data?.data?.wallet ||
        response.data?.data ||
        null;

      setWallet(walletData);

      return walletData;
    } catch (error) {
      if (
        error?.response?.status === 404
      ) {
        setWallet(null);
        return null;
      }

      throw error;
    }
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

  const loadMarketplace = useCallback(
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
            fetchServices(),
            fetchWallet(),
            fetchApiKeys(),
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
              "Some marketplace information could not be loaded."
            )
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      fetchServices,
      fetchWallet,
      fetchApiKeys,
    ]
  );

  useEffect(() => {
    loadMarketplace();

    const token =
      localStorage.getItem("token");

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const refreshWallet = () => {
      fetchWallet().catch(console.error);
    };

    const refreshServices = () => {
      fetchServices().catch(console.error);
    };

    const refreshApiKeys = () => {
      fetchApiKeys().catch(console.error);
    };

    socket.on(
      "wallet-updated",
      refreshWallet
    );

    socket.on(
      "api-service-created",
      refreshServices
    );

    socket.on(
      "api-service-updated",
      refreshServices
    );

    socket.on(
      "api-service-deleted",
      refreshServices
    );

    socket.on(
      "service-created",
      refreshServices
    );

    socket.on(
      "service-updated",
      refreshServices
    );

    socket.on(
      "service-deleted",
      refreshServices
    );

    socket.on(
      "marketplace-updated",
      refreshServices
    );

    socket.on(
      "pricing-created",
      refreshServices
    );

    socket.on(
      "pricing-updated",
      refreshServices
    );

    socket.on(
      "pricing-status-updated",
      refreshServices
    );

    socket.on(
      "api-key-created",
      refreshApiKeys
    );

    socket.on(
      "api-key-revoked",
      refreshApiKeys
    );

    return () => {
      socket.off(
        "wallet-updated",
        refreshWallet
      );

      socket.off(
        "api-service-created",
        refreshServices
      );

      socket.off(
        "api-service-updated",
        refreshServices
      );

      socket.off(
        "api-service-deleted",
        refreshServices
      );

      socket.off(
        "service-created",
        refreshServices
      );

      socket.off(
        "service-updated",
        refreshServices
      );

      socket.off(
        "service-deleted",
        refreshServices
      );

      socket.off(
        "marketplace-updated",
        refreshServices
      );

      socket.off(
        "pricing-created",
        refreshServices
      );

      socket.off(
        "pricing-updated",
        refreshServices
      );

      socket.off(
        "pricing-status-updated",
        refreshServices
      );

      socket.off(
        "api-key-created",
        refreshApiKeys
      );

      socket.off(
        "api-key-revoked",
        refreshApiKeys
      );
    };
  }, [
    loadMarketplace,
    fetchServices,
    fetchWallet,
    fetchApiKeys,
  ]);

  const categories = useMemo(() => {
    return [
      ...new Set(
        services
          .map(
            (service) =>
              service.category
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [services]);

  const filteredServices = useMemo(() => {
    const searchValue =
      query.trim().toLowerCase();

    return services.filter((service) => {
      const matchesSearch =
        !searchValue ||
        service.name
          .toLowerCase()
          .includes(searchValue) ||
        service.code
          .toLowerCase()
          .includes(searchValue) ||
        service.description
          .toLowerCase()
          .includes(searchValue) ||
        service.category
          .toLowerCase()
          .includes(searchValue);

      const matchesCategory =
        category === "ALL" ||
        service.category === category;

      const matchesStatus =
        statusFilter === "ALL" ||
        service.status === statusFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [
    services,
    query,
    category,
    statusFilter,
  ]);

  const marketplaceStats = useMemo(() => {
    return {
      total: services.length,

      live: services.filter(
        (item) =>
          item.status === "ACTIVE"
      ).length,

      comingSoon: services.filter(
        (item) =>
          item.status === "COMING_SOON"
      ).length,

      endpointCount: services.reduce(
        (sum, item) =>
          sum +
          Number(
            item.endpointCount || 0
          ),
        0
      ),
    };
  }, [services]);

  if (loading) {
    return (
      <DashboardLayout
        title="API Marketplace"
        description="Explore and integrate Ayax APIs."
      >
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />

            Loading API Marketplace...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="API Marketplace"
      description="Explore Ayax APIs, review pricing, test endpoints and copy integration examples."
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

      <section className="mb-8 overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/20 via-slate-900 to-slate-900 p-6 sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300">
              <Zap size={16} />
              All-in-One Developer Platform
            </div>

            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl">
              Build faster with one API
              integration
            </h1>

            <p className="mt-4 max-w-3xl leading-7 text-slate-300">
              Access telecom, utility,
              identity verification and GSM
              gateway services through Ayax
              APIs. Upstream partners and
              credentials remain securely
              managed by the Ayax backend.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-80 xl:grid-cols-1">
            <Link
              href="/dashboard/api-keys"
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-semibold hover:bg-blue-700"
            >
              <KeyRound size={18} />
              Manage API Keys
            </Link>

            <Link
              href="/docs"
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 font-semibold hover:bg-slate-800"
            >
              <BookOpen size={18} />
              Read Documentation
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Wallet Balance"
          value={formatNaira(
            wallet?.balance
          )}
          icon={<Wallet size={22} />}
        />

        <StatCard
          title="Live APIs"
          value={marketplaceStats.live}
          icon={<Activity size={22} />}
          status
        />

        <StatCard
          title="Active API Keys"
          value={apiKeys.length}
          icon={<KeyRound size={22} />}
        />

        <StatCard
          title="Available Endpoints"
          value={
            marketplaceStats.endpointCount
          }
          icon={<Server size={22} />}
        />
      </section>

      <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px_auto]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
            <Search
              size={18}
              className="text-slate-500"
            />

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search APIs, categories or service codes..."
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
            className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
          >
            <option value="ALL">
              All Categories
            </option>

            {categories.map((item) => (
              <option
                key={item}
                value={item}
              >
                {formatCategory(item)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
          >
            <option value="ALL">
              All Statuses
            </option>

            <option value="ACTIVE">
              Live
            </option>

            <option value="COMING_SOON">
              Coming Soon
            </option>

            <option value="DISABLED">
              Disabled
            </option>
          </select>

          <button
            type="button"
            onClick={() =>
              loadMarketplace({
                silent: true,
              })
            }
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 py-4 font-semibold hover:bg-slate-700 disabled:opacity-50"
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
      </section>

      {filteredServices.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
          <Server
            size={48}
            className="mx-auto text-slate-600"
          />

          <h2 className="mt-5 text-xl font-bold">
            No API service found
          </h2>

          <p className="mt-2 text-slate-400">
            No service matches your current
            search and filters.
          </p>
        </section>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map(
            (service) => (
              <ServiceCard
                key={service.id}
                service={service}
              />
            )
          )}
        </section>
      )}

      <section className="mt-10 rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-bold">
              One API key for all supported
              services
            </h2>

            <p className="mt-3 max-w-3xl leading-7 text-slate-400">
              Fund your wallet, generate an API
              key and call any active Ayax
              endpoint. Your balance,
              transactions and service usage
              are managed from one developer
              account.
            </p>
          </div>

          <Link
            href="/dashboard/api-keys"
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-700"
          >
            Get API Key
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>
    </DashboardLayout>
  );
}

function ServiceCard({ service }) {
  const isLive =
    service.status === "ACTIVE";

  const canOpen =
    service.status !== "DISABLED" &&
    service.status !== "COMING_SOON";

  const Icon =
    getServiceIcon(service.icon);

  return (
    <article className="group flex h-full flex-col rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-950/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 transition group-hover:bg-blue-600 group-hover:text-white">
          <Icon size={26} />
        </div>

        <StatusBadge
          status={service.status}
        />
      </div>

      <div className="mt-6 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold">
            {service.name}
          </h2>

          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
            {service.code}
          </span>
        </div>

        <p className="mt-4 min-h-20 leading-7 text-slate-400">
          {service.description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Starting Price
            </p>

            <p className="mt-2 font-bold">
              {service.startingPrice > 0
                ? formatNaira(
                    service.startingPrice
                  )
                : "View pricing"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Endpoints
            </p>

            <p className="mt-2 font-bold">
              {service.endpointCount}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
          {isLive ? (
            <>
              <CheckCircle2
                size={16}
                className="text-green-400"
              />
              Production service available
            </>
          ) : (
            <>
              <Activity
                size={16}
                className="text-yellow-400"
              />
              Service availability pending
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link
          href={service.documentationHref}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold hover:bg-slate-700"
        >
          <BookOpen size={17} />
          Docs
        </Link>

        {canOpen ? (
          <Link
            href={service.href}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-700"
          >
            Open API
            <ChevronRight size={17} />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-500"
          >
            Coming Soon
          </button>
        )}
      </div>
    </article>
  );
}

function StatCard({
  title,
  value,
  icon,
  status = false,
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
        {icon}
      </div>

      <p className="mt-5 text-sm text-slate-400">
        {title}
      </p>

      <div className="mt-2 flex items-center gap-2">
        {status && (
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        )}

        <h2 className="break-all text-3xl font-extrabold">
          {value}
        </h2>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized =
    normalizeStatus(status);

  const styles = {
    ACTIVE:
      "bg-green-500/10 text-green-400",
    COMING_SOON:
      "bg-yellow-500/10 text-yellow-400",
    DISABLED:
      "bg-red-500/10 text-red-400",
    MAINTENANCE:
      "bg-orange-500/10 text-orange-400",
  };

  const labels = {
    ACTIVE: "LIVE",
    COMING_SOON: "COMING SOON",
    DISABLED: "DISABLED",
    MAINTENANCE: "MAINTENANCE",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[normalized] ||
        "bg-slate-500/10 text-slate-400"
      }`}
    >
      {labels[normalized] || normalized}
    </span>
  );
}

function formatCategory(value) {
  return String(value || "OTHER")
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function getServiceIcon(value) {
  const iconName = normalizeCode(value);

  if (
    iconName.includes("DATA") ||
    iconName.includes("WIFI")
  ) {
    return Wifi;
  }

  if (
    iconName.includes("AIRTIME") ||
    iconName.includes("SMARTPHONE")
  ) {
    return Smartphone;
  }

  if (
    iconName.includes("ELECTRIC") ||
    iconName.includes("LIGHT") ||
    iconName.includes("UTILITY")
  ) {
    return Lightbulb;
  }

  if (
    iconName.includes("CABLE") ||
    iconName.includes("TV")
  ) {
    return Tv;
  }

  if (
    iconName.includes("NIN") ||
    iconName.includes("FINGER")
  ) {
    return Fingerprint;
  }

  if (
    iconName.includes("BVN") ||
    iconName.includes("SHIELD")
  ) {
    return ShieldCheck;
  }

  if (
    iconName.includes("SLIP") ||
    iconName.includes("FILE")
  ) {
    return FileCheck2;
  }

  if (
    iconName.includes("CREDIT")
  ) {
    return CreditCard;
  }

  if (
    iconName.includes("SMS") ||
    iconName.includes("MESSAGE")
  ) {
    return MessageSquareText;
  }

  return Server;
}