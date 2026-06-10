import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/api";
import { Brand } from "../components/Common";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { label: "Property Manager", email: "manager@dwelloro.demo" },
  { label: "Tenant", email: "tenant@dwelloro.demo" },
  { label: "Contractor", email: "contractor@dwelloro.demo" },
  { label: "Landlord", email: "landlord@dwelloro.demo" },
  { label: "Inspector", email: "inspector@dwelloro.demo" },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  const [email, setEmail] = useState(isDemo ? "manager@dwelloro.demo" : "");
  const [password, setPassword] = useState(isDemo ? "Demo!123" : "");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <div className="hidden md:flex md:w-1/2 bp-grid items-center justify-center p-12 border-r border-slate-200">
        <div className="max-w-md">
          <Brand />
          <h1 className="font-display text-4xl font-bold tracking-tight mt-6 leading-tight">
            {isDemo ? <>Explore <span className="text-[#004B87]">Dwelloro</span> live.</> : <>Sign in to your <span className="text-[#004B87]">control room</span>.</>}
          </h1>
          <p className="text-slate-600 mt-4">
            {isDemo ? "Try any demo account below — all data is pre-loaded for you to explore." : "Pick up tickets, file evidence, and watch your Healthy Homes file build itself."}
          </p>
          {isDemo && (
            <div className="mt-10 bg-white border border-slate-200 p-5">
              <div className="label-eyebrow mb-3">Demo accounts · password: Demo!123</div>
              <div className="space-y-1.5">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => { setEmail(a.email); setPassword("Demo!123"); }}
                    className={`w-full text-left px-3 py-2 text-sm border transition-colors ${email === a.email ? "border-[#004B87] bg-[#004B87]/5 text-[#004B87] font-semibold" : "border-slate-200 hover:border-[#004B87] text-slate-700"}`}
                  >
                    <span className="font-semibold">{a.label}</span>
                    <span className="ml-2 font-mono text-xs text-slate-500">{a.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-md" data-testid="login-form">
          <div className="md:hidden mb-8"><Brand /></div>
          <div className="label-eyebrow">Sign in</div>
          <h2 className="font-display text-3xl font-bold mt-2">Welcome back</h2>

          <div className="mt-8 space-y-5">
            <div>
              <label className="label-eyebrow block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                className="w-full border border-slate-300 bg-white px-4 py-3 focus:ring-2 focus:ring-[#004B87] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="label-eyebrow block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                className="w-full border border-slate-300 bg-white px-4 py-3 focus:ring-2 focus:ring-[#004B87] focus:border-transparent outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              data-testid="login-submit-btn"
              className="w-full bg-[#004B87] hover:bg-[#003A69] disabled:opacity-60 text-white py-3 font-semibold transition-colors"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
            <div className="text-sm text-slate-500 text-center">
              <Link to="/forgot-password" data-testid="login-forgot-link" className="text-slate-500 hover:text-[#004B87] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="text-sm text-slate-500 text-center">
              No account?{" "}
              <Link to="/register" data-testid="login-to-register-link" className="text-[#004B87] font-semibold hover:underline">
                Create one
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
