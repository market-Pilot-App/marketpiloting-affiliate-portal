"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function AffiliatePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", password: "", ref_code: "",
    bank_name: "", account_number: "", account_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      const endpoint = mode === "login" ? "/affiliate/login" : "/affiliate/register";
      const body = mode === "login"
        ? { email: form.email.trim().toLowerCase(), password: form.password }
        : { ...form, email: form.email.trim().toLowerCase(), ref_code: form.ref_code.trim().toUpperCase() };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");

      if (mode === "login") {
        localStorage.setItem("mp_affiliate_token", data.access_token);
        localStorage.setItem("mp_affiliate_name", data.name);
        localStorage.setItem("mp_affiliate_ref", data.ref_code);
        router.push("/dashboard");
      } else {
        setPendingEmail(form.email.trim().toLowerCase());
        setStep("otp");
        setSuccess("Check your email for a 6-digit verification code.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/affiliate/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Verification failed");
      localStorage.setItem("mp_affiliate_token", data.access_token);
      localStorage.setItem("mp_affiliate_name", data.name);
      localStorage.setItem("mp_affiliate_ref", data.ref_code);
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/affiliate/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setSuccess(data.message);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-indigo-500 text-base";

  if (step === "otp") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">📧</div>
            <h1 className="text-2xl font-bold text-white">Check your email</h1>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed">
              We sent a 6-digit code to<br />
              <span className="text-indigo-400 font-medium">{pendingEmail}</span>
            </p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
            {success && <p className="text-green-400 text-sm bg-green-950 px-4 py-3 rounded-xl">{success}</p>}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Verification Code</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-4 border border-gray-700 focus:outline-none focus:border-indigo-500 text-3xl tracking-widest text-center font-mono"
              />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-950/50 px-3 py-2 rounded-lg">{error}</p>}
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-base"
            >
              {loading ? "Verifying…" : "Verify & Activate →"}
            </button>
            <button
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full py-3 text-sm text-gray-500 hover:text-gray-300 active:text-gray-200 transition"
            >
              Didn&apos;t receive it? Resend code
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">MarketPilot Affiliates</h1>
          <p className="text-gray-400 mt-1 text-sm">Earn 10% commission on every referral</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <div className="flex gap-2">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${mode === m ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400"}`}
              >
                {m === "login" ? "Sign In" : "Join"}
              </button>
            ))}
          </div>

          {success && <p className="text-green-400 text-sm bg-green-950 px-4 py-3 rounded-xl">{success}</p>}

          {mode === "register" && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="John Doe" className={inputCls} />
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email</label>
            <input type="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Password</label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min 8 characters" className={inputCls} />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Your Ref Code</label>
                <input
                  value={form.ref_code}
                  onChange={(e) => set("ref_code", e.target.value.toUpperCase())}
                  placeholder="e.g. JOHN20"
                  className={`${inputCls} uppercase tracking-wider`}
                />
                <p className="text-xs text-gray-600 mt-1">This becomes your promo link</p>
              </div>
              <div className="border-t border-gray-800 pt-3">
                <p className="text-xs text-gray-500 mb-3">Bank details — optional now, required before payout</p>
                {[
                  { key: "bank_name", label: "Bank Name", placeholder: "e.g. GTBank" },
                  { key: "account_number", label: "Account Number", placeholder: "0123456789", inputMode: "numeric" as const },
                  { key: "account_name", label: "Account Name", placeholder: "John Doe" },
                ].map(({ key, label, placeholder, inputMode }) => (
                  <div key={key} className="mb-3">
                    <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
                    <input
                      value={(form as Record<string, string>)[key]}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder={placeholder}
                      inputMode={inputMode}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <p className="text-red-400 text-sm bg-red-950/50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !form.email || !form.password || (mode === "register" && (!form.name || !form.ref_code))}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-base"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </div>
      </div>
    </div>
  );
}
