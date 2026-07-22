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
  Search,
  RefreshCcw,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  X,
  Zap,
  Hash,
  User,
  MapPin,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const DEFAULT_ELECTRICITY_PROVIDERS = [
  {
    id: "AEDC",
    code: "AEDC",
    name: "Abuja Electricity Distribution Company",
    shortName: "AEDC",
    status: "ACTIVE",
  },
  {
    id: "EEDC",
    code: "EEDC",
    name: "Enugu Electricity Distribution Company",
    shortName: "EEDC",
    status: "ACTIVE",
  },
  {
    id: "EKEDC",
    code: "EKEDC",
    name: "Eko Electricity Distribution Company",
    shortName: "EKEDC",
    status: "ACTIVE",
  },
  {
    id: "IBEDC",
    code: "IBEDC",
    name: "Ibadan Electricity Distribution Company",
    shortName: "IBEDC",
    status: "ACTIVE",
  },
  {
    id: "IEDC",
    code: "IEDC",
    name: "Ikeja Electricity Distribution Company",
    shortName: "IKEDC",
    status: "ACTIVE",
  },
  {
    id: "JEDC",
    code: "JEDC",
    name: "Jos Electricity Distribution Company",
    shortName: "JEDC",
    status: "ACTIVE",
  },
  {
    id: "KAEDCO",
    code: "KAEDCO",
    name: "Kaduna Electricity Distribution Company",
    shortName: "KAEDCO",
    status: "ACTIVE",
  },
  {
    id: "KEDCO",
    code: "KEDCO",
    name: "Kano Electricity Distribution Company",
    shortName: "KEDCO",
    status: "ACTIVE",
  },
  {
    id: "PHED",
    code: "PHED",
    name: "Port Harcourt Electricity Distribution Company",
    shortName: "PHED",
    status: "ACTIVE",
  },
  {
    id: "BEDC",
    code: "BEDC",
    name: "Benin Electricity Distribution Company",
    shortName: "BEDC",
    status: "ACTIVE",
  },
  {
    id: "YEDC",
    code: "YEDC",
    name: "Yola Electricity Distribution Company",
    shortName: "YEDC",
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
    "Electricity Provider",

  shortName:
    provider?.shortName ||
    provider?.code ||
    provider?.serviceCode ||
    provider?.name ||
    "DISCO",

  status: String(
    provider?.status || "ACTIVE"
  ).toUpperCase(),

  logo: provider?.logo || null,

  minimumAmount: Number(
    provider?.minimumAmount || 100
  ),

  maximumAmount: Number(
    provider?.maximumAmount || 500000
  ),
});

export default function ElectricityMarketplacePage() {
  const [wallet, setWallet] = useState(null);
  const [providers, setProviders] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] =
    useState(null);

  const [meterType, setMeterType] =
    useState("PREPAID");

  const [meterNumber, setMeterNumber] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [amount, setAmount] = useState("");

  const [customer, setCustomer] =
    useState(null);

  const [verificationReference, setVerificationReference] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
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
              (provider) =>
                provider.id &&
                provider.status === "ACTIVE"
            )
        : [];

      setProviders(
        normalized.length > 0
          ? normalized
          : DEFAULT_ELECTRICITY_PROVIDERS
      );

      return normalized;
    } catch (error) {
      /*
       * Provider list na default na display ne kawai.
       * Actual verification da purchase har yanzu backend zai yi.
       */
      if (error?.response?.status === 404) {
        setProviders(
          DEFAULT_ELECTRICITY_PROVIDERS
        );

        return DEFAULT_ELECTRICITY_PROVIDERS;
      }

      throw error;
    }
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
              "Some electricity marketplace information could not be loaded."
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
      "electricity-purchase-successful",
      refreshWallet
    );

    socket.on(
      "transaction-updated",
      refreshWallet
    );

    socket.on(
      "electricity-providers-updated",
      refreshProviders
    );

    return () => {
      socket.off(
        "wallet-updated",
        refreshWallet
      );

      socket.off(
        "electricity-purchase-successful",
        refreshWallet
      );

      socket.off(
        "transaction-updated",
        refreshWallet
      );

      socket.off(
        "electricity-providers-updated",
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
        provider.shortName
          .toLowerCase()
          .includes(query) ||
        provider.code
          .toLowerCase()
          .includes(query)
      );
    });
  }, [providers, search]);

  const openPurchaseModal = (provider) => {
    setSelectedProvider(provider);
    setMeterType("PREPAID");
    setMeterNumber("");
    setPhoneNumber("");
    setAmount("");
    setCustomer(null);
    setVerificationReference("");
    setMessage("");
  };

  const closePurchaseModal = () => {
    if (verifying || purchasing) return;

    setSelectedProvider(null);
    setCustomer(null);
    setMeterNumber("");
    setPhoneNumber("");
    setAmount("");
    setVerificationReference("");
  };

  const resetVerification = () => {
    setCustomer(null);
    setVerificationReference("");
  };

  const validateMeterNumber = () => {
    const cleanMeterNumber =
      meterNumber.replace(/\s+/g, "");

    if (
      cleanMeterNumber.length < 6 ||
      cleanMeterNumber.length > 20 ||
      !/^[0-9]+$/.test(cleanMeterNumber)
    ) {
      setMessageType("error");
      setMessage(
        "Enter a valid electricity meter number."
      );

      return null;
    }

    return cleanMeterNumber;
  };

  const verifyMeter = async () => {
    if (!selectedProvider) return;

    const cleanMeterNumber =
      validateMeterNumber();

    if (!cleanMeterNumber) return;

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

          meterNumber:
            cleanMeterNumber,

          meterType,
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
          "Customer information was not returned."
        );
      }

      setCustomer({
        name:
          customerData.name ||
          customerData.customerName ||
          customerData.fullName ||
          "Verified Customer",

        address:
          customerData.address ||
          customerData.customerAddress ||
          customerData.location ||
          "-",

        meterNumber:
          customerData.meterNumber ||
          cleanMeterNumber,

        accountNumber:
          customerData.accountNumber ||
          customerData.account ||
          null,

        minimumAmount:
          Number(
            customerData.minimumAmount ||
            selectedProvider.minimumAmount ||
            100
          ),

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
          "Meter verified successfully."
      );
    } catch (error) {
      setMessageType("error");

      setMessage(
        getErrorMessage(
          error,
          "Unable to verify meter number."
        )
      );
    } finally {
      setVerifying(false);
    }
  };

  const purchaseElectricity = async (event) => {
    event.preventDefault();

    if (!selectedProvider || !customer) {
      setMessageType("error");
      setMessage(
        "Verify the meter number before payment."
      );

      return;
    }

    const cleanMeterNumber =
      validateMeterNumber();

    if (!cleanMeterNumber) return;

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
        `Minimum electricity amount is ${formatNaira(
          minimumAmount
        )}.`
      );

      return;
    }

    if (numericAmount > maximumAmount) {
      setMessageType("error");

      setMessage(
        `Maximum electricity amount is ${formatNaira(
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
      setPurchasing(true);
      setMessage("");

      const response = await api.post(
        "/electricity/buy",
        {
          provider:
            selectedProvider.code,

          providerCode:
            selectedProvider.code,

          meterNumber:
            cleanMeterNumber,

          meterType,

          amount:
            numericAmount,

          phoneNumber:
            cleanPhone,

          customerName:
            customer.name,

          customerAddress:
            customer.address,

          accountNumber:
            customer.accountNumber,

          verificationReference:
            verificationReference || undefined,
        }
      );

      const transaction =
        response.data?.transaction ||
        response.data?.data?.transaction ||
        response.data?.data ||
        null;

      const token =
        response.data?.token ||
        response.data?.electricityToken ||
        transaction?.token ||
        transaction?.electricityToken ||
        null;

      setMessageType("success");

      setMessage(
        token
          ? `Electricity purchase successful. Token: ${token}`
          : response.data?.message ||
              "Electricity purchase submitted successfully."
      );

      setSelectedProvider(null);
      setCustomer(null);
      setMeterNumber("");
      setPhoneNumber("");
      setAmount("");
      setVerificationReference("");

      await fetchWallet();
    } catch (error) {
      setMessageType("error");

      setMessage(
        getErrorMessage(
          error,
          "Unable to process electricity purchase."
        )
      );
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <DashboardLayout
      title="Electricity Bills"
      description="Verify meters and purchase prepaid or postpaid electricity from supported distribution companies."
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
            placeholder="Search electricity provider..."
            className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
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
            Loading electricity providers...
          </div>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
          <Lightbulb
            size={44}
            className="mx-auto text-slate-600"
          />

          <h2 className="mt-5 text-xl font-bold">
            No provider found
          </h2>

          <p className="mt-2 text-slate-400">
            No active electricity provider
            matches your search.
          </p>
        </div>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {filteredProviders.map(
            (provider) => (
              <article
                key={provider.id}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-yellow-500"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400">
                    <Lightbulb size={27} />
                  </div>

                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                    {provider.status}
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold">
                  {provider.shortName}
                </h2>

                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
                  {provider.name}
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                  <ShieldCheck size={16} />
                  Meter verification available
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openPurchaseModal(provider)
                  }
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-500 py-3 font-semibold text-slate-950 hover:bg-yellow-400"
                >
                  <Zap size={18} />
                  Pay Electricity
                </button>
              </article>
            )
          )}
        </section>
      )}

      {selectedProvider && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    Electricity Payment
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    {selectedProvider.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePurchaseModal}
                  disabled={
                    verifying || purchasing
                  }
                  className="rounded-xl bg-slate-800 p-2 hover:bg-slate-700 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={purchaseElectricity}
                className="space-y-5"
              >
                <ReadOnly
                  label="Distribution Company"
                  value={selectedProvider.shortName}
                />

                <div>
                  <label className="text-sm text-slate-400">
                    Meter Type
                  </label>

                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {[
                      "PREPAID",
                      "POSTPAID",
                    ].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setMeterType(type);
                          resetVerification();
                        }}
                        className={`rounded-2xl border px-4 py-4 font-semibold transition ${
                          meterType === type
                            ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
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
                          event.target.value.replace(
                            /\D/g,
                            ""
                          )
                        );

                        resetVerification();
                      }}
                      placeholder="Enter meter number"
                      required
                      className="w-full bg-transparent py-4 outline-none"
                    />
                  </div>
                </div>

                {!customer && (
                  <button
                    type="button"
                    onClick={verifyMeter}
                    disabled={
                      verifying ||
                      !meterNumber
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:opacity-50"
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
                )}

                {customer && (
                  <section className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
                    <div className="mb-4 flex items-center gap-2 text-green-400">
                      <CheckCircle2 size={20} />
                      <h3 className="font-bold">
                        Meter Verified
                      </h3>
                    </div>

                    <CustomerInfo
                      icon={<User size={17} />}
                      label="Customer Name"
                      value={customer.name}
                    />

                    <CustomerInfo
                      icon={<Hash size={17} />}
                      label="Meter Number"
                      value={customer.meterNumber}
                    />

                    <CustomerInfo
                      icon={<MapPin size={17} />}
                      label="Address"
                      value={customer.address}
                    />
                  </section>
                )}

                {customer && (
                  <>
                    <div>
                      <label className="text-sm text-slate-400">
                        Phone Number
                      </label>

                      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-yellow-500">
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

                    <div>
                      <label className="text-sm text-slate-400">
                        Amount
                      </label>

                      <input
                        type="number"
                        min={
                          customer.minimumAmount ||
                          selectedProvider.minimumAmount
                        }
                        value={amount}
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
                      {[
                        1000,
                        2000,
                        5000,
                        10000,
                      ].map((quickAmount) => (
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
                      ))}
                    </div>

                    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                      <p className="text-sm text-yellow-200">
                        Payment Amount
                      </p>

                      <p className="mt-1 text-3xl font-extrabold text-yellow-400">
                        {formatNaira(amount)}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={purchasing}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-500 py-4 font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-50"
                    >
                      {purchasing ? (
                        <>
                          <LoaderCircle
                            size={18}
                            className="animate-spin"
                          />
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <Zap size={18} />
                          Pay Electricity
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