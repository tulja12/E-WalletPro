import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AUTH_API_BASE_URL } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";
import { validateOtp } from "../utils/validation";

function MFA() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [message, setMessage] = useState("");

  const username = localStorage.getItem("username");
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const validationError = validateOtp(otp);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    const token = localStorage.getItem("tempToken");
    setLoading(true);

    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ otp })
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        setMessage(extractErrorMessage(data, "Invalid OTP. Please try again."));
        setOtp("");
        setLoading(false);
        return;
      }

      const role = data.role || localStorage.getItem("tempRole") || localStorage.getItem("role") || "USER";
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("role", role);
      localStorage.setItem("mfaEnabled", "true");
      localStorage.removeItem("tempToken");
      localStorage.removeItem("tempRole");
      navigate(role === "ADMIN" ? "/admin/users" : "/dashboard");
    } catch (error) {
      console.error(error);
      setMessage("Unable to reach the MFA service");
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
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 24px 56px rgba(148, 163, 184, 0.18)",
          border: "1px solid #dbe4ef",
          textAlign: "center"
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          style={{
            width: "64px",
            height: "64px",
            background: "linear-gradient(135deg, #3b82f6, #0ea5e9)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 10px 25px rgba(59, 130, 246, 0.4)",
            position: "relative"
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
          <svg width="64" height="64" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
            <circle cx="32" cy="32" r="30" fill="transparent" stroke="rgba(148,163,184,0.35)" strokeWidth="4" />
            <circle
              cx="32"
              cy="32"
              r="30"
              fill="transparent"
              stroke="#fff"
              strokeWidth="4"
              strokeDasharray="188.4"
              strokeDashoffset={188.4 - (188.4 * timeLeft) / 30}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
        </motion.div>

        <h3 className="fw-bold mb-2" style={{ color: "#0f172a", letterSpacing: "-0.5px" }}>
          2-Step Verification
        </h3>

        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "15px", lineHeight: "1.6" }}>
          Verifying secure access for
          <br />
          <strong style={{ color: "#0f172a" }}>{username}</strong>
        </p>

        <div style={{ color: timeLeft <= 5 ? "#ef4444" : "#3b82f6", fontWeight: "bold", fontSize: "14px", marginBottom: "25px" }}>
          Code resets in {timeLeft}s
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="form-label" style={{ color: "#334155", fontSize: "13px", fontWeight: "500", textAlign: "left", width: "100%", paddingLeft: "5px" }}>
              Authentication Code
            </label>
            <input
              type="text"
              autoFocus
              className="form-control text-center"
              placeholder="000000"
              value={otp}
              onChange={(event) => {
                const value = event.target.value.replace(/[^0-9]/g, "");
                if (value.length <= 6) {
                  setOtp(value);
                }
              }}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                fontSize: "28px",
                letterSpacing: "12px",
                borderRadius: "16px",
                padding: "16px",
                transition: "all 0.3s ease",
                boxShadow: "inset 0 2px 4px rgba(148,163,184,0.12)"
              }}
            />
          </div>

          {message ? (
            <div
              className="mb-3"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "#b91c1c",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "12px",
                padding: "12px 14px",
                fontSize: "14px"
              }}
            >
              {message}
            </div>
          ) : null}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn w-100 fw-semibold"
            disabled={loading || otp.length !== 6}
            style={{
              background: otp.length === 6 ? "linear-gradient(135deg, #3b82f6, #0ea5e9)" : "#e2e8f0",
              color: otp.length === 6 ? "#fff" : "#64748b",
              padding: "16px",
              borderRadius: "14px",
              border: otp.length === 6 ? "none" : "1px solid #cbd5e1",
              boxShadow: otp.length === 6 ? "0 8px 20px rgba(59, 130, 246, 0.3)" : "none"
            }}
          >
            {loading ? "Verifying..." : "Verify and Continue"}
          </motion.button>
        </form>

        <p className="mt-4 mb-0" style={{ color: "#64748b", fontSize: "13px" }}>
          Open your authenticator app to view your code.
        </p>
      </motion.div>
    </div>
  );
}

export default MFA;
