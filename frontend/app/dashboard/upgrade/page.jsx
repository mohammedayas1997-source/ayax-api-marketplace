"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Zap, 
  Crown, 
  Check, 
  LoaderCircle, 
  AlertCircle, 
  CheckCircle2,
  CreditCard
} from "lucide-react";
import api from "@/lib/api";

export default function TierUpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentReference = searchParams.get("reference");

  const [plans, setPlans] = useState([]);
  const [currentTier, setCurrentTier] = useState("REGULAR");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/tiers/plans");
      setPlans(res.data?.data || []);
      setCurrentTier(res.data?.currentTier || "REGULAR");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Tantance biya idan mai amfani ya dawo daga Paystack
  useEffect(() => {
    if (!paymentReference) return;

    const verifyPayment = async () => {
      try {
        setVerifying(true);
        setMessage("Verifying your Paystack payment, please wait...");
        setMessageType("info");

        const res = await api.get(`/tiers/paystack/verify/${paymentReference}`);

        setMessageType("success");
        setMessage(res.data?.message || "Tier upgrade successfully activated!");
        router.replace("/dashboard/upgrade", { scroll: false });
        await loadPlans();
      } catch (err) {
        setMessageType("error");
        setMessage(err.response?.data?.message || "Payment verification failed.");
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [paymentReference, router, loadPlans]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Fara Biyan Paystack Kai Tsaye
  const handlePaystackUpgrade = async (targetTier) => {
    try {
      setSubmitting(targetTier);
      setMessage("");

      const res = await api.post("/tiers/paystack/initialize", { targetTier });
      const authUrl = res.data?.authorizationUrl;

      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error("Unable to get Paystack authorization link.");
      }
    } catch (err) {
      setMessageType("error");
      setMessage(err.response?.data?.message || "Failed to initialize payment.");
      setSubmitting("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            Direct Paystack Subscription
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold mt-4">
            Upgrade Your API Account
          </h1>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto text-sm sm:text-base">
            Pay directly via Paystack (Debit Card, Transfer, USSD) to activate wholesale rates for Data, NIN Validation, and Slip services.
          </p>
        </div>

        {(message || verifying) && (
          <div
            className={`mb-8 flex items-center gap-3 rounded-2xl border p-4 max-w-2xl mx-auto ${
              messageType === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-300"
                : messageType === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-blue-500/30 bg-blue-500/10 text-blue-300"
            }`}
          >
            {verifying ? (
              <LoaderCircle size={18} className="animate-spin text-blue-400" />
            ) : messageType === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span className="text-sm">{message}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20 text-slate-400 gap-3">
            <LoaderCircle className="animate-spin text-blue-500" />
            Loading tier packages...
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {plans.map((p) => {
              const isCurrent = p.tier === currentTier;
              const isPremium = p.tier === "PREMIUM";

              return (
                <div
                  key={p.tier}
                  className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between border relative transition-all ${
                    isPremium
                      ? "border-blue-500 bg-gradient-to-b from-blue-950/40 to-slate-900/60 shadow-2xl shadow-blue-900/20"
                      : "border-slate-800 bg-slate-900/50"
                  }`}
                >
                  {isPremium && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Crown size={12} /> Best Value
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">{p.name}</h3>
                      {p.tier === "REGULAR" && <ShieldCheck className="text-slate-400" />}
                      {p.tier === "STANDARD" && <Zap className="text-blue-400" />}
                      {p.tier === "PREMIUM" && <Crown className="text-amber-400" />}
                    </div>

                    <div className="mt-6 mb-6">
                      <span className="text-4xl font-extrabold">
                        {p.fee === 0 ? "Free" : `₦${p.fee.toLocaleString()}`}
                      </span>
                      {p.fee > 0 && (
                        <span className="text-xs text-slate-400 ml-2">
                          / One-time fee
                        </span>
                      )}
                    </div>

                    <ul className="space-y-3 pt-4 border-t border-slate-800 text-sm text-slate-300">
                      {p.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check size={16} className="text-blue-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-3.5 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-400 font-semibold text-xs uppercase tracking-wider cursor-default"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePaystackUpgrade(p.tier)}
                        disabled={Boolean(submitting) || verifying}
                        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                      >
                        {submitting === p.tier ? (
                          <>
                            <LoaderCircle size={15} className="animate-spin" />
                            Connecting Paystack...
                          </>
                        ) : (
                          <>
                            <CreditCard size={15} />
                            Pay with Paystack
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}