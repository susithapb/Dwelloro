import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/api";
import { Toaster } from "sonner";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import ReportIssue from "@/pages/report-issue";
import Tickets from "@/pages/tickets";
import TicketDetail from "@/pages/ticket-detail";
import Properties from "@/pages/properties";
import PropertyDetail from "@/pages/property-detail";
import Compliance from "@/pages/compliance";
import Inspections from "@/pages/inspections";
import InspectionDetail from "@/pages/inspection-detail";
import Contractors from "@/pages/contractors";
import PropertyShareReport from "@/pages/property-share-report";
import PortfolioTrends from "@/pages/portfolio-trends";
import Pricing from "@/pages/pricing";
import BillingSuccess from "@/pages/billing-success";
import Billing from "@/pages/billing";
import AdminBilling from "@/pages/admin-billing";
import AdminUsers from "@/pages/admin-users";
import AdminStaff from "@/pages/admin-staff";
import AdminActivity from "@/pages/admin-activity";
import ContractorDetail from "@/pages/contractor-detail";
import ComplianceReport from "@/pages/compliance-report";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import MyProperty from "@/pages/my-property";

function Private({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/settings" element={<Private><Settings /></Private>} />
          <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
          <Route path="/my-property" element={<Private><MyProperty /></Private>} />
          <Route path="/report" element={<Private><ReportIssue /></Private>} />
          <Route path="/tickets" element={<Private><Tickets /></Private>} />
          <Route path="/tickets/:id" element={<Private><TicketDetail /></Private>} />
          <Route path="/properties" element={<Private><Properties /></Private>} />
          <Route path="/properties/:id" element={<Private><PropertyDetail /></Private>} />
          <Route path="/compliance" element={<Private><Compliance /></Private>} />
          <Route path="/inspections" element={<Private><Inspections /></Private>} />
          <Route path="/inspections/:id" element={<Private><InspectionDetail /></Private>} />
          <Route path="/contractors" element={<Private><Contractors /></Private>} />
          <Route path="/portfolio/trends" element={<Private><PortfolioTrends /></Private>} />
          <Route path="/billing" element={<Private><Billing /></Private>} />
          <Route path="/admin/billing" element={<Private><AdminBilling /></Private>} />
          <Route path="/admin/users" element={<Private><AdminUsers /></Private>} />
          <Route path="/admin/staff" element={<Private><AdminStaff /></Private>} />
          <Route path="/admin/activity" element={<Private><AdminActivity /></Private>} />
          <Route path="/contractors/:id" element={<Private><ContractorDetail /></Private>} />
          <Route path="/properties/:id/report" element={<Private><ComplianceReport /></Private>} />
          <Route path="/share/property/:id" element={<PropertyShareReport />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
