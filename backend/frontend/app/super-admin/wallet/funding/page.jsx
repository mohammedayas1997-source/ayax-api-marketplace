"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCcw,
  Eye,
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

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-US")}`;

export default function WalletFundingPage() {
  const [fundings, setFundings] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [actionType, setActionType] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  const loadFundings = async () => {
    try {
      setLoading(true);

      const res = await api.get("/wallet/funding", {
        params: { search, status },
      });

      setFundings(res.data.fundings || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load funding requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFundings();
  }, [status]);

  const stats = {
    total: fundings.length,
    pending: fundings.filter((f) => f.status === "PENDING").length,
    approved: fundings.filter((f) => f.status === "APPROVED").length,
    rejected: fundings.filter((f) => f.status === "REJECTED").length,
  };

  const approveFunding = async (pin) => {
    if (!selected) return;

    await api.patch(`/wallet/funding/${selected.id}/approve`, {
      pin,
      note: "Approved from Super Admin dashboard",
    });

    setMessage("Funding approved successfully.");
    setPinOpen(false);
    setSelected(null);
    loadFundings();
  };

  const rejectFunding = async () => {
    if (!selected) return;

    try {
      await api.patch(`/wallet/funding/${selected.id}/reject`, {
        note: rejectNote || "Rejected from Super Admin dashboard",
      });

      setMessage("Funding rejected successfully.");
      setDetailsOpen(false);
      setSelected(null);
      setRejectNote("");
      loadFundings();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to reject funding.");
    }
  };

  const columns = [
    {
      key: "user",
      label: "Customer",
      render: (row) => (
        <div>
          <p className="font-bold">{row.user?.name || "-"}</p>
          <p className="text-xs text-slate-500">{row.user?.email || "-"}</p>
        </div>
      ),
    },
    {
      key: "reference",
      label: "Reference",
      render: (row) => (
        <span className="font-mono text-blue-400 text-xs">{row.reference}</span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => <span className="font-bold">{formatNaira(row.amount)}</span>,
    },
    {
      key: "channel",
      label: "Channel",
      render: (row) => row.channel || "MANUAL",
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      label: "Date",
      render: (row) =>
        row.createdAt ? new Date(row.createdAt).toLocaleString() : "-",
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Funding Requests">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Funding Requests"
      description="Review, approve, and reject wallet funding requests."
    >
      {message && (
        <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
          {message}
        </div>
      )}

      <div className="mb-8">
        <KpiGrid
          items={[
            { title: "Total Requests", value: stats.total, icon: <CreditCard />, color: "blue" },
            { title: "Pending", value: stats.pending, icon: <Clock />, color: "yellow" },
            { title: "Approved", value: stats.approved, icon: <CheckCircle />, color: "green" },
            { title: "Rejected", value: stats.rejected, icon: <XCircle />, color: "red" },
          ]}
        />
      </div>

      <div className="mb-8">
        <Filters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by customer, email, phone, reference..."
          filters={[
            {
              key: "status",
              value: status,
              onChange: setStatus,
              options: [
                { value: "ALL", label: "All Status" },
                { value: "PENDING", label: "Pending" },
                { value: "APPROVED", label: "Approved" },
                { value: "REJECTED", label: "Rejected" },
                { value: "CANCELLED", label: "Cancelled" },
              ],
            },
          ]}
          onReset={() => {
            setSearch("");
            setStatus("ALL");
            loadFundings();
          }}
        />
      </div>

      <div className="mb-6 flex justify-end">
        <ActionButton
          icon={<RefreshCcw size={18} />}
          variant="secondary"
          onClick={loadFundings}
        >
          Refresh
        </ActionButton>
      </div>

      <DataTable
        title="All Funding Requests"
        description="Wallet funding requests submitted by customers."
        columns={columns}
        data={fundings}
        searchKeys={["reference", "channel", "status"]}
        onView={(row) => {
          setSelected(row);
          setDetailsOpen(true);
        }}
        pageSize={10}
      />

      <FormModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Funding Details"
        submitText="Close"
        onSubmit={() => setDetailsOpen(false)}
        width="max-w-4xl"
      >
        {selected && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <ReadOnly label="Customer" value={selected.user?.name || "-"} />
              <ReadOnly label="Email" value={selected.user?.email || "-"} />
              <ReadOnly label="Phone" value={selected.user?.phone || "-"} />
              <ReadOnly label="Reference" value={selected.reference} />
              <ReadOnly label="Amount" value={formatNaira(selected.amount)} />
              <ReadOnly label="Channel" value={selected.channel || "MANUAL"} />
              <ReadOnly label="Status" value={selected.status} />
              <ReadOnly
                label="Date"
                value={selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "-"}
              />
            </div>

            {selected.proofUrl && (
              <a
                href={selected.proofUrl}
                target="_blank"
                className="inline-flex items-center gap-2 text-blue-400"
              >
                <Eye size={18} />
                View Payment Proof
              </a>
            )}

            {selected.status === "PENDING" && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <ActionButton
                    variant="success"
                    icon={<CheckCircle size={18} />}
                    onClick={() => {
                      setActionType("APPROVE");
                      setDetailsOpen(false);
                      setPinOpen(true);
                    }}
                  >
                    Approve Funding
                  </ActionButton>

                  <ActionButton
                    variant="danger"
                    icon={<XCircle size={18} />}
                    onClick={rejectFunding}
                  >
                    Reject Funding
                  </ActionButton>
                </div>

                <FormField
                  label="Rejection Note"
                  textarea
                  value={rejectNote}
                  onChange={setRejectNote}
                  placeholder="Reason for rejection..."
                />
              </>
            )}
          </div>
        )}
      </FormModal>

      <ConfirmPinModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title="Approve Funding"
        description="Enter Super Admin PIN to credit customer wallet."
        onConfirm={approveFunding}
      />
    </DashboardLayout>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        value={value}
        readOnly
        className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none cursor-not-allowed"
      />
    </div>
  );
}