import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AUTH_API_BASE_URL } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";
import { sanitizeUsername, validateLoginForm } from "../utils/validation";
import "../styles/auth.css";

function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const validationError = validateLoginForm({ username, password }, { admin: true });
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setLoading(true);

    try {
      const normalizedUsername = sanitizeUsername(username);
      const response = await fetch(`${AUTH_API_BASE_URL}/login/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: normalizedUsername,
          passkey: password
        })
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        setMessage(extractErrorMessage(data, "Invalid admin username or password"));
        setLoading(false);
        return;
      }

      localStorage.setItem("username", normalizedUsername);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("role", "ADMIN");

      if (data.mfaRequired) {
        localStorage.setItem("mfaEnabled", "true");
        localStorage.setItem("tempToken", data.tempToken);
        localStorage.setItem("tempRole", "ADMIN");
        navigate("/mfa");
      } else {
        localStorage.setItem("mfaEnabled", "false");
        localStorage.setItem("token", data.token);
        localStorage.removeItem("tempToken");
        localStorage.removeItem("tempRole");
        navigate("/admin/users");
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to reach the admin login service");
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 52%, #eef6ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "24px",
          padding: "40px",
          border: "1px solid #dbe4ef",
          boxShadow: "0 24px 56px rgba(148, 163, 184, 0.18)"
        }}
      >
        <div className="text-center mb-4">
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 20px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "28px",
              fontWeight: "700"
            }}
          >
            A
          </div>
          <h2 className="fw-bold mb-2" style={{ color: "#0f172a" }}>Admin Access</h2>
          <p style={{ color: "#64748b", margin: 0 }}>
            Sign in with an admin account to view all users.
          </p>
        </div>

        {message && (
          <div
            className="mb-4 p-3 text-center"
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              color: "#dc2626",
              borderRadius: "12px",
              border: "1px solid #fecdd3"
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" style={{ color: "#334155" }}>
              Admin Username
            </label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                borderRadius: "12px",
                padding: "14px 16px"
              }}
            />
          </div>

          <div className="mb-4">
            <label className="form-label" style={{ color: "#334155" }}>
              Password
            </label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                borderRadius: "12px",
                padding: "14px 16px"
              }}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn w-100 fw-semibold mb-3"
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "white",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 10px 30px rgba(245, 158, 11, 0.25)"
            }}
          >
            {loading ? "Checking..." : "Sign In as Admin"}
          </motion.button>
        </form>

        <div className="text-center">
          <small style={{ color: "#64748b" }}>
            Standard user?{" "}
            <Link to="/" style={{ color: "#2563eb", textDecoration: "none", fontWeight: "600" }}>
              Go to user login
            </Link>
          </small>
        </div>
      </motion.div>
    </div>
  );
}

export default AdminLogin;
