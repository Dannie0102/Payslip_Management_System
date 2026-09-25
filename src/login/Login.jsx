import { useState } from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";

const Login = ({ onLogin }) => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");

    if (username === "admin" && password === "admin123") {
      localStorage.setItem("isLoggedIn", "true");

      onLogin();

      // Go to dashboard
      navigate("/");
    } else {
      setError("Invalid username or password.");
    }
  };


  return (
    <div className="login-page">
      <div className="login-container">

        {/* Left Side */}
        <div className="login-info">

          <div className="login-logo">
            P
          </div>

          <h1>PaySlip Management System</h1>

          <p>
            Manage employees, process monthly payroll,
            and generate professional payslips with ease.
          </p>

          <div className="login-features">

            <div className="feature">
              <span>✓</span>
              <p>Employee Management</p>
            </div>

            <div className="feature">
              <span>✓</span>
              <p>Monthly Payroll Processing</p>
            </div>

            <div className="feature">
              <span>✓</span>
              <p>Automatic Payslip Generation</p>
            </div>

          </div>
        </div>

        {/* Login Form */}
        <div className="login-form-container">

          <div className="login-form-header">
            <h2>Welcome Back</h2>

            <p>
              Login to access the payroll dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* Username */}
            <div className="form-group">

              <label htmlFor="username">
                Username
              </label>

              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

            </div>

            {/* Password */}
            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <div className="password-input">

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>

              </div>

            </div>

            {/* Error */}
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              className="login-button"
            >
              Login
            </button>

          </form>

          <div className="demo-login">
            <p>Demo account</p>

            <span>
              Username: <strong>admin</strong>
            </span>

            <span>
              Password: <strong>admin123</strong>
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;