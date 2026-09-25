import "./Navbar.css";

const Navbar = () => {
  return (
    <header className="navbar">
      {/* Navbar Left */}
      <div className="navbar-left">
        <h2>PaySlip System</h2>
      </div>

      {/* Navbar Right */}
      <div className="navbar-right">
        {/* Notification */}
        <button
          type="button"
          className="notification-button"
          aria-label="View notifications"
        >
          <i className="fa-solid fa-bell" aria-hidden="true"></i>

          <span className="notification-badge">0</span>
        </button>

        {/* User Profile */}
        <div className="user-profile">
          <div className="user-avatar" aria-hidden="true">
            A
          </div>

          <div className="user-info">
            <span className="user-name">Administrator</span>
            <span className="user-role">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
