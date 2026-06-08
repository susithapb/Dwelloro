import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient, useAuth } from "../lib/api";
import { Check, ArrowRight, Sparkle, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Brand } from "../components/Common";

const TIERS = [
  {
    id: "free",
    name: "Free",
    tagline: "Get a feel for Dwelloro",
    nzd: 0,
    aud: 0,
    max_properties: 3,
    cta: "Start free",
    features: [
      "Up to 3 properties",
      "Ticket reporting + workflow",
      "Manual Healthy Homes evidence upload",
      "Photo evidence storage",
      "Email-only support",
    ],
    notIncluded: [
      "AI ticket triage",
      "Public share reports",
      "Portfolio trends",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For small landlords",
    nzd: 99,
    aud: 81,
    max_properties: 25,
    cta: "Start 14-day trial",
    features: [
      "Up to 25 properties",
      "Everything in Free",
      "AI ticket triage with vision",
      "Public Property Health Report share links",
      "Email notifications (Resend)",
      "Standard email support",
    ],
    notIncluded: ["AI inspection summaries", "Portfolio Trends dashboard"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For property managers",
    nzd: 249,
    aud: 204,
    max_properties: 100,
    cta: "Start 14-day trial",
    popular: true,
    features: [
      "Up to 100 properties",
      "Everything in Starter",
      "AI-generated inspection summaries",
      "Portfolio Trends dashboard",
      "Multi-user access (managers, landlords, inspectors)",
      "Compliance Audit PDF export",
      "SMS notifications",
      "Priority email support",
    ],
    notIncluded: [],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For agencies & portfolios",
    nzd: null,
    aud: null,
    max_properties: null,
    cta: "Contact sales",
    features: [
      "Unlimited properties",
      "Everything in Pro",
      "Custom branding / white-label",
      "SSO (SAML / Google Workspace)",
      "API access",
      "Custom SLA + dedicated CSM",
      "Audit logs + advanced security",
    ],
    notIncluded: [],
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState("nzd");
  const [busy, setBusy] = useState(null);
  const [showContact, setShowContact] = useState(false);

  const onPick = async (tier) => {
    if (tier.id === "free") {
      navigate(user ? "/dashboard" : "/register");
      return;
    }
    if (tier.id === "enterprise") {
      setShowContact(true);
      return;
    }
    if (!user) {
      navigate("/login?next=/pricing");
      return;
    }
    setBusy(tier.id);
    try {
      const { data } = await apiClient.post(
        "/billing/create-checkout-session",
        {
          plan_tier: tier.id,
          currency,
          origin_url: window.location.origin,
        },
      );
      window.location.href = data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start checkout");
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="pricing-page">
      <Header user={user} />

      <section className="max-w-7xl mx-auto px-6 md:px-8 pt-12 md:pt-20 pb-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="label-eyebrow">Pricing</div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mt-3">
            Operational intelligence at a price that scales with you
          </h1>
          <p className="text-slate-600 mt-4 text-lg">
            Start free with 3 properties. Upgrade when you're ready. No credit
            card required to try.
          </p>

          {/* Currency toggle */}
          <div
            className="inline-flex bg-white border border-slate-200 mt-8"
            data-testid="currency-toggle"
          >
            {["nzd", "aud"].map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                data-testid={`currency-${c}`}
                className={`px-5 py-2 text-xs font-bold uppercase tracking-wider ${currency === c ? "bg-[#004B87] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              data-testid={`tier-${tier.id}`}
              className={`bg-white border ${tier.popular ? "border-[#004B87] shadow-lg" : "border-slate-200"} p-6 flex flex-col relative`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#004B87] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 inline-flex items-center gap-1">
                  <Sparkle size={10} weight="fill" /> Most popular
                </div>
              )}

              <div>
                <div className="label-eyebrow">{tier.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {tier.tagline}
                </div>
                <div className="mt-5 flex items-baseline gap-1">
                  {tier.id === "enterprise" ? (
                    <span className="font-display text-3xl font-bold">
                      Custom
                    </span>
                  ) : (
                    <>
                      <span className="text-sm text-slate-500">
                        {currency === "nzd" ? "NZ$" : "A$"}
                      </span>
                      <span
                        className="font-display text-4xl font-bold"
                        data-testid={`price-${tier.id}`}
                      >
                        {tier[currency]}
                      </span>
                      <span className="text-sm text-slate-500">/mo</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {tier.max_properties === null
                    ? "Unlimited properties"
                    : tier.max_properties === 3
                      ? "Up to 3 properties"
                      : `Up to ${tier.max_properties} properties`}
                </div>
              </div>

              <ul className="mt-6 space-y-2.5 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check
                      size={16}
                      weight="bold"
                      className="text-emerald-600 flex-shrink-0 mt-0.5"
                    />
                    <span>{f}</span>
                  </li>
                ))}
                {tier.notIncluded.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-slate-400">
                    <X
                      size={16}
                      weight="bold"
                      className="flex-shrink-0 mt-0.5"
                    />
                    <span className="line-through">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onPick(tier)}
                disabled={busy === tier.id}
                data-testid={`cta-${tier.id}`}
                className={`mt-6 inline-flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-sm ${
                  tier.popular
                    ? "bg-[#FF5722] hover:bg-[#E64A19] text-white"
                    : tier.id === "enterprise"
                      ? "bg-[#0F172A] hover:bg-slate-700 text-white"
                      : "bg-[#004B87] hover:bg-[#003A69] text-white"
                } disabled:opacity-50`}
              >
                {busy === tier.id ? "Loading…" : tier.cta}
                {busy !== tier.id && <ArrowRight size={14} weight="bold" />}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 mt-8 max-w-2xl mx-auto">
          All plans billed monthly in your selected currency. Cancel anytime.
          14-day trial applies to Starter and Pro — no credit card required.
          Prices exclude GST where applicable.
        </p>
      </section>

      {/* FAQ teaser */}
      <section className="max-w-4xl mx-auto px-6 md:px-8 pb-16">
        <h2 className="font-display text-2xl font-bold mb-6">
          Frequently asked
        </h2>
        <div className="space-y-4">
          <Faq
            q="Can I change plans later?"
            a="Yes — upgrade or downgrade any time from your billing settings. Changes prorate immediately."
          />
          <Faq
            q="What happens when I exceed my property limit?"
            a="We'll prompt you to upgrade. Existing properties stay accessible; you can't add new ones until you bump up your plan."
          />
          <Faq
            q="Do you store data in New Zealand?"
            a="Database and object storage are hosted in AWS Sydney (ap-southeast-2), the closest region to NZ. Enterprise can request dedicated NZ-region infrastructure."
          />
          <Faq
            q="What's the difference between users and roles?"
            a="Free and Starter support a single property manager. Pro adds landlord/inspector/tenant/contractor access, with role-scoped data visibility. Enterprise supports SSO and unlimited internal users."
          />
          <Faq
            q="How does Healthy Homes compliance work?"
            a="Dwelloro tracks the 5 statutory areas per property (Heating, Insulation, Ventilation, Moisture, Draught Stopping) with evidence upload, expiry alerts, and audit-ready reports."
          />
        </div>
      </section>

      {showContact && (
        <ContactSalesModal onClose={() => setShowContact(false)} />
      )}
    </div>
  );
}

function Header({ user }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Brand />
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link to={user ? "/dashboard" : "/"} className="text-slate-600 hover:text-[#004B87]">
            Home
          </Link>
          <Link to="/pricing" className="font-semibold text-[#004B87]">
            Pricing
          </Link>
          {user ? (
            <Link
              to="/dashboard"
              data-testid="header-dashboard-link"
              className="bg-[#0F172A] text-white px-4 py-1.5 font-semibold text-xs"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              data-testid="header-login-link"
              className="bg-[#0F172A] text-white px-4 py-1.5 font-semibold text-xs"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Faq({ q, a }) {
  return (
    <details className="bg-white border border-slate-200 p-4 group">
      <summary className="font-semibold cursor-pointer flex items-center justify-between">
        {q}
        <span className="text-slate-400 group-open:rotate-45 transition-transform">
          +
        </span>
      </summary>
      <p className="text-sm text-slate-600 mt-3">{a}</p>
    </details>
  );
}

function ContactSalesModal({ onClose }) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    properties: "",
    message: "",
  });
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    // No backend endpoint yet — log & show success. Wire to Resend / HubSpot later.
    console.log("Enterprise enquiry:", form);
    setSent(true);
    setTimeout(onClose, 2200);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      data-testid="contact-sales-modal"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-lg w-full p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="label-eyebrow">Enterprise</div>
            <h3 className="font-display text-2xl font-bold mt-1">
              Talk to sales
            </h3>
          </div>
          <button
            onClick={onClose}
            data-testid="close-contact-sales"
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
        {sent ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 mx-auto bg-emerald-100 flex items-center justify-center mb-3">
              <Check size={24} weight="bold" className="text-emerald-600" />
            </div>
            <p className="font-semibold">
              Thanks — we'll be in touch within one business day.
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-3"
            data-testid="contact-sales-form"
          >
            <input
              required
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2"
            />
            <input
              required
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2"
            />
            <input
              required
              type="email"
              placeholder="Work email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2"
            />
            <input
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2"
            />
            <input
              required
              placeholder="Approx. number of properties"
              value={form.properties}
              onChange={(e) => setForm({ ...form, properties: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2"
            />
            <textarea
              rows={3}
              placeholder="Tell us about your portfolio…"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2"
            />
            <button
              type="submit"
              data-testid="submit-contact-sales"
              className="w-full bg-[#004B87] hover:bg-[#003A69] text-white py-2.5 font-semibold text-sm"
            >
              Request a call
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
