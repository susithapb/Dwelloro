import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Wrench, Buildings, Drop, Wind, Thermometer, ChartLineUp, Camera } from "@phosphor-icons/react";
import { Brand, Eyebrow } from "../components/Common";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <Brand />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="hover:text-[#004B87]">Features</a>
            <a href="#compliance" className="hover:text-[#004B87]">Healthy Homes</a>
            <a href="#workflow" className="hover:text-[#004B87]">Maintenance</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" data-testid="nav-login-btn" className="text-sm font-semibold hover:text-[#004B87]">Sign in</Link>
            <Link
              to="/register"
              data-testid="nav-start-btn"
              className="bg-[#004B87] hover:bg-[#003A69] text-white px-4 py-2 text-sm font-semibold transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bp-grid">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 md:py-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <Eyebrow>MAINTENANCE • INSPECTIONS • COMPLIANCE • INTELLIGENCE</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.05] mt-4 text-[#0F172A]">
              Every repair, inspection &amp; compliance act <span className="text-[#004B87]">on the record</span>.
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
              Dwelloro gives property managers a complete operational record of repairs, inspections, contractor actions and compliance obligations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                data-testid="hero-cta-start"
                className="bg-[#FF5722] hover:bg-[#E64A19] text-white px-6 py-3 font-semibold transition-colors inline-flex items-center gap-2"
              >
                Start free trial <ArrowRight size={18} weight="bold" />
              </Link>
              <Link
                to="/login"
                data-testid="hero-cta-demo"
                className="border-2 border-[#004B87] text-[#004B87] hover:bg-slate-50 px-6 py-3 font-semibold transition-colors"
              >
                See the demo
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-lg">
              <div>
                <div className="font-display text-3xl font-bold text-[#004B87]">5</div>
                <div className="label-eyebrow mt-1">Compliance areas</div>
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-[#004B87]">100%</div>
                <div className="label-eyebrow mt-1">Photo evidence</div>
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-[#004B87]">24/7</div>
                <div className="label-eyebrow mt-1">Tenant reporting</div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 border border-[#004B87]/20 -z-0"></div>
              <img
                src="https://images.pexels.com/photos/8134846/pexels-photo-8134846.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                alt="Modern residence"
                className="relative z-10 w-full h-[440px] object-cover"
              />
              <div className="relative z-10 -mt-12 ml-6 bg-white border border-slate-200 p-4 max-w-[280px] shadow-sm">
                <Eyebrow>Live ticket</Eyebrow>
                <div className="font-display font-bold mt-1.5">Bedroom mould — 5 Queen Rd</div>
                <div className="text-xs text-slate-500 mt-1">AI flagged · Healthy Homes (Moisture)</div>
                <div className="flex gap-2 mt-3">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-50 text-red-700 border border-red-300">Critical</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-orange-50 text-[#FF5722] border border-[#FF5722]/30">Awaiting quote</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules — Bento */}
      <section id="features" className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            <div className="lg:col-span-5">
              <Eyebrow>The operating system</Eyebrow>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-3 leading-tight">
                Built like a control room. Not a CRM.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:pt-10 text-slate-600 text-base leading-relaxed">
              Most "property software" tracks contracts. Dwelloro tracks the operational reality — moisture in the walls, the plumber who fixed it last winter, the photos, the invoice, the compliance fingerprint.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            <div className="md:col-span-4 bg-[#0F172A] text-white p-8 lg:p-10">
              <Wrench size={32} weight="duotone" className="text-[#FF5722]" />
              <h3 className="font-display text-2xl font-bold mt-4">Maintenance Workflow Engine</h3>
              <p className="text-slate-300 mt-3">Tenant reports → AI triages photos → ticket auto-routes to the right tradesperson with a smart brief. Every step timestamped.</p>
            </div>
            <div className="md:col-span-2 bg-white border border-slate-200 p-6">
              <ShieldCheck size={28} weight="duotone" className="text-[#004B87]" />
              <h3 className="font-display text-xl font-bold mt-4">Healthy Homes</h3>
              <p className="text-sm text-slate-600 mt-2">5 statutory areas tracked. Missing evidence detected automatically.</p>
            </div>
            <div className="md:col-span-2 bg-white border border-slate-200 p-6">
              <Camera size={28} weight="duotone" className="text-[#004B87]" />
              <h3 className="font-display text-xl font-bold mt-4">Inspection Intelligence</h3>
              <p className="text-sm text-slate-600 mt-2">Photo timelines per room — deterioration becomes obvious.</p>
            </div>
            <div className="md:col-span-2 bg-white border border-slate-200 p-6">
              <Buildings size={28} weight="duotone" className="text-[#004B87]" />
              <h3 className="font-display text-xl font-bold mt-4">Contractor Coordination</h3>
              <p className="text-sm text-slate-600 mt-2">Quotes, access, before/after — all in one ticket.</p>
            </div>
            <div className="md:col-span-2 bg-[#004B87] text-white p-6">
              <ChartLineUp size={28} weight="duotone" className="text-white" />
              <h3 className="font-display text-xl font-bold mt-4">Risk Scoring</h3>
              <p className="text-sm text-white/80 mt-2">Recurring mould? Seasonal plumbing? The data tells you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Healthy Homes strip */}
      <section id="compliance" className="bp-grid-dense">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 md:py-28">
          <Eyebrow>Healthy Homes Standards · Tracked</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-3 max-w-3xl">
            Five compliance areas. One audit-ready file per property.
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-12">
            {[
              { icon: Thermometer, label: "Heating" },
              { icon: ShieldCheck, label: "Insulation" },
              { icon: Wind, label: "Ventilation" },
              { icon: Drop, label: "Moisture" },
              { icon: Wind, label: "Draught Stopping" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="bg-white border border-slate-200 p-5">
                <Icon size={24} weight="duotone" className="text-[#004B87]" />
                <div className="font-display font-bold mt-4">{label}</div>
                <div className="text-xs text-slate-500 mt-1 label-eyebrow">Evidence + dates</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <Eyebrow>
              <span className="text-slate-400">Operational from day one</span>
            </Eyebrow>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mt-3">
              Stop chasing photos. Start owning the file.
            </h2>
          </div>
          <div className="lg:col-span-5 flex flex-col gap-3">
            <Link
              to="/register"
              data-testid="footer-cta-start"
              className="bg-[#FF5722] hover:bg-[#E64A19] text-white px-6 py-4 font-semibold inline-flex items-center justify-between"
            >
              Create a free workspace <ArrowRight size={18} weight="bold" />
            </Link>
            <Link
              to="/login"
              data-testid="footer-cta-signin"
              className="border border-white/30 hover:bg-white/5 px-6 py-4 font-semibold inline-flex items-center justify-between"
            >
              Sign in <ArrowRight size={18} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <Brand />
          <div>&copy; {new Date().getFullYear()} Dwelloro · Built for Aotearoa</div>
        </div>
      </footer>
    </div>
  );
}
