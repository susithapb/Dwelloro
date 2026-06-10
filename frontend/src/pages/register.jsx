import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/api";
import { Brand } from "../components/Common";
import { toast } from "sonner";

const ROLES = [
  { value: "property_manager", label: "Property Manager" },
  { value: "tenant", label: "Tenant" },
  { value: "contractor", label: "Contractor" },
  { value: "inspector", label: "Inspector" },
  { value: "landlord", label: "Landlord" },
];

const TRADES = [
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "builder", label: "Builder / Carpenter" },
  { value: "painter", label: "Painter / Decorator" },
  { value: "hvac", label: "HVAC / Heating" },
  { value: "locksmith", label: "Locksmith" },
  { value: "roofer", label: "Roofer" },
  { value: "general_maintenance", label: "General Maintenance" },
  { value: "other", label: "Other" },
];

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "property_manager",
    phone: "",
    trade: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(form);
      toast.success("Workspace created");
      nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8" data-testid="register-form">
        <Brand />
        <h2 className="font-display text-3xl font-bold mt-6">Create your workspace</h2>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label-eyebrow block mb-2">Full name</label>
            <input
              required
              value={form.full_name}
              onChange={onChange("full_name")}
              data-testid="register-name-input"
              className="w-full border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#004B87]"
            />
          </div>
          <div>
            <label className="label-eyebrow block mb-2">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={onChange("email")}
              data-testid="register-email-input"
              className="w-full border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#004B87]"
            />
          </div>
          <div>
            <label className="label-eyebrow block mb-2">Password</label>
            <input
              required
              type="password"
              value={form.password}
              onChange={onChange("password")}
              data-testid="register-password-input"
              className="w-full border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#004B87]"
              minLength={8}
            />
          </div>
          <div>
            <label className="label-eyebrow block mb-2">Role</label>
            <select
              value={form.role}
              onChange={onChange("role")}
              data-testid="register-role-select"
              className="w-full border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#004B87] bg-white"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {form.role === "contractor" && (
            <div>
              <label className="label-eyebrow block mb-2">Trade / Speciality <span className="text-[#FF5722]">*</span></label>
              <select
                required
                value={form.trade}
                onChange={onChange("trade")}
                data-testid="register-trade-select"
                className="w-full border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#004B87] bg-white"
              >
                <option value="">Select a trade…</option>
                {TRADES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            data-testid="register-submit-btn"
            className="w-full bg-[#FF5722] hover:bg-[#E64A19] disabled:opacity-60 text-white py-3 font-semibold transition-colors"
          >
            {submitting ? "Creating…" : "Create workspace"}
          </button>
          <div className="text-sm text-slate-500 text-center">
            Already on Dwelloro?{" "}
            <Link to="/login" data-testid="register-to-login-link" className="text-[#004B87] font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
