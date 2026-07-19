"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, KeyRound, ArrowRight, Building2, Lock } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import Link from "next/link";

type Mode = "player" | "owner";

export default function LoginPage() {
  const router = useRouter();
  const { login, ownerLogin } = useAuth();
  const [mode, setMode] = useState<Mode>("player");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handlePlayerAuth = async () => {
    if (!email || !password) { toast.error("Fill in all fields"); return; }
    setLoading(true);
    try {
      if (isSignUp) {
        const res = await fetch("/api/v1/auth/player/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create account");
        
        toast.success("Account created! You can now log in.");
        setIsSignUp(false);
      } else {
        const { error } = await login(email, password);
        if (error) throw new Error(error);
        toast.success("Welcome back!");
        router.push("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerLogin = async () => {
    if (!email || !password) { toast.error("Fill in all fields"); return; }
    setLoading(true);
    try {
      const { error } = await ownerLogin(email, password);
      if (error) throw new Error(error);
      toast.success("Welcome back, owner!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
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
          {([["player", "Player Login"], ["owner", "Owner Login"]] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setIsSignUp(false); // Reset sign up state when switching tabs
                setEmail("");
                setPassword("");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m ? "bg-primary-600 text-white" : "text-secondary-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {mode === "player" ? (
            <motion.div key="player" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
              <div>
                <h1 className="font-display text-xl font-bold text-white">{isSignUp ? "Sign Up as Player" : "Sign in as Player"}</h1>
                <p className="text-secondary-400 text-sm mt-1">{isSignUp ? "Create an account to book turfs." : "Welcome back!"}</p>
              </div>

              <div>
                <label className="label"><Mail className="inline w-3.5 h-3.5 mr-1" />Email</label>
                <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="label"><Lock className="inline w-3.5 h-3.5 mr-1" />Password</label>
                <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePlayerAuth()} />
              </div>
              
              <button onClick={handlePlayerAuth} disabled={loading} className="btn-primary w-full">
                {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
              </button>
              
              <p className="text-xs text-center text-secondary-500">
                {isSignUp ? "Already have an account?" : "No account yet?"}{" "}
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary-400 hover:underline">
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </motion.div>
          ) : (
            <motion.div key="owner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
              <div>
                <h1 className="font-display text-xl font-bold text-white">Owner Login</h1>
                <p className="text-secondary-400 text-sm mt-1">Access your turf management dashboard.</p>
              </div>
              <div>
                <label className="label"><Mail className="inline w-3.5 h-3.5 mr-1" />Email</label>
                <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
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
