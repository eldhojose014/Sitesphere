
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/Header";

import SiteSupervisor from "./pages/SiteSupervisor";
import Contractor from "./pages/Contractor";
import Projects from "./pages/Projects";
import Users from "./pages/Users";
import MaterialRequests from "./pages/MaterialRequests";
import SupervisorMaterialRequests from "./pages/SupervisorMaterialRequests";
import Materials from "./pages/Materials";
import ContractorMaterialRequests from "./pages/ContractorMaterialRequests";
import Labours from "./pages/Labours";
import Login from "./pages/Login";
import Attendance from "./pages/Attendance";
import AttendanceSummary from "./pages/AttendanceSummary";
import DailyReport from "./pages/DailyReport";
import DailyReportsHistory from "./pages/DailyReportsHistory";
import Accountant from "./pages/Accountant";
import FinanceRequests from "./pages/FinanceRequests";

import "./App.css";

function PageLayout({ children }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login does not use the dashboard Header */}
        <Route path="/login" element={<Login />} />

        {/* These pages already contain their own Header */}
        <Route path="/supervisor" element={<SiteSupervisor />} />

        <Route path="/contractor" element={<Contractor />} />

        {/* Shared Header pages */}
        <Route
          path="/projects"
          element={
            <PageLayout>
              <Projects />
            </PageLayout>
          }
        />

        <Route
          path="/users"
          element={
            <PageLayout>
              <Users />
            </PageLayout>
          }
        />

        <Route
          path="/material-requests"
          element={
            <PageLayout>
              <MaterialRequests />
            </PageLayout>
          }
        />

        <Route
          path="/materials"
          element={
            <PageLayout>
              <Materials />
            </PageLayout>
          }
        />

        <Route
          path="/supervisor/material-requests"
          element={
            <PageLayout>
              <SupervisorMaterialRequests />
            </PageLayout>
          }
        />

        <Route
          path="/contractor/material-requests"
          element={
            <PageLayout>
              <ContractorMaterialRequests />
            </PageLayout>
          }
        />

        <Route
          path="/labours"
          element={
            <PageLayout>
              <Labours />
            </PageLayout>
          }
        />

        <Route
          path="/attendance"
          element={
            <PageLayout>
              <Attendance />
            </PageLayout>
          }
        />

        <Route
          path="/attendance-summary"
          element={
            <PageLayout>
              <AttendanceSummary />
            </PageLayout>
          }
        />

        <Route
          path="/accountant"
          element={
            <PageLayout>
              <Accountant />
            </PageLayout>
          }
        />

        {/* Finance Requests */}
        <Route
          path="/finance-requests"
          element={
            <PageLayout>
              <FinanceRequests />
            </PageLayout>
          }
        />

        {/* Daily Report */}
        <Route
          path="/daily-report"
          element={<DailyReport />}
        />

        {/* Daily Reports History */}
        <Route
          path="/daily-reports-history"
          element={
            <PageLayout>
              <DailyReportsHistory />
            </PageLayout>
          }
        />

        {/* Default route */}
        <Route path="/" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
