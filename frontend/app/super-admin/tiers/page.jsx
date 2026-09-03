"use client";

import { useEffect, useState } from "react";
import { Save, Crown, Zap, LoaderCircle, CheckCircle2, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

export default function AdminTierSettingsPage() {
  const [standardFee, setStandardFee] = useState("");
  const [premiumFee, setPremiumFee] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  useEffect(() => {
    const fetchFees = async () => {
      try {
        setLoading(true);
        const res = await api.get("/settings/tier-fees");
        if (res.data?.data) {
          setStandardFee(res.data.data.STANDARD);
          setPremiumFee(res.data.data.PREMIUM);
        }
      } catch (err) {
        console.error("Failed to load tier fees:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFees();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage("");
      const res = await api.post("/settings/tier-fees", {
        standardFee: Number(standardFee),
        premiumFee: Number(premiumFee),
      });
      setMessageType("success");
      setMessage(res.data?.message || "Tier fees updated successfully!");
    } catch (err) {
      setMessageType("error");
      setMessage(err.response?.data?.message || "Failed to update fees.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex">
      <SuperSidebar />

      <section className="min-w-0 flex-1 p-6 lg:p-10">
        <SuperTopbar title="Account Tier Pricing Configuration" />

        {message && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-2xl border p-4 max-w-xl ${
              messageType === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {messageType === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm">{message}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 py-16 text-slate-400">
            <LoaderCircle className="animate-spin text-blue-500" />
            Loading tier configurations...
          </div>
        ) : (
          <form onSubmit={handleSave} className="max-w-2xl space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="text-blue-400" size={20} />
                  Standard Reseller Upgrade Fee (NGN)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Amount charged to regular users upgrading to Standard Reseller tier.
                </p>
                <div className="relative mt-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={standardFee}
                    onChange={(e) => setStandardFee(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3.5 text-lg font-bold text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Crown className="text-amber-400" size={20} />
                  Premium Enterprise Upgrade Fee (NGN)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Amount charged to users upgrading to Premium Enterprise tier.
                </p>
                <div className="relative mt-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={premiumFee}
                    onChange={(e) => setPremiumFee(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3.5 text-lg font-bold text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-500 disabled:opacity-50 shadow-lg shadow-blue-600/20 text-sm transition-all"
            >
              {saving ? <LoaderCircle className="animate-spin" size={18} /> : <Save size={18} />}
              Save Tier Fees
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
