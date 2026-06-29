"use client";

import { useState } from "react";
import {
  Wallet,
  PlusCircle,
  MinusCircle,
  ShieldCheck,
} from "lucide-react";

import DashboardLayout from "../../components/DashboardLayout";
import FormModal from "../../components/FormModal";
import FormField from "../../components/FormField";
import ActionButton from "../../components/ActionButton";
import api from "@/lib/api";

export default function ManualWalletAdjustmentPage() {
  const [form, setForm] = useState({
    userId: "",
    type: "CREDIT",
    amount: "",
    description: "",
    pin: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    try {
      setLoading(true);

      await api.post("/wallet/adjust", {
        ...form,
        amount: Number(form.amount),
      });

      setMessage("Wallet adjusted successfully.");

      setForm({
        userId: "",
        type: "CREDIT",
        amount: "",
        description: "",
        pin: "",
      });
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Wallet adjustment failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Manual Wallet Adjustment"
      description="Credit or debit any customer wallet."
    >
      {message && (
        <div className="mb-6 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 p-4">
          {message}
        </div>
      )}

      <FormModal
        open={true}
        hideCloseButton
        title="Wallet Adjustment"
        submitText={loading ? "Processing..." : "Submit"}
        loading={loading}
        onSubmit={submit}
      >
        <div className="grid md:grid-cols-2 gap-5">

          <FormField
            label="User ID"
            value={form.userId}
            onChange={(v) =>
              setForm({ ...form, userId: v })
            }
          />

          <FormField
            label="Transaction Type"
            value={form.type}
            onChange={(v) =>
              setForm({ ...form, type: v })
            }
            options={[
              {
                value: "CREDIT",
                label: "Credit Wallet",
              },
              {
                value: "DEBIT",
                label: "Debit Wallet",
              },
            ]}
          />

          <FormField
            label="Amount"
            type="number"
            value={form.amount}
            onChange={(v) =>
              setForm({ ...form, amount: v })
            }
          />

          <FormField
            label="Super Admin PIN"
            type="password"
            value={form.pin}
            onChange={(v) =>
              setForm({ ...form, pin: v })
            }
          />

          <div className="md:col-span-2">
            <FormField
              textarea
              label="Description"
              value={form.description}
              onChange={(v) =>
                setForm({
                  ...form,
                  description: v,
                })
              }
            />
          </div>

        </div>

        <div className="mt-8 flex gap-4">

          <ActionButton
            icon={
              form.type === "CREDIT" ? (
                <PlusCircle size={18} />
              ) : (
                <MinusCircle size={18} />
              )
            }
            onClick={submit}
          >
            {form.type === "CREDIT"
              ? "Credit Wallet"
              : "Debit Wallet"}
          </ActionButton>

          <ActionButton
            variant="secondary"
            icon={<ShieldCheck size={18} />}
          >
            Super Admin Only
          </ActionButton>

        </div>
      </FormModal>
    </DashboardLayout>
  );
}