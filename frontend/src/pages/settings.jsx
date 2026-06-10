import React, { useState, useEffect } from "react";
import AppShell from "../components/AppShell";
import { apiClient, useAuth } from "../lib/api";
import { Eyebrow } from "../components/Common";
import { User, Lock, ArrowRight, Wrench } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const ROLE_LABELS = {
  property_manager: "Property Manager",
  tenant: "Tenant",
  contractor: "Contractor",
  landlord: "Landlord",
  inspector: "Inspector",
  admin: "Dwelloro Staff",
};

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

export default function Settings() {
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState({ full_name: "", email: "", phone: "", trade: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        trade: user.trade || "",
      });
    }
  }, [user]);

  const onSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = { full_name: profile.full_name, email: profile.email, phone: profile.phone };
      if (user?.role === "contractor" && profile.trade) payload.trade = profile.trade;
      const { data } = await apiClient.patch("/auth/me", payload);
      updateUser(data);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwords.new_password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      await apiClient.post("/auth/change-password", {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      toast.success("Password updated");
      setPasswords({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <Eyebrow>Account</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2 mb-8">
          Settings
        </h1>

        {/* Profile */}
        <section className="bg-white border border-slate-200 mb-6">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <User size={18} weight="bold" className="text-[#004B87]" />
            <h2 className="font-display font-bold text-lg">Profile</h2>
          </div>
          <form onSubmit={onSaveProfile} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label-eyebrow block mb-2">Full name</label>
                <input
                  required
                  value={profile.full_name}
                  onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                  data-testid="settings-name-input"
                  className="w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#004B87]"
                />
              </div>
              <div>
                <label className="label-eyebrow block mb-2">Email</label>
                <input
                  required
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  data-testid="settings-email-input"
                  className="w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#004B87]"
                />
              </div>
              <div>
                <label className="label-eyebrow block mb-2">Phone</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  data-testid="settings-phone-input"
                  placeholder="+64 21 000 0000"
                  className="w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#004B87]"
                />
              </div>
              <div>
                <label className="label-eyebrow block mb-2">Role</label>
                <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  {ROLE_LABELS[user?.role] || user?.role}
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-400">(cannot be changed)</span>
                </div>
              </div>
              {user?.role === "contractor" && (
                <div>
                  <label className="label-eyebrow block mb-2">Trade / Speciality</label>
                  <select
                    value={profile.trade}
                    onChange={(e) => setProfile((p) => ({ ...p, trade: e.target.value }))}
                    data-testid="settings-trade-select"
                    className="w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#004B87] bg-white"
                  >
                    <option value="">Select a trade…</option>
                    {TRADES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                data-testid="settings-save-profile"
                className="px-6 py-2.5 bg-[#004B87] hover:bg-[#003A69] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
            </div>
          </form>
        </section>

        {/* Password */}
        <section className="bg-white border border-slate-200 mb-6">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <Lock size={18} weight="bold" className="text-[#004B87]" />
            <h2 className="font-display font-bold text-lg">Password</h2>
          </div>
          <form onSubmit={onChangePassword} className="p-6 space-y-5">
            <div>
              <label className="label-eyebrow block mb-2">Current password</label>
              <input
                required
                type="password"
                value={passwords.current_password}
                onChange={(e) => setPasswords((p) => ({ ...p, current_password: e.target.value }))}
                data-testid="settings-current-password"
                className="w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#004B87] max-w-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label-eyebrow block mb-2">New password</label>
                <input
                  required
                  type="password"
                  value={passwords.new_password}
                  onChange={(e) => setPasswords((p) => ({ ...p, new_password: e.target.value }))}
                  data-testid="settings-new-password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  className="w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#004B87]"
                />
              </div>
              <div>
                <label className="label-eyebrow block mb-2">Confirm new password</label>
                <input
                  required
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                  data-testid="settings-confirm-password"
                  placeholder="Repeat new password"
                  minLength={8}
                  className="w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#004B87]"
                />
                {passwords.confirm && passwords.new_password !== passwords.confirm && (
                  <p className="text-red-600 text-xs mt-1">Passwords do not match</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
              <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-[#004B87] hover:underline">
                Forgot your current password?
              </Link>
              <button
                type="submit"
                disabled={savingPassword || passwords.new_password !== passwords.confirm}
                data-testid="settings-save-password"
                className="px-6 py-2.5 bg-[#004B87] hover:bg-[#003A69] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {savingPassword ? "Saving…" : "Update password"}
              </button>
            </div>
          </form>
        </section>

        {/* Plan shortcut — property owners only (PM + self-managing landlord) */}
        {(user?.role === "property_manager" || user?.role === "landlord") && (
          <section className="bg-white border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-display font-bold text-lg">Plan & billing</h2>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div>
                <div className="label-eyebrow">Current plan</div>
                <div className="font-display font-bold text-xl mt-1 capitalize">{user?.plan_tier || "free"}</div>
              </div>
              <Link
                to="/billing"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#004B87] text-[#004B87] text-sm font-semibold hover:bg-[#004B87] hover:text-white transition-colors"
              >
                Manage billing <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
