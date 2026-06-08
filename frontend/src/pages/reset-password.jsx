import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../lib/api";
import { Brand } from "../components/Common";
import { toast } from "sonner";
import { ArrowLeft } from "@phosphor-icons/react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const nav = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", { token, password });
      toast.success("Password updated — please sign in");
      nav("/login");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Reset failed. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="label-eyebrow text-red-500">Invalid link</div>
          <h2 className="font-display text-2xl font-bold mt-2">Missing reset token</h2>
          <p className="text-slate-600 mt-3 text-sm">This link is incomplete. Please request a new password reset.</p>
          <Link to="/forgot-password" className="mt-6 inline-block text-[#004B87] font-semibold hover:underline">
            Request new link →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <div className="hidden md:flex md:w-1/2 bp-grid items-center justify-center p-12 border-r border-slate-200">
        <div className="max-w-md">
          <Brand />
          <h1 className="font-display text-4xl font-bold tracking-tight mt-6 leading-tight">
            Choose a new <span className="text-[#004B87]">password</span>.
          </h1>
          <p className="text-slate-600 mt-4">
            Pick something strong. You'll use it every time you sign in.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-md" data-testid="reset-password-form">
          <div className="md:hidden mb-8"><Brand /></div>
          <div className="label-eyebrow">New password</div>
          <h2 className="font-display text-3xl font-bold mt-2">Reset your password</h2>

          <div className="mt-8 space-y-5">
            <div>
              <label className="label-eyebrow block mb-2">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="reset-password-input"
                className="w-full border border-slate-300 bg-white px-4 py-3 focus:ring-2 focus:ring-[#004B87] focus:border-transparent outline-none"
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="label-eyebrow block mb-2">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                data-testid="reset-password-confirm"
                className="w-full border border-slate-300 bg-white px-4 py-3 focus:ring-2 focus:ring-[#004B87] focus:border-transparent outline-none"
                placeholder="Repeat your new password"
                minLength={8}
                required
              />
              {confirm && password !== confirm && (
                <p className="text-red-600 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting || password !== confirm}
              data-testid="reset-password-submit"
              className="w-full bg-[#004B87] hover:bg-[#003A69] disabled:opacity-60 text-white py-3 font-semibold transition-colors"
            >
              {submitting ? "Saving…" : "Set new password"}
            </button>
            <div className="text-sm text-slate-500 text-center">
              <Link to="/login" className="text-[#004B87] font-semibold hover:underline inline-flex items-center gap-1">
                <ArrowLeft size={12} weight="bold" /> Back to sign in
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
