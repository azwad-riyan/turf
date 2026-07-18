"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, User, Phone, Lock, ArrowRight } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    business_name: "",
    password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form & { general: string }>>({});

  const validate = () => {
    const errs: Partial<typeof form & { general: string }> = {};
    if (!form.name) errs.name = "Name is required";
    if (!form.phone) errs.phone = "Phone is required";
    if (!form.business_name) errs.business_name = "Business name is required";
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
    if (form.password !== form.confirm_password) errs.confirm_password = "Passwords don't match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authApi.ownerRegister({
        phone: form.phone,
        password: form.password,
        name: form.name,
        business_name: form.business_name,
      });
      await login(res.data.access, res.data.refresh);
      toast.success("Account created! Welcome to TurfBook.");
      router.push("/dashboard");
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(apiErr.response?.data?.error?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-hero-gradient">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="font-display text-2xl font-bold text-white">TurfBook</span>
          </Link>
        </div>

        <div className="card p-6 space-y-4">
          <div>
            <h1 className="font-display text-xl font-bold text-white">List Your Turf</h1>
            <p className="text-secondary-400 text-sm mt-1">Create your owner account to get started.</p>
          </div>

          <div>
            <label className="label"><User className="inline w-3.5 h-3.5 mr-1" />Your Name</label>
            <input className={`input ${errors.name ? "border-red-500" : ""}`} placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="label"><Building2 className="inline w-3.5 h-3.5 mr-1" />Business/Turf Name</label>
            <input className={`input ${errors.business_name ? "border-red-500" : ""}`} placeholder="e.g. Green Arena FC" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
            {errors.business_name && <p className="text-red-400 text-xs mt-1">{errors.business_name}</p>}
          </div>

          <div>
            <label className="label"><Phone className="inline w-3.5 h-3.5 mr-1" />Phone Number</label>
            <input className={`input ${errors.phone ? "border-red-500" : ""}`} type="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="label"><Lock className="inline w-3.5 h-3.5 mr-1" />Password</label>
            <input className={`input ${errors.password ? "border-red-500" : ""}`} type="password" placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="label">Confirm Password</label>
            <input className={`input ${errors.confirm_password ? "border-red-500" : ""}`} type="password" placeholder="Repeat password" value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} />
            {errors.confirm_password && <p className="text-red-400 text-xs mt-1">{errors.confirm_password}</p>}
          </div>

          <button onClick={handleRegister} disabled={loading} className="btn-primary w-full btn-lg">
            {loading ? "Creating account..." : <>Create Account <ArrowRight className="w-4 h-4" /></>}
          </button>

          <p className="text-xs text-center text-secondary-500">
            Already have an account?{" "}
            <Link href="/auth/login?role=owner" className="text-primary-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
