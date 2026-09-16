"use client";

import { useState, useEffect } from "react";
import { 
  KeyRound, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  LoaderCircle, 
  RefreshCcw, 
  UserCheck, 
  Zap, 
  Percent 
} from "lucide-react";
import api from "@/lib/api";

export default function AdminApiWhitelistPage() {
  const [apiKey, setApiKey] = useState("");
  const [customMtnPrice, setCustomMtnPrice] = useState("");
  const [discountPerGb, setDiscountPerGb] = useState("30");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [activatedUsers, setActivatedUsers] = useState([]);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchActivatedUsers();
  }, []);

  const fetchActivatedUsers = async () => {
    try {
      setListLoading(true);
      const res = await api.get("/private-tier/admin/requests");
      const list = res.data?.data || [];
      setActivatedUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load VIP list", err);
    } finally {
      setListLoading(false);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setMessage({ text: "Please paste the customer's Live API Key.", type: "error" });
      return;
    }

    try {
      setLoading(true);
      setMessage({ text: "", type: "" });

      const payload = {
        apiKey: apiKey.trim(),
        customMtnPrice: customMtnPrice ? Number(customMtnPrice) : null,
        discountPerGb: discountPerGb ? Number(discountPerGb) : 30,
        note: note.trim() || "Manual activation via SuperAdmin Terminal",
      };

      const res = await api.post("/private-tier/admin/direct-activate", payload);

      if (res.data?.success) {
        setMessage({
          text: res.data.message || "Customer successfully activated on Private VIP Wholesale Tier!",
          type: "success",
        });
        setApiKey("");
        setCustomMtnPrice("");
        setNote("");
        fetchActivatedUsers();
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || err.message || "Activation failed. Verify the API Key.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400">
              <KeyRound size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">VIP API Activation Terminal</h1>
              <p className="text-xs text-slate-400">
                Paste customer's API Key directly from WhatsApp to activate secret wholesale pricing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchActivatedUsers}
            disabled={listLoading}
            className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCcw size={14} className={listLoading ? "animate-spin" : ""} />
            Refresh Accounts
          </button>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
              message.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Activation Form Box */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-xl">
          <div className="mb-6 border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck size={20} className="text-amber-400" />
              Direct Whitelist Authorization
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Once activated, this customer alone will see your discounted secret rates on their dashboard.
            </p>
          </div>

          <form onSubmit={handleActivate} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Paste Customer's API Key *
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ayax_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 font-mono text-xs text-white outline-none transition focus:border-amber-500"
                required
              />
              <span className="mt-1.5 block text-[11px] text-slate-500">
                Kwafi ainihin API Key ɗin da ya turo maka a WhatsApp ka liƙa shi a nan.
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" />
                  Fixed MTN 1GB Price (₦) (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 215"
                  value={customMtnPrice}
                  onChange={(e) => setCustomMtnPrice(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-white outline-none transition focus:border-amber-500"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Idan ka cika wannan, MTN 1GB zai koma wannan farashin kai-tsaye.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Percent size={14} className="text-emerald-400" />
                  Discount Per GB (₦) *
                </label>
                <input
                  type="number"
                  value={discountPerGb}
                  onChange={(e) => setDiscountPerGb(e.target.value)}
                  placeholder="30"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-white outline-none transition focus:border-amber-500"
                  required
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Ragin da za a cire masa a kowane 1GB na duk sauran plans.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Internal Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. WhatsApp VIP Partner - Kano Hub (Daily Volume 1TB)"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-white outline-none transition focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 py-4 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Activating VIP Channel...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Authorize & Activate VIP Rates
                </>
              )}
            </button>
          </form>
        </div>

        {/* Activated VIP Accounts Table */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <UserCheck size={18} className="text-emerald-400" />
            Currently Activated Whitelist Accounts ({activatedUsers.length})
          </h3>

          {listLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500 gap-2">
              <LoaderCircle size={18} className="animate-spin" />
              Loading list...
            </div>
          ) : activatedUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs">
              No customer is currently whitelisted.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="pb-3">User Email</th>
                    <th className="pb-3">API Key</th>
                    <th className="pb-3">Configured Rates</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {activatedUsers.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3.5 font-semibold text-white">{item.userEmail}</td>
                      <td className="py-3.5 font-mono text-sky-400">
                        {item.apiKey ? `${item.apiKey.slice(0, 10)}...${item.apiKey.slice(-5)}` : "None"}
                      </td>
                      <td className="py-3.5 text-slate-300">
                        {item.customMtnPrice ? `₦${item.customMtnPrice} Fixed` : `₦${item.discountPerGb} Off / GB`}
                      </td>
                      <td className="py-3.5">
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                          {item.isActive ? "ACTIVE VIP" : item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}