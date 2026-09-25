import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Sidebar.css";

const Sidebar = ({ onLogout }) => {
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");

    if (onLogout) {
      onLogout();
    }

    navigate("/login", { replace: true });
  };

  const openMenu = () => {
    setMobileOpen(true);
  };

  const closeMenu = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* =====================================================
          MOBILE HEADER
      ===================================================== */}

      <header className="mobile-header">
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={openMenu}
          aria-label="Open menu"
        >
          <i className="fa-solid fa-bars"></i>
        </button>

        <div className="mobile-header-brand">
          <div className="mobile-header-logo">P</div>

          <div className="mobile-header-text">
            <h2>PaySlip</h2>
            <span>Management System</span>
          </div>
        </div>
      </header>

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={closeMenu}></div>
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        {/* ===================================================
            CLOSE BUTTON
        =================================================== */}

        <button
          type="button"
          className="sidebar-close"
          onClick={closeMenu}
          aria-label="Close menu"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* ===================================================
            LOGO
        =================================================== */}

        <div className="sidebar-logo">
          <div className="logo-icon">P</div>

          <div className="logo-text">
            <h2>PaySlip</h2>
            <span>Management System</span>
          </div>
        </div>

        {/* ===================================================
            MENU
        =================================================== */}

        <div className="sidebar-menu">
          <p className="menu-title">MAIN MENU</p>

          <ul className="sidebar-nav">
            {/* Dashboard */}

            <li className="sidebar-list">
              <NavLink to="/" end onClick={closeMenu}>
                <i className="fa-solid fa-chart-pie"></i>

                <span>Dashboard</span>
              </NavLink>
            </li>

            {/* Attendance */}

            <li className="sidebar-list">
              <NavLink to="/attendance" onClick={closeMenu}>
                <i className="fa-solid fa-file-lines"></i>

                <span>Attendance</span>
              </NavLink>
            </li>

            {/* Employees */}

            <li className="sidebar-list">
              <NavLink to="/employees" onClick={closeMenu}>
                <i className="fa-solid fa-users"></i>

                <span>Employees</span>
              </NavLink>
            </li>

            {/* Payroll */}

            <li className="sidebar-list">
              <NavLink to="/payroll" onClick={closeMenu}>
                <i className="fa-solid fa-sack-dollar"></i>

                <span>Payroll</span>
              </NavLink>
            </li>
          </ul>
        </div>

        {/* ===================================================
            LOGOUT
        =================================================== */}

        <div className="sidebar-bottom">
          <button type="button" className="logout" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket"></i>

            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
