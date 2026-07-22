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
  Search,
  RefreshCcw,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  X,
  Hash,
  User,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const DEFAULT_CABLE_PROVIDERS = [
  {
    id: "DSTV",
    code: "DSTV",
    name: "DStv",
    status: "ACTIVE",
  },
  {
    id: "GOTV",
    code: "GOTV",
    name: "GOtv",
    status: "ACTIVE",
  },
  {
    id: "STARTIMES",
    code: "STARTIMES",
    name: "StarTimes",
    status: "ACTIVE",
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

const normalizeProvider = (provider) => ({
  id:
    provider?.id ||
    provider?.code ||
    provider?.serviceCode ||
    provider?.slug,

  code:
    provider?.code ||
    provider?.serviceCode ||
    provider?.id ||
    provider?.slug,

  name:
    provider?.name ||
    provider?.displayName ||
    provider?.providerName ||
    "Cable Provider",

  status: String(
    provider?.status || "ACTIVE"
  ).toUpperCase(),

  logo: provider?.logo || null,
});

const normalizePackage = (item, providerCode) => ({
  id:
    item?.id ||
    item?.packageId ||
    item?.variationCode ||
    item?.code,

  code:
    item?.code ||
    item?.variationCode ||
    item?.packageCode ||
    item?.id,

  name:
    item?.name ||
    item?.packageName ||
    item?.title ||
    "Cable Package",

  providerCode:
    item?.providerCode ||
    item?.provider ||
    providerCode,

  amount: Number(
    item?.amount ??
      item?.price ??
      item?.sellingPrice ??
      0
  ),

  status: String(
    item?.status || "ACTIVE"
  ).toUpperCase(),

  validity:
    item?.validity ||
    item?.duration ||
    null,

  description:
    item?.description ||
    null,
});

export default function CableMarketplacePage() {
  const [wallet, setWallet] = useState(null);
  const [providers, setProviders] = useState([]);
  const [packages, setPackages] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] =
    useState(null);

  const [selectedPackage, setSelectedPackage] =
    useState(null);

  const [smartcardNumber, setSmartcardNumber] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [customer, setCustomer] =
    useState(null);

  const [verificationReference, setVerificationReference] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [loadingPackages, setLoadingPackages] =
    useState(false);

  const [verifying, setVerifying] =
    useState(false);

  const [purchasing, setPurchasing] =
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

  const fetchProviders = useCallback(async () => {
    try {
      const response = await api.get(
        "/cable/providers"
      );

      const list =
        response.data?.providers ||
        response.data?.services ||
        response.data?.data?.providers ||
        response.data?.data ||
        [];

      const normalized = Array.isArray(list)
        ? list
            .map(normalizeProvider)
            .filter(
              (provider) =>
                provider.id &&
                provider.status === "ACTIVE"
            )
        : [];

      const finalProviders =
        normalized.length > 0
          ? normalized
          : DEFAULT_CABLE_PROVIDERS;

      setProviders(finalProviders);

      return finalProviders;
    } catch (error) {
      if (error?.response?.status === 404) {
        setProviders(DEFAULT_CABLE_PROVIDERS);
        return DEFAULT_CABLE_PROVIDERS;
      }

      throw error;
    }
  }, []);

  const fetchPackages = useCallback(
    async (providerCode) => {
      if (!providerCode) {
        setPackages([]);
        return [];
      }

      try {
        setLoadingPackages(true);

        const response = await api.get(
          "/cable/packages",
          {
            params: {
              provider: providerCode,
              providerCode,
            },
          }
        );

        const list =
          response.data?.packages ||
          response.data?.plans ||
          response.data?.variations ||
          response.data?.data?.packages ||
          response.data?.data ||
          [];

        const normalized = Array.isArray(list)
          ? list
              .map((item) =>
                normalizePackage(
                  item,
                  providerCode
                )
              )
              .filter(
                (item) =>
                  item.id &&
                  item.status === "ACTIVE"
              )
          : [];

        setPackages(normalized);

        return normalized;
      } catch (error) {
        setPackages([]);
        throw error;
      } finally {
        setLoadingPackages(false);
      }
    },
    []
  );

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
            fetchProviders(),
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
              "Some cable marketplace information could not be loaded."
            )
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWallet, fetchProviders]
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

    const refreshWallet = () => {
      fetchWallet().catch(console.error);
    };

    const refreshProviders = () => {
      fetchProviders().catch(console.error);
    };

    socket.on(
      "wallet-updated",
      refreshWallet
    );

    socket.on(
      "cable-purchase-successful",
      refreshWallet
    );

    socket.on(
      "transaction-updated",
      refreshWallet
    );

    socket.on(
      "cable-providers-updated",
      refreshProviders
    );

    socket.on(
      "cable-packages-updated",
      refreshProviders
    );

    return () => {
      socket.off(
        "wallet-updated",
        refreshWallet
      );

      socket.off(
        "cable-purchase-successful",
        refreshWallet
      );

      socket.off(
        "transaction-updated",
        refreshWallet
      );

      socket.off(
        "cable-providers-updated",
        refreshProviders
      );

      socket.off(
        "cable-packages-updated",
        refreshProviders
      );
    };
  }, [
    loadPage,
    fetchWallet,
    fetchProviders,
  ]);

  const filteredProviders = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return providers.filter((provider) => {
      return (
        !query ||
        provider.name
          .toLowerCase()
          .includes(query) ||
        provider.code
          .toLowerCase()
          .includes(query)
      );
    });
  }, [providers, search]);

  const openProvider = async (provider) => {
    setSelectedProvider(provider);
    setSelectedPackage(null);
    setSmartcardNumber("");
    setPhoneNumber("");
    setCustomer(null);
    setVerificationReference("");
    setPackages([]);
    setMessage("");

    try {
      await fetchPackages(provider.code);
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to load cable packages."
        )
      );
    }
  };

  const closeModal = () => {
    if (
      verifying ||
      purchasing ||
      loadingPackages
    ) {
      return;
    }

    setSelectedProvider(null);
    setSelectedPackage(null);
    setSmartcardNumber("");
    setPhoneNumber("");
    setCustomer(null);
    setVerificationReference("");
    setPackages([]);
  };

  const resetVerification = () => {
    setCustomer(null);
    setVerificationReference("");
  };

  const validateSmartcardNumber = () => {
    const value =
      smartcardNumber
        .replace(/\s+/g, "")
        .trim();

    if (
      value.length < 5 ||
      value.length > 20 ||
      !/^[0-9]+$/.test(value)
    ) {
      setMessageType("error");
      setMessage(
        "Enter a valid smartcard or IUC number."
      );

      return null;
    }

    return value;
  };

  const verifyDecoder = async () => {
    if (!selectedProvider) return;

    const cleanNumber =
      validateSmartcardNumber();

    if (!cleanNumber) return;

    try {
      setVerifying(true);
      setMessage("");
      setCustomer(null);

      const response = await api.post(
        "/cable/verify",
        {
          provider:
            selectedProvider.code,

          providerCode:
            selectedProvider.code,

          smartcardNumber:
            cleanNumber,

          iucNumber:
            cleanNumber,
        }
      );

      const customerData =
        response.data?.customer ||
        response.data?.customerInfo ||
        response.data?.data?.customer ||
        response.data?.data ||
        null;

      if (!customerData) {
        throw new Error(
          "Subscriber information was not returned."
        );
      }

      setCustomer({
        name:
          customerData.name ||
          customerData.customerName ||
          customerData.fullName ||
          "Verified Subscriber",

        smartcardNumber:
          customerData.smartcardNumber ||
          customerData.iucNumber ||
          cleanNumber,

        currentPackage:
          customerData.currentPackage ||
          customerData.packageName ||
          customerData.bouquet ||
          "-",

        dueDate:
          customerData.dueDate ||
          customerData.expiryDate ||
          null,

        raw: customerData,
      });

      setVerificationReference(
        response.data?.reference ||
        response.data?.verificationReference ||
        response.data?.data?.reference ||
        ""
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "Subscriber verified successfully."
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to verify subscriber."
        )
      );
    } finally {
      setVerifying(false);
    }
  };

  const purchaseSubscription = async (event) => {
    event.preventDefault();

    if (
      !selectedProvider ||
      !selectedPackage ||
      !customer
    ) {
      setMessageType("error");
      setMessage(
        "Verify the subscriber and select a package."
      );
      return;
    }

    const cleanNumber =
      validateSmartcardNumber();

    if (!cleanNumber) return;

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

    const amount = Number(
      selectedPackage.amount || 0
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setMessageType("error");
      setMessage(
        "The selected package has an invalid amount."
      );
      return;
    }

    if (
      Number(wallet?.balance || 0) <
      amount
    ) {
      setMessageType("error");
      setMessage(
        "Insufficient wallet balance."
      );
      return;
    }

    try {
      setPurchasing(true);
      setMessage("");

      const response = await api.post(
        "/cable/buy",
        {
          provider:
            selectedProvider.code,

          providerCode:
            selectedProvider.code,

          packageId:
            selectedPackage.id,

          packageCode:
            selectedPackage.code,

          smartcardNumber:
            cleanNumber,

          iucNumber:
            cleanNumber,

          phoneNumber:
            cleanPhone,

          customerName:
            customer.name,

          amount,

          verificationReference:
            verificationReference || undefined,
        }
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "Cable subscription submitted successfully."
      );

      setSelectedProvider(null);
      setSelectedPackage(null);
      setSmartcardNumber("");
      setPhoneNumber("");
      setCustomer(null);
      setVerificationReference("");
      setPackages([]);

      await fetchWallet();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to process cable subscription."
        )
      );
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <DashboardLayout
      title="Cable TV"
      description="Verify subscribers and renew DStv, GOtv and StarTimes subscriptions."
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
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
          <Search
            size={18}
            className="text-slate-500"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search cable provider..."
            className="w-full bg-transparent py-4 outline-none"
          />
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading cable providers...
          </div>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
          <Tv
            size={44}
            className="mx-auto text-slate-600"
          />

          <h2 className="mt-5 text-xl font-bold">
            No cable provider found
          </h2>

          <p className="mt-2 text-slate-400">
            No active provider matches your search.
          </p>
        </div>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProviders.map(
            (provider) => (
              <article
                key={provider.id}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                    <Tv size={27} />
                  </div>

                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                    {provider.status}
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold">
                  {provider.name}
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Decoder verification and subscription renewal.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                  <ShieldCheck size={16} />
                  Subscriber verification available
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openProvider(provider)
                  }
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-semibold hover:bg-blue-700"
                >
                  <ShoppingCart size={18} />
                  Subscribe
                </button>
              </article>
            )
          )}
        </section>
      )}

      {selectedProvider && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    Cable Subscription
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    {selectedProvider.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={
                    verifying ||
                    purchasing ||
                    loadingPackages
                  }
                  className="rounded-xl bg-slate-800 p-2 hover:bg-slate-700 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={purchaseSubscription}
                className="space-y-5"
              >
                <ReadOnly
                  label="Provider"
                  value={selectedProvider.name}
                />

                <div>
                  <label className="text-sm text-slate-400">
                    Smartcard / IUC Number
                  </label>

                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
                    <Hash
                      size={18}
                      className="text-slate-500"
                    />

                    <input
                      inputMode="numeric"
                      value={smartcardNumber}
                      onChange={(event) => {
                        setSmartcardNumber(
                          event.target.value.replace(
                            /\D/g,
                            ""
                          )
                        );

                        resetVerification();
                      }}
                      placeholder="Enter smartcard or IUC number"
                      required
                      className="w-full bg-transparent py-4 outline-none"
                    />
                  </div>
                </div>

                {!customer && (
                  <button
                    type="button"
                    onClick={verifyDecoder}
                    disabled={
                      verifying ||
                      !smartcardNumber
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {verifying ? (
                      <>
                        <LoaderCircle
                          size={18}
                          className="animate-spin"
                        />
                        Verifying Subscriber...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        Verify Subscriber
                      </>
                    )}
                  </button>
                )}

                {customer && (
                  <section className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
                    <div className="mb-4 flex items-center gap-2 text-green-400">
                      <CheckCircle2 size={20} />
                      <h3 className="font-bold">
                        Subscriber Verified
                      </h3>
                    </div>

                    <SubscriberInfo
                      icon={<User size={17} />}
                      label="Customer Name"
                      value={customer.name}
                    />

                    <SubscriberInfo
                      icon={<Hash size={17} />}
                      label="Smartcard Number"
                      value={
                        customer.smartcardNumber
                      }
                    />

                    <SubscriberInfo
                      icon={
                        <ReceiptText size={17} />
                      }
                      label="Current Package"
                      value={
                        customer.currentPackage
                      }
                    />
                  </section>
                )}

                {customer && (
                  <>
                    <div>
                      <label className="text-sm text-slate-400">
                        Select Package
                      </label>

                      {loadingPackages ? (
                        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-400">
                          <LoaderCircle
                            size={18}
                            className="animate-spin"
                          />
                          Loading packages...
                        </div>
                      ) : packages.length === 0 ? (
                        <div className="mt-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
                          No active package is available.
                        </div>
                      ) : (
                        <div className="mt-2 max-h-72 space-y-3 overflow-y-auto pr-1">
                          {packages.map(
                            (item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() =>
                                  setSelectedPackage(
                                    item
                                  )
                                }
                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                  selectedPackage?.id ===
                                  item.id
                                    ? "border-blue-500 bg-blue-500/10"
                                    : "border-slate-800 bg-slate-950 hover:border-slate-700"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <h3 className="font-bold">
                                      {item.name}
                                    </h3>

                                    {item.validity && (
                                      <p className="mt-1 text-sm text-slate-500">
                                        {
                                          item.validity
                                        }
                                      </p>
                                    )}
                                  </div>

                                  <span className="font-bold text-blue-400">
                                    {formatNaira(
                                      item.amount
                                    )}
                                  </span>
                                </div>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm text-slate-400">
                        Phone Number
                      </label>

                      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
                        <ReceiptText
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

                    {selectedPackage && (
                      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                        <p className="text-sm text-blue-200">
                          Subscription Amount
                        </p>

                        <p className="mt-1 text-3xl font-extrabold text-blue-400">
                          {formatNaira(
                            selectedPackage.amount
                          )}
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        purchasing ||
                        !selectedPackage
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {purchasing ? (
                        <>
                          <LoaderCircle
                            size={18}
                            className="animate-spin"
                          />
                          Processing Subscription...
                        </>
                      ) : (
                        <>
                          <Tv size={18} />
                          Pay Subscription
                        </>
                      )}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div>
      <label className="text-sm text-slate-400">
        {label}
      </label>

      <input
        value={value || ""}
        readOnly
        className="mt-2 w-full cursor-not-allowed rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none"
      />
    </div>
  );
}

function SubscriberInfo({
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