import { Outlet } from "react-router-dom";

import Sidebar from "../Components/Sidebar/Sidebar";
import Navbar from '../Components/Navbar/Navbar'

import "./RootLayout.css";

const RootLayout = ({ onLogout }) => {
  return (
    <div className="dashboard-layout">

      <Sidebar onLogout={onLogout} />

      <div className="dashboard-main">

        <Navbar />

        <main className="page-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default RootLayout;

