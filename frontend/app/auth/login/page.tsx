"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, KeyRound, ArrowRight, Building2, Lock } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import Link from "next/link";

type Mode = "otp" | "owner";
type OtpStep = "phone" | "code";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("otp");
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleOtpRequest = async () => {
    if (!phone) { toast.error("Enter your phone number"); return; }
    setLoading(true);
    try {
      await authApi.requestOTP(phone);
      toast.success("OTP sent! Check your phone.");
      setOtpStep("code");
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(apiErr.response?.data?.error?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (!otpCode) { toast.error("Enter the OTP code"); return; }
    setLoading(true);
    try {
      const res = await authApi.verifyOTP(phone, otpCode);
      await login(res.data.tokens.access, res.data.tokens.refresh);
      toast.success("Welcome back!");
      router.push("/");
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(apiErr.response?.data?.error?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerLogin = async () => {
    if (!ownerPhone || !password) { toast.error("Fill in all fields"); return; }
    setLoading(true);
    try {
      const res = await authApi.ownerLogin(ownerPhone, password);
      await login(res.data.access, res.data.refresh);
      toast.success("Welcome back, owner!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(apiErr.response?.data?.error?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-hero-gradient">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="font-display text-2xl font-bold text-white">TurfBook</span>
          </Link>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-secondary-800 rounded-xl mb-6">
          {([["otp", "Player Login"], ["owner", "Owner Login"]] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m ? "bg-primary-600 text-white" : "text-secondary-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {mode === "otp" ? (
            <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
              <div>
                <h1 className="font-display text-xl font-bold text-white">Sign in as Player</h1>
                <p className="text-secondary-400 text-sm mt-1">We&apos;ll send an OTP to your phone number.</p>
              </div>

              {otpStep === "phone" && (
                <>
                  <div>
                    <label className="label"><Phone className="inline w-3.5 h-3.5 mr-1" />Phone Number</label>
                    <input className="input" type="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleOtpRequest()} />
                  </div>
                  <button onClick={handleOtpRequest} disabled={loading} className="btn-primary w-full">
                    {loading ? "Sending..." : <>Send OTP <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </>
              )}

              {otpStep === "code" && (
                <>
                  <div>
                    <label className="label"><KeyRound className="inline w-3.5 h-3.5 mr-1" />Enter OTP</label>
                    <input className="input text-center text-2xl tracking-widest" type="text" maxLength={6} placeholder="------" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && handleOtpVerify()} />
                    <p className="text-xs text-secondary-500 mt-1.5">Sent to {phone} <button onClick={() => setOtpStep("phone")} className="text-primary-400 hover:underline ml-1">Change</button></p>
                  </div>
                  <button onClick={handleOtpVerify} disabled={loading} className="btn-primary w-full">
                    {loading ? "Verifying..." : "Verify & Sign In ✓"}
                  </button>
                  <button onClick={handleOtpRequest} disabled={loading} className="btn-ghost w-full text-sm">
                    Resend OTP
                  </button>
                </>
              )}

              <p className="text-xs text-secondary-500 text-center">No account needed — we create one automatically.</p>
            </motion.div>
          ) : (
            <motion.div key="owner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
              <div>
                <h1 className="font-display text-xl font-bold text-white">Owner Login</h1>
                <p className="text-secondary-400 text-sm mt-1">Access your turf management dashboard.</p>
              </div>
              <div>
                <label className="label"><Building2 className="inline w-3.5 h-3.5 mr-1" />Phone Number</label>
                <input className="input" type="tel" placeholder="01XXXXXXXXX" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
              </div>
              <div>
                <label className="label"><Lock className="inline w-3.5 h-3.5 mr-1" />Password</label>
                <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleOwnerLogin()} />
              </div>
              <button onClick={handleOwnerLogin} disabled={loading} className="btn-primary w-full">
                {loading ? "Signing in..." : "Sign In to Dashboard"}
              </button>
              <p className="text-xs text-center text-secondary-500">
                Not an owner yet?{" "}
                <Link href="/auth/register" className="text-primary-400 hover:underline">List your turf</Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
