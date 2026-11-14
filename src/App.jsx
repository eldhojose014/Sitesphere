import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import useCurrentUser from "./lib/useCurrentUser";
import { ROLES, getHomeForRole } from "./lib/roles";

import SiteSupervisor from "./pages/SiteSupervisor";
import Contractor from "./pages/Contractor";
import CivilEngineer from "./pages/CivilEngineer";
import BuildingPlans from "./pages/BuildingPlans";
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

// "/" sends signed-in users to their own dashboard, everyone else to login.
function HomeRedirect() {
  const { loading, authUser, profile } = useCurrentUser();

  if (loading) {
    return (
      <div className="route-loading" role="status">
        Loading SiteSphere...
      </div>
    );
  }

  if (!authUser || !profile || profile.status !== "Active") {
    return <Login />;
  }

  return <Navigate to={getHomeForRole(profile.role)} replace />;
}

// Any signed-in, active user.
const guard = (element, allowedRoles) => (
  <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>
);

// Same as guard, wrapped with the shared dashboard Header.
const guardWithHeader = (element, allowedRoles) =>
  guard(<PageLayout>{element}</PageLayout>, allowedRoles);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />

        {/* Role dashboards (these pages render their own Header) */}
        <Route
          path="/contractor"
          element={guard(<Contractor />, [ROLES.CONTRACTOR])}
        />
        <Route
          path="/supervisor"
          element={guard(<SiteSupervisor />, [ROLES.SUPERVISOR])}
        />
        <Route
          path="/civil-engineer"
          element={guardWithHeader(<CivilEngineer />, [
            ROLES.ENGINEER,
            ROLES.CONTRACTOR,
          ])}
        />
        <Route
          path="/accountant"
          element={guardWithHeader(<Accountant />, [
            ROLES.ACCOUNTANT,
            ROLES.CONTRACTOR,
          ])}
        />

        {/* Civil Engineer module: managed by engineer/contractor, read-only for supervisors */}
        <Route
          path="/building-plans"
          element={guardWithHeader(<BuildingPlans />, [
            ROLES.ENGINEER,
            ROLES.CONTRACTOR,
            ROLES.SUPERVISOR,
          ])}
        />

        {/* Shared pages (data access is enforced by Supabase RLS) */}
        <Route path="/projects" element={guardWithHeader(<Projects />)} />
        <Route path="/users" element={guardWithHeader(<Users />)} />
        <Route
          path="/material-requests"
          element={guardWithHeader(<MaterialRequests />)}
        />
        <Route path="/materials" element={guardWithHeader(<Materials />)} />
        <Route
          path="/supervisor/material-requests"
          element={guardWithHeader(<SupervisorMaterialRequests />)}
        />
        <Route
          path="/contractor/material-requests"
          element={guardWithHeader(<ContractorMaterialRequests />)}
        />
        <Route path="/labours" element={guardWithHeader(<Labours />)} />
        <Route path="/attendance" element={guardWithHeader(<Attendance />)} />
        <Route
          path="/attendance-summary"
          element={guardWithHeader(<AttendanceSummary />)}
        />
        <Route
          path="/finance-requests"
          element={guardWithHeader(<FinanceRequests />)}
        />
        <Route path="/daily-report" element={guard(<DailyReport />)} />
        <Route
          path="/daily-reports-history"
          element={guardWithHeader(<DailyReportsHistory />)}
        />

        {/* Unknown URLs */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
