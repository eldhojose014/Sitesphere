import { BrowserRouter, Routes, Route } from "react-router-dom";

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

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route 
          path="/login" 
          element={<Login />} 
        />

        <Route
          path="/supervisor"
          element={<SiteSupervisor />}
        />

        <Route
          path="/contractor"
          element={<Contractor />}
        />

        <Route
          path="/projects"
          element={<Projects />}
        />

        <Route
          path="/users"
          element={<Users/>}
        />

        <Route
          path="/material-requests"
          element={<MaterialRequests />}
        />

        <Route
          path="/materials"
          element={<Materials />}
        />

        <Route
          path="/supervisor/material-requests"
          element={<SupervisorMaterialRequests />}
        />

        <Route
          path="/contractor/material-requests"
          element={<ContractorMaterialRequests />}
        />

        <Route 
          path="/labours" 
          element={<Labours />} 
        />

        <Route
          path="/"
          element={<Login />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;