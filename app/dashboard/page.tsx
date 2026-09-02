"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface AffiliateMe {
  id: number; name: string; email: string; ref_code: string; ref_link: string;
  bank_name: string | null; account_number: string | null; account_name: string | null;
  status: string; total_referrals: number;
  pending_earnings_ngn: number; approved_earnings_ngn: number; total_paid_ngn: number;
  can_request_payout: boolean; min_payout_ngn: number;
  processing_fee_flat_ngn: number; processing_fee_pct: number;
  payout_fee_ngn: number; payout_net_ngn: number;
}

interface Earning {
  id: number; plan: string; billing: string;
  client_paid_ngn: number; commission_ngn: number; status: string; created_at: string | null;
}

interface Payout {
  id: number; amount_ngn: number; status: string;
  requested_at: string | null; paid_at: string | null; admin_note: string | null;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("mp_affiliate_token") || "" : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "paid" ? "bg-green-900 text-green-400"
    : status === "approved" ? "bg-blue-900 text-blue-400"
    : status === "active" ? "bg-green-900 text-green-400"
    : status === "pending" ? "bg-yellow-900 text-yellow-400"
    : "bg-red-900 text-red-400";
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${cls}`}>{status}</span>;
}

export default function AffiliateDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<AffiliateMe | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [tab, setTab] = useState<"overview" | "earnings" | "payouts" | "bank">("overview");
  const [loading, setLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: "", account_number: "", account_name: "" });
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMsg, setBankMsg] = useState("");

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("mp_affiliate_token");
    if (!token) { router.push("/"); return; }
    try {
      const res = await fetch(`${API_URL}/affiliate/me`, { headers: authHeaders() });
      if (res.status === 401 || res.status === 403) { router.push("/"); return; }
      const data: AffiliateMe = await res.json();
      setMe(data);
      setBankForm({ bank_name: data.bank_name || "", account_number: data.account_number || "", account_name: data.account_name || "" });
    } catch { router.push("/"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  useEffect(() => {
    if (tab === "earnings") {
      fetch(`${API_URL}/affiliate/earnings`, { headers: authHeaders() }).then((r) => r.json()).then(setEarnings).catch(() => {});
    }
    if (tab === "payouts") {
      fetch(`${API_URL}/affiliate/payouts`, { headers: authHeaders() }).then((r) => r.json()).then(setPayouts).catch(() => {});
    }
  }, [tab]);

  const copyLink = () => {
    if (!me) return;
    navigator.clipboard.writeText(me.ref_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const requestPayout = async () => {
    setPayoutLoading(true); setPayoutMsg("");
    try {
      const res = await fetch(`${API_URL}/affiliate/payout-request`, { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setPayoutMsg(`✅ ${data.message}`);
      fetchMe();
    } catch (e: unknown) {
      setPayoutMsg(`❌ ${e instanceof Error ? e.message : "Failed"}`);
    } finally { setPayoutLoading(false); }
  };

  const saveBank = async () => {
    setBankSaving(true); setBankMsg("");
    try {
      const res = await fetch(`${API_URL}/affiliate/bank`, {
        method: "PATCH", headers: authHeaders(), body: JSON.stringify(bankForm),
      });
      if (!res.ok) throw new Error("Failed to save");
      setBankMsg("✅ Bank details saved");
      fetchMe();
    } catch (e: unknown) {
      setBankMsg(`❌ ${e instanceof Error ? e.message : "Failed"}`);
    } finally { setBankSaving(false); }
  };

  const logout = () => {
    localStorage.removeItem("mp_affiliate_token");
    localStorage.removeItem("mp_affiliate_name");
    localStorage.removeItem("mp_affiliate_ref");
    router.push("/");
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  );
  if (!me) return null;

  const inputCls = "w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-indigo-500 text-base";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base sm:text-lg font-bold">MarketPilot Affiliates</h1>
          <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
            Hi {me.name} · <StatusBadge status={me.status} />
          </p>
        </div>
        <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300 active:text-white transition px-3 py-2 rounded-lg bg-gray-900">
          Sign out
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Ref link card */}
        <div className="bg-indigo-950 border border-indigo-800 rounded-2xl p-4 sm:p-6">
          <p className="text-xs text-indigo-300 mb-2">Your referral link</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 text-indigo-200 text-xs sm:text-sm bg-indigo-900 px-3 py-2.5 rounded-xl truncate">
              {me.ref_link}
            </code>
            <button
              onClick={copyLink}
              className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm px-5 py-2.5 rounded-xl transition font-medium whitespace-nowrap"
            >
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
          </div>
          <p className="text-xs text-indigo-400 mt-2">Share this link — anyone who signs up gets 5% off, you earn 10% commission on their first payment.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Referrals", value: me.total_referrals, color: "text-white" },
            { label: "Pending Earnings", value: `₦${me.pending_earnings_ngn.toLocaleString()}`, color: "text-yellow-400" },
            { label: "Approved", value: `₦${me.approved_earnings_ngn.toLocaleString()}`, color: "text-blue-400" },
            { label: "Total Paid Out", value: `₦${me.total_paid_ngn.toLocaleString()}`, color: "text-green-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4">
              <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Payout request */}
        {me.status === "active" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Request Payout</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Minimum ₦{me.min_payout_ngn.toLocaleString()} · Paid to your bank account
                </p>
                {me.can_request_payout && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                    <span className="text-xs text-gray-400">Gross: <span className="text-white font-medium">₦{me.pending_earnings_ngn.toLocaleString()}</span></span>
                    <span className="text-xs text-gray-400">Fee: <span className="text-red-400">−₦{me.payout_fee_ngn.toLocaleString()}</span></span>
                    <span className="text-xs text-gray-400">You get: <span className="text-green-400 font-semibold">₦{me.payout_net_ngn.toLocaleString()}</span></span>
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-1">Processing fee: ₦150 + 2% to cover transfer charges</p>
              </div>
              <button
                onClick={requestPayout}
                disabled={!me.can_request_payout || payoutLoading}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-3 rounded-xl transition whitespace-nowrap"
              >
                {payoutLoading ? "Requesting…" : me.can_request_payout ? "Request Payout" : `Need ₦${me.min_payout_ngn.toLocaleString()} min`}
              </button>
            </div>
            {payoutMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg ${payoutMsg.startsWith("✅") ? "text-green-400 bg-green-950/50" : "text-red-400 bg-red-950/50"}`}>
                {payoutMsg}
              </p>
            )}
          </div>
        )}

        {/* Tabs — scrollable on mobile */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="flex gap-1 border-b border-gray-800 min-w-max sm:min-w-0">
            {(["overview", "earnings", "payouts", "bank"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors whitespace-nowrap ${tab === t ? "border-indigo-500 text-indigo-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
                {t === "bank" ? "Bank Details" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 space-y-3 text-sm">
            <p className="font-semibold text-gray-200">How it works</p>
            <div className="space-y-3 text-gray-400">
              {[
                { n: "1", text: <>Share your link and anyone who signs up gets <strong className="text-white">5% off</strong> their plan</> },
                { n: "2", text: <>When their first payment clears, you earn <strong className="text-green-400">10% commission</strong> (first payment only)</> },
                { n: "3", text: <>Once you hit ₦{me.min_payout_ngn.toLocaleString()}, request a payout → we transfer to your bank</> },
                { n: "4", text: <>Payouts processed within <strong className="text-white">3 business days</strong></> },
              ].map(({ n, text }) => (
                <div key={n} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-900 text-indigo-300 rounded-full flex items-center justify-center text-xs font-bold">{n}</span>
                  <p className="text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">Your ref code: <span className="font-mono text-gray-300 bg-gray-800 px-2 py-0.5 rounded">{me.ref_code}</span></p>
              <p className="text-xs text-gray-600 mt-1">Commission paid on confirmed, non-refunded subscriptions · <a href="https://www.marketpiloting.com/terms#affiliate" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Affiliate Terms</a></p>
            </div>
          </div>
        )}

        {/* Earnings — cards on mobile, table on desktop */}
        {tab === "earnings" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {earnings.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-gray-500 text-sm">No earnings yet.</p>
                <p className="text-gray-600 text-xs mt-1">Share your link to start earning!</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-gray-800">
                  {earnings.map((e) => (
                    <div key={e.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300 capitalize">{e.plan} · {e.billing}</span>
                        <StatusBadge status={e.status} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Client paid</span>
                        <span className="text-sm text-gray-400">₦{e.client_paid_ngn.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Your commission</span>
                        <span className="text-sm font-semibold text-green-400">₦{e.commission_ngn.toLocaleString()}</span>
                      </div>
                      {e.created_at && (
                        <p className="text-xs text-gray-600">{new Date(e.created_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <table className="hidden sm:table w-full text-sm">
                  <thead className="bg-gray-800 border-b border-gray-700">
                    <tr>
                      <th className="text-left px-5 py-3 text-gray-400 font-medium">Plan</th>
                      <th className="text-right px-5 py-3 text-gray-400 font-medium">Client Paid</th>
                      <th className="text-right px-5 py-3 text-gray-400 font-medium">Commission</th>
                      <th className="text-center px-5 py-3 text-gray-400 font-medium">Status</th>
                      <th className="text-right px-5 py-3 text-gray-400 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {earnings.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-800/50">
                        <td className="px-5 py-3 capitalize text-gray-300">{e.plan} · {e.billing}</td>
                        <td className="px-5 py-3 text-right text-gray-400">₦{e.client_paid_ngn.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right font-semibold text-green-400">₦{e.commission_ngn.toLocaleString()}</td>
                        <td className="px-5 py-3 text-center"><StatusBadge status={e.status} /></td>
                        <td className="px-5 py-3 text-right text-xs text-gray-500">{e.created_at ? new Date(e.created_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* Payouts — cards on mobile, table on desktop */}
        {tab === "payouts" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {payouts.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-gray-500 text-sm">No payout requests yet.</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-gray-800">
                  {payouts.map((p) => (
                    <div key={p.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-white">₦{p.amount_ngn.toLocaleString()}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Requested: {p.requested_at ? new Date(p.requested_at).toLocaleDateString() : "—"}</span>
                        {p.paid_at && <span>Paid: {new Date(p.paid_at).toLocaleDateString()}</span>}
                      </div>
                      {p.admin_note && <p className="text-xs text-gray-400 bg-gray-800 px-3 py-2 rounded-lg">{p.admin_note}</p>}
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <table className="hidden sm:table w-full text-sm">
                  <thead className="bg-gray-800 border-b border-gray-700">
                    <tr>
                      <th className="text-right px-5 py-3 text-gray-400 font-medium">Amount</th>
                      <th className="text-center px-5 py-3 text-gray-400 font-medium">Status</th>
                      <th className="text-right px-5 py-3 text-gray-400 font-medium">Requested</th>
                      <th className="text-right px-5 py-3 text-gray-400 font-medium">Paid</th>
                      <th className="text-left px-5 py-3 text-gray-400 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-800/50">
                        <td className="px-5 py-3 text-right font-semibold text-white">₦{p.amount_ngn.toLocaleString()}</td>
                        <td className="px-5 py-3 text-center"><StatusBadge status={p.status} /></td>
                        <td className="px-5 py-3 text-right text-xs text-gray-500">{p.requested_at ? new Date(p.requested_at).toLocaleDateString() : "—"}</td>
                        <td className="px-5 py-3 text-right text-xs text-gray-500">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                        <td className="px-5 py-3 text-xs text-gray-400">{p.admin_note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* Bank details */}
        {tab === "bank" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4">
            <p className="text-sm font-semibold text-gray-200">Bank Details for Payouts</p>
            {[
              { key: "bank_name", label: "Bank Name", placeholder: "e.g. GTBank" },
              { key: "account_number", label: "Account Number", placeholder: "0123456789", inputMode: "numeric" as const },
              { key: "account_name", label: "Account Name", placeholder: "John Doe" },
            ].map(({ key, label, placeholder, inputMode }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
                <input
                  value={(bankForm as Record<string, string>)[key]}
                  onChange={(e) => setBankForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  inputMode={inputMode}
                  className={inputCls}
                />
              </div>
            ))}
            {bankMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg ${bankMsg.startsWith("✅") ? "text-green-400 bg-green-950/50" : "text-red-400 bg-red-950/50"}`}>
                {bankMsg}
              </p>
            )}
            <button
              onClick={saveBank}
              disabled={bankSaving}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition"
            >
              {bankSaving ? "Saving…" : "Save Bank Details"}
            </button>
          </div>
        )}

        <div className="pb-2" />

        {/* Legal footer */}
        <div className="border-t border-gray-800 pt-4 pb-6">
          <p className="text-xs text-gray-600 leading-relaxed text-center">
            Commissions are paid on the first confirmed, non-refunded payment per referred client only. Earnings are not guaranteed.
            Programme terms may be updated with 14 days&apos; notice. You are responsible for any taxes on your earnings.
            MarketPilot&apos;s liability is limited to confirmed commissions shown on your dashboard.{" "}
            <a href="https://www.marketpiloting.com/terms#affiliate" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
              Full Affiliate Terms
            </a>
            {" "}·{" "}
            <a href="https://www.marketpiloting.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
