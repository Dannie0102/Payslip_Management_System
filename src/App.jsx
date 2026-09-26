import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

// Global and layout styles
import "./index.css";
import "./Components/SideBar/Sidebar.css";

// Layout
import RootLayout from "./Layout/RootLayout";

// Pages
import Dashboard from "./Pages/Dashboard";
import Employees from "./Pages/Employees";
import EmployeeDetail from "./Pages/EmployeeDetail";
import Attendance from "./Pages/Attendance";
import Payroll from "./Pages/Payroll";
import Payslip from "./Pages/Payslip";
import Marking from "./Pages/Marking";
import NotFound from "./Pages/NotFound";

// Authentication
import Login from "./login/Login";

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true",
  );

  // Handle login
  const handleLogin = () => {
    localStorage.setItem("isLoggedIn", "true");
    setIsLoggedIn(true);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
  };

  return (
    <Routes>
      {/* =========================
          LOGIN ROUTE
      ========================== */}
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to="/" replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />

      {/* =========================
          MAIN APPLICATION ROUTES
      ========================== */}
      <Route
        path="/"
        element={
          isLoggedIn ? (
            <RootLayout onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        {/* Dashboard */}
        <Route index element={<Dashboard />} />

        {/* Employees */}
        <Route path="employees" element={<Employees />} />

        {/* Specific Employee Details */}
        <Route path="employees/:employeesId" element={<EmployeeDetail />} />

        {/* Attendance */}
        <Route path="attendance" element={<Attendance />} />
        <Route path="marking" element={<Marking />} />

        {/* Payroll */}
        <Route path="payroll" element={<Payroll />} />

        {/* All Payslips */}
        <Route path="payslip" element={<Payslip />} />

        {/* Specific Employee Payslip */}
        {/*
        <Route
          path="payslip/:employeesId"
          element={<Payslip />}
        />
        */}
      </Route>

      {/* =========================
          UNKNOWN ROUTES
      ========================== */}
      {/* <Route
        path="*"
        element={<Navigate to={isLoggedIn ? "/" : "/login"} replace />}
      /> */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
