"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  BarChart3,
  CheckCircle2,
  MessageSquare,
  Radio,
  RefreshCcw,
  Smartphone,
  XCircle,
} from "lucide-react";

import DashboardLayout from "../../components/DashboardLayout";
import api from "@/lib/api";

const extractAnalytics = (payload = {}) => {
  const source =
    payload?.analytics ||
    payload?.stats ||
    payload?.data?.analytics ||
    payload?.data?.stats ||
    payload?.data ||
    payload;

  return {
    totalDevices: Number(
      source?.totalDevices ||
        source?.devices ||
        source?.deviceCount ||
        0
    ),

    onlineDevices: Number(
      source?.onlineDevices ||
        source?.activeDevices ||
        source?.online ||
        0
    ),

    offlineDevices: Number(
      source?.offlineDevices ||
        source?.inactiveDevices ||
        source?.offline ||
        0
    ),

    totalCommands: Number(
      source?.totalCommands ||
        source?.commands ||
        source?.commandCount ||
        0
    ),

    successfulCommands: Number(
      source?.successfulCommands ||
        source?.successful ||
        source?.successCount ||
        0
    ),

    failedCommands: Number(
      source?.failedCommands ||
        source?.failed ||
        source?.failedCount ||
        0
    ),

    totalSms: Number(
      source?.totalSms ||
        source?.sms ||
        source?.smsCount ||
        0
    ),

    totalUssd: Number(
      source?.totalUssd ||
        source?.ussd ||
        source?.ussdCount ||
        0
    ),
  };
};

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
}) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-3xl font-extrabold text-white">
            {Number(value || 0).toLocaleString()}
          </p>

          {description && (
            <p className="mt-2 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        <div
          className={`rounded-xl p-3 ${iconClassName}`}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
};

export default function GsmAnalyticsPage() {
  const [analytics, setAnalytics] =
    useState(() => extractAnalytics());

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadAnalytics = useCallback(
    async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        /*
         * Idan backend route ɗinka ya bambanta,
         * canza endpoint ɗin nan kawai.
         */
        const response = await api.get(
          "/gsm/analytics"
        );

        setAnalytics(
          extractAnalytics(
            response?.data || {}
          )
        );
      } catch (error) {
        console.error(
          "Load GSM analytics error:",
          error
        );

        setAnalytics(
          extractAnalytics()
        );

        setErrorMessage(
          error?.response?.data
            ?.message ||
            error?.userMessage ||
            "Unable to retrieve GSM analytics."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const successRate = useMemo(() => {
    if (
      analytics.totalCommands <= 0
    ) {
      return 0;
    }

    return Number(
      (
        (analytics.successfulCommands /
          analytics.totalCommands) *
        100
      ).toFixed(1)
    );
  }, [analytics]);

  const onlineRate = useMemo(() => {
    if (
      analytics.totalDevices <= 0
    ) {
      return 0;
    }

    return Number(
      (
        (analytics.onlineDevices /
          analytics.totalDevices) *
        100
      ).toFixed(1)
    );
  }, [analytics]);

  return (
    <DashboardLayout
      title="GSM Analytics"
      description="Monitor gateway devices, commands, SMS and USSD performance."
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={loadAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw
              size={18}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Devices"
            value={analytics.totalDevices}
            description="All registered GSM gateways"
            icon={Smartphone}
            iconClassName="bg-blue-500/10 text-blue-400"
          />

          <StatCard
            title="Online Devices"
            value={analytics.onlineDevices}
            description={`${onlineRate}% currently online`}
            icon={Activity}
            iconClassName="bg-emerald-500/10 text-emerald-400"
          />

          <StatCard
            title="Offline Devices"
            value={analytics.offlineDevices}
            description="Devices currently unavailable"
            icon={XCircle}
            iconClassName="bg-red-500/10 text-red-400"
          />

          <StatCard
            title="Total Commands"
            value={analytics.totalCommands}
            description="All GSM command requests"
            icon={BarChart3}
            iconClassName="bg-violet-500/10 text-violet-400"
          />

          <StatCard
            title="Successful Commands"
            value={
              analytics.successfulCommands
            }
            description={`${successRate}% success rate`}
            icon={CheckCircle2}
            iconClassName="bg-emerald-500/10 text-emerald-400"
          />

          <StatCard
            title="Failed Commands"
            value={analytics.failedCommands}
            description="Commands that were not completed"
            icon={XCircle}
            iconClassName="bg-red-500/10 text-red-400"
          />

          <StatCard
            title="SMS Activity"
            value={analytics.totalSms}
            description="Incoming and outgoing SMS records"
            icon={MessageSquare}
            iconClassName="bg-cyan-500/10 text-cyan-400"
          />

          <StatCard
            title="USSD Activity"
            value={analytics.totalUssd}
            description="Executed USSD requests"
            icon={Radio}
            iconClassName="bg-amber-500/10 text-amber-400"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-bold text-white">
              Command Performance
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Overall command success and failure rate.
            </p>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  Success Rate
                </span>

                <span className="font-semibold text-emerald-400">
                  {successRate}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.min(
                      successRate,
                      100
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Successful
                  </p>

                  <p className="mt-2 text-xl font-bold text-emerald-400">
                    {analytics.successfulCommands.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Failed
                  </p>

                  <p className="mt-2 text-xl font-bold text-red-400">
                    {analytics.failedCommands.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-bold text-white">
              Gateway Availability
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Current online and offline GSM devices.
            </p>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  Online Rate
                </span>

                <span className="font-semibold text-blue-400">
                  {onlineRate}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${Math.min(
                      onlineRate,
                      100
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Online
                  </p>

                  <p className="mt-2 text-xl font-bold text-emerald-400">
                    {analytics.onlineDevices.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Offline
                  </p>

                  <p className="mt-2 text-xl font-bold text-red-400">
                    {analytics.offlineDevices.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!loading &&
          !errorMessage &&
          analytics.totalDevices === 0 &&
          analytics.totalCommands === 0 &&
          analytics.totalSms === 0 &&
          analytics.totalUssd === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
              <BarChart3
                size={42}
                className="mx-auto text-slate-600"
              />

              <h3 className="mt-4 text-lg font-semibold text-white">
                No GSM analytics yet
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Analytics will appear when gateway devices begin processing commands.
              </p>
            </div>
          )}
      </div>
    </DashboardLayout>
  );
}