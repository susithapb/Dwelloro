import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/api";
import { Brand } from "../components/Common";
import { toast } from "sonner";
import { ArrowLeft } from "@phosphor-icons/react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      // Always show success — don't leak whether email exists
      setSent(true);
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
            Reset your <span className="text-[#004B87]">password</span>.
          </h1>
          <p className="text-slate-600 mt-4">
            Enter your email address and we'll send you a link to choose a new password.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8"><Brand /></div>

          {sent ? (
            <div data-testid="forgot-password-success">
              <div className="label-eyebrow text-emerald-600">Email sent</div>
              <h2 className="font-display text-3xl font-bold mt-2">Check your inbox</h2>
              <p className="text-slate-600 mt-4">
                If <span className="font-mono font-semibold">{email}</span> is registered, you'll receive a reset link within a few minutes. Check your spam folder if it doesn't arrive.
              </p>
              <Link
                to="/login"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#004B87] hover:underline"
              >
                <ArrowLeft size={14} weight="bold" /> Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} data-testid="forgot-password-form">
              <div className="label-eyebrow">Password reset</div>
              <h2 className="font-display text-3xl font-bold mt-2">Forgot your password?</h2>

              <div className="mt-8 space-y-5">
                <div>
                  <label className="label-eyebrow block mb-2">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="forgot-password-email"
                    className="w-full border border-slate-300 bg-white px-4 py-3 focus:ring-2 focus:ring-[#004B87] focus:border-transparent outline-none"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="forgot-password-submit"
                  className="w-full bg-[#004B87] hover:bg-[#003A69] disabled:opacity-60 text-white py-3 font-semibold transition-colors"
                >
                  {submitting ? "Sending…" : "Send reset link"}
                </button>
                <div className="text-sm text-slate-500 text-center">
                  <Link to="/login" className="text-[#004B87] font-semibold hover:underline inline-flex items-center gap-1">
                    <ArrowLeft size={12} weight="bold" /> Back to sign in
                  </Link>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
