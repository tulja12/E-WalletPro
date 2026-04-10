import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { apiUrl } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";
import { sanitizeUsername, validateLoginForm } from "../utils/validation";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validateLoginForm({ username, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const normalizedUsername = sanitizeUsername(username);
      const res = await fetch(apiUrl("/auth/login/user"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: normalizedUsername,
          passkey: password
        })
      });

      const data = await readResponsePayload(res);

      if (!res.ok) {
        setError(extractErrorMessage(data, "Invalid username or password"));
        setLoading(false);
        return;
      }

      localStorage.setItem("username", normalizedUsername);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("role", "USER");

      if (data.mfaRequired) {
        localStorage.setItem("tempToken", data.tempToken);
        localStorage.setItem("tempRole", "USER");
        navigate("/mfa");
      } else {
        localStorage.setItem("token", data.token);
        navigate("/mfa-setup");
      }
    } catch {
      setError("Unable to reach the login service");
    }

    setLoading(false);
  };

  return (
      <div className="auth-page">
        <div className="auth-card">

          <div className="auth-badge">USER LOGIN</div>

          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">
            Enter your details to continue into your wallet.
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">Username</label>
            <input
                type="text"
                className="auth-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
            />

            <label className="auth-label" style={{ marginTop: "10px" }}>
              Password
            </label>

            <div className="auth-password-box">
              <input
                  type={showPassword ? "text" : "password"}
                  className="auth-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
              />

              <button
                  type="button"
                  className="auth-show-btn"
                  onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="auth-inline-actions">
              <Link to="/forgot-password" className="auth-text-link">
                Forgot password?
              </Link>
            </div>

            <button
                type="submit"
                className="auth-btn"
                disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="auth-links">
          <span>
            New here? <Link to="/signup">Create your account</Link>
          </span>
            <span>
            Admin access? <Link to="/admin-login">Use admin login</Link>
          </span>
          </div>

        </div>
      </div>
  );
}

export default Login;
