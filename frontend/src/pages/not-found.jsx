import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../components/Common";
import { ArrowLeft, House } from "@phosphor-icons/react";
import { useAuth } from "../lib/api";

export default function NotFound() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
      <Brand />
      <div className="mt-12 mb-4 font-display text-[120px] font-bold leading-none text-slate-100 select-none">
        404
      </div>
      <h1 className="font-display text-2xl font-bold text-slate-800 -mt-4">Page not found</h1>
      <p className="text-slate-500 mt-3 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-sm font-semibold hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={14} weight="bold" /> Go back
        </button>
        <Link
          to={user ? "/dashboard" : "/"}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#004B87] text-white text-sm font-semibold hover:bg-[#003A69] transition-colors"
        >
          <House size={14} weight="bold" /> {user ? "Dashboard" : "Home"}
        </Link>
      </div>
    </div>
  );
}
