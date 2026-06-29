"use client";

import { useEffect, useState } from "react";
import {
  Landmark,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCcw,
} from "lucide-react";

import DashboardLayout from "../../components/DashboardLayout";
import KpiGrid from "../../components/KpiGrid";
import Filters from "../../components/Filters";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import ActionButton from "../../components/ActionButton";
import ConfirmPinModal from "../../components/ConfirmPinModal";
import FormModal from "../../components/FormModal";
import FormField from "../../components/FormField";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import api from "@/lib/api";

const formatMoney = (value) =>
  `₦${Number(value || 0).toLocaleString("en-US")}`;

export default function WithdrawalPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [message, setMessage] = useState("");

  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  const [rejectNote, setRejectNote] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await api.get("/wallet/withdrawal", {
        params: {
          search,
          status,
        },
      });

      setWithdrawals(res.data.withdrawals || []);
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to load withdrawals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [status]);

  const stats = {
    total: withdrawals.length,
    pending: withdrawals.filter((x) => x.status === "PENDING").length,
    approved: withdrawals.filter((x) => x.status === "APPROVED").length,
    rejected: withdrawals.filter((x) => x.status === "REJECTED").length,
  };

  const approve = async (pin) => {
    try {
      await api.patch(
        `/wallet/withdrawal/${selected.id}/approve`,
        {
          pin,
          note: "Approved by Super Admin",
        }
      );

      setPinOpen(false);
      setSelected(null);
      setMessage("Withdrawal approved.");
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Approval failed.");
    }
  };

  const reject = async () => {
    try {
      await api.patch(
        `/wallet/withdrawal/${selected.id}/reject`,
        {
          note: rejectNote || "Rejected",
        }
      );

      setDetailsOpen(false);
      setSelected(null);
      setRejectNote("");

      setMessage("Withdrawal rejected.");
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Rejection failed.");
    }
  };

  const columns = [
    {
      key: "customer",
      label: "Customer",
      render: (row) => (
        <div>
          <p className="font-semibold">{row.user?.name}</p>
          <p className="text-xs text-slate-500">
            {row.user?.email}
          </p>
        </div>
      ),
    },
    {
      key: "reference",
      label: "Reference",
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => formatMoney(row.amount),
    },
    {
      key: "bank",
      label: "Bank",
      render: (row) => row.bankName,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (row) =>
        new Date(row.createdAt).toLocaleString(),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Withdrawal Requests">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Withdrawal Requests"
      description="Approve and reject customer withdrawal requests."
    >
      {message && (
        <div className="mb-6 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 p-4">
          {message}
        </div>
      )}

      <KpiGrid
        items={[
          {
            title: "Total",
            value: stats.total,
            icon: <Landmark />,
            color: "blue",
          },
          {
            title: "Pending",
            value: stats.pending,
            icon: <Clock />,
            color: "yellow",
          },
          {
            title: "Approved",
            value: stats.approved,
            icon: <CheckCircle />,
            color: "green",
          },
          {
            title: "Rejected",
            value: stats.rejected,
            icon: <XCircle />,
            color: "red",
          },
        ]}
      />

      <div className="my-8">
        <Filters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search..."
          filters={[
            {
              key: "status",
              value: status,
              onChange: setStatus,
              options: [
                { value: "ALL", label: "All" },
                { value: "PENDING", label: "Pending" },
                { value: "APPROVED", label: "Approved" },
                { value: "REJECTED", label: "Rejected" },
              ],
            },
          ]}
        />
      </div>

      <div className="flex justify-end mb-5">
        <ActionButton
          icon={<RefreshCcw size={18} />}
          variant="secondary"
          onClick={loadData}
        >
          Refresh
        </ActionButton>
      </div>

      <DataTable
        title="Withdrawal Requests"
        description="All customer withdrawals."
        columns={columns}
        data={withdrawals}
        onView={(row) => {
          setSelected(row);
          setDetailsOpen(true);
        }}
      />

      <FormModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Withdrawal Details"
        submitText="Close"
        onSubmit={() => setDetailsOpen(false)}
      >
        {selected && (
          <div className="space-y-4">
            <ReadOnly label="Customer" value={selected.user?.name} />
            <ReadOnly label="Amount" value={formatMoney(selected.amount)} />
            <ReadOnly label="Bank" value={selected.bankName} />
            <ReadOnly label="Account Name" value={selected.accountName} />
            <ReadOnly label="Account Number" value={selected.accountNumber} />
            <ReadOnly label="Reference" value={selected.reference} />
            <ReadOnly label="Status" value={selected.status} />

            {selected.status === "PENDING" && (
              <>
                <FormField
                  textarea
                  label="Rejection Note"
                  value={rejectNote}
                  onChange={setRejectNote}
                />

                <div className="grid grid-cols-2 gap-4">
                  <ActionButton
                    variant="success"
                    onClick={() => {
                      setDetailsOpen(false);
                      setPinOpen(true);
                    }}
                  >
                    Approve
                  </ActionButton>

                  <ActionButton
                    variant="danger"
                    onClick={reject}
                  >
                    Reject
                  </ActionButton>
                </div>
              </>
            )}
          </div>
        )}
      </FormModal>

      <ConfirmPinModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title="Approve Withdrawal"
        description="Enter Super Admin PIN"
        onConfirm={approve}
      />
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
        readOnly
        value={value || "-"}
        className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
      />
    </div>
  );
}