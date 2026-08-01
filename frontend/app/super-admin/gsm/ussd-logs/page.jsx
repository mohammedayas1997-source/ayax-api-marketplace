"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RefreshCcw,
  Search,
  Radio,
  CheckCircle2,
  XCircle,
  Clock3,
  Smartphone,
} from "lucide-react";

import DashboardLayout from "../../components/DashboardLayout";
import api from "@/lib/api";

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-NG");
};

const getStatusClasses = (status) => {
  const normalizedStatus = String(
    status || ""
  )
    .trim()
    .toUpperCase();

  if (
    [
      "SUCCESS",
      "SUCCESSFUL",
      "COMPLETED",
    ].includes(normalizedStatus)
  ) {
    return {
      label: normalizedStatus,
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      Icon: CheckCircle2,
    };
  }

  if (
    [
      "FAILED",
      "ERROR",
      "CANCELLED",
    ].includes(normalizedStatus)
  ) {
    return {
      label: normalizedStatus,
      className:
        "border-red-500/30 bg-red-500/10 text-red-300",
      Icon: XCircle,
    };
  }

  return {
    label:
      normalizedStatus || "PENDING",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-300",
    Icon: Clock3,
  };
};

const normalizeLogs = (payload) => {
  const candidates = [
    payload?.logs,
    payload?.ussdLogs,
    payload?.data?.logs,
    payload?.data?.ussdLogs,
    payload?.data,
  ];

  const list = candidates.find(
    Array.isArray
  );

  return list || [];
};

export default function UssdLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const loadLogs = useCallback(
    async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        /*
         * Wannan endpoint ne mafi yiwuwa.
         * Idan backend route ɗinka ya bambanta,
         * canza wannan layin kawai.
         */
        const response = await api.get("/commands/ussd-logs");

        setLogs(
          normalizeLogs(
            response?.data || {}
          )
        );
      } catch (error) {
        console.error(
          "Load USSD logs error:",
          error
        );

        setLogs([]);

        setErrorMessage(
          error?.response?.data
            ?.message ||
            error?.userMessage ||
            "Unable to retrieve USSD logs."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const query = String(search)
      .trim()
      .toLowerCase();

    if (!query) {
      return logs;
    }

    return logs.filter((item) => {
      const searchableText = [
        item?.reference,
        item?.command,
        item?.ussdCode,
        item?.network,
        item?.phoneNumber,
        item?.simNumber,
        item?.deviceName,
        item?.status,
        item?.message,
        item?.response,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        query
      );
    });
  }, [logs, search]);

  return (
    <DashboardLayout
      title="USSD Logs"
      description="View USSD commands, network responses and gateway execution status."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <Radio size={21} />
              </div>

              <div>
                <p className="text-sm text-slate-400">
                  Total Logs
                </p>

                <p className="text-2xl font-bold text-white">
                  {logs.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <CheckCircle2 size={21} />
              </div>

              <div>
                <p className="text-sm text-slate-400">
                  Successful
                </p>

                <p className="text-2xl font-bold text-white">
                  {
                    logs.filter(
                      (item) =>
                        [
                          "SUCCESS",
                          "SUCCESSFUL",
                          "COMPLETED",
                        ].includes(
                          String(
                            item?.status || ""
                          ).toUpperCase()
                        )
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-3 text-red-400">
                <XCircle size={21} />
              </div>

              <div>
                <p className="text-sm text-slate-400">
                  Failed
                </p>

                <p className="text-2xl font-bold text-white">
                  {
                    logs.filter(
                      (item) =>
                        [
                          "FAILED",
                          "ERROR",
                          "CANCELLED",
                        ].includes(
                          String(
                            item?.status || ""
                          ).toUpperCase()
                        )
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-800 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Gateway USSD History
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Search commands, networks,
                devices, references and responses.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4">
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
                  placeholder="Search logs..."
                  className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600 sm:w-64"
                />
              </div>

              <button
                type="button"
                onClick={loadLogs}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
          </div>

          {errorMessage && (
            <div className="m-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-950/70">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">
                    Date
                  </th>

                  <th className="px-5 py-4">
                    Device / SIM
                  </th>

                  <th className="px-5 py-4">
                    Network
                  </th>

                  <th className="px-5 py-4">
                    Command
                  </th>

                  <th className="px-5 py-4">
                    Response
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-16 text-center text-slate-400"
                    >
                      Loading USSD logs...
                    </td>
                  </tr>
                ) : filteredLogs.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-16 text-center"
                    >
                      <Radio
                        size={38}
                        className="mx-auto text-slate-600"
                      />

                      <p className="mt-4 font-semibold text-slate-300">
                        No USSD logs found
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Gateway USSD activity
                        will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(
                    (item, index) => {
                      const status =
                        getStatusClasses(
                          item?.status
                        );

                      const StatusIcon =
                        status.Icon;

                      return (
                        <tr
                          key={
                            item?.id ||
                            item?.reference ||
                            index
                          }
                          className="text-sm text-slate-300 hover:bg-slate-800/40"
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            {formatDate(
                              item?.createdAt ||
                                item?.timestamp
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Smartphone
                                size={18}
                                className="text-blue-400"
                              />

                              <div>
                                <p className="font-medium text-white">
                                  {item?.deviceName ||
                                    item?.deviceId ||
                                    "Unknown Device"}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {item?.phoneNumber ||
                                    item?.simNumber ||
                                    "No SIM number"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {item?.network ||
                              item?.provider ||
                              "—"}
                          </td>

                          <td className="px-5 py-4 font-mono text-blue-300">
                            {item?.ussdCode ||
                              item?.command ||
                              "—"}
                          </td>

                          <td className="max-w-md px-5 py-4">
                            <p className="line-clamp-3 whitespace-pre-wrap text-slate-400">
                              {item?.response ||
                                item?.message ||
                                "—"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                            >
                              <StatusIcon
                                size={14}
                              />

                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}