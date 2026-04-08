import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AUTH_API_BASE_URL } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";

function MFASetup() {
  const [qrImage, setQrImage] = useState(null);
  const [status, setStatus] = useState("Checking...");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${AUTH_API_BASE_URL}/mfa-status`, {
        headers: { Authorization: "Bearer " + token }
      });
      const data = await readResponsePayload(res);
      setStatus(data.enabled ? "Enabled" : "Not Enabled");
    } catch {
      setStatus("Unknown");
    }
  };

  const handleEnableMFA = async () => {
    if (status === "Enabled") {
      alert("MFA is already enabled");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/enable-mfa`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token }
      });
      const data = await readResponsePayload(response);
      if (data.qrImage) {
        setQrImage(data.qrImage);
        setStatus("Enabled");
      } else {
        alert(extractErrorMessage(data, "QR not available"));
      }
    } catch {
      alert("Unable to reach the MFA service");
    }
    setLoading(false);
  };

  const handleDisableMFA = async () => {
    if (!window.confirm("Are you sure you want to disable MFA?")) return;
    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/disable-mfa`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token }
      });
      const data = await readResponsePayload(response);
      if (!response.ok) {
        alert(extractErrorMessage(data, "Failed to disable MFA"));
        return;
      }
      setStatus("Not Enabled");
      setQrImage(null);
    } catch {
      alert("Unable to reach the MFA service");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 52%, #eef6ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 24px 56px rgba(148, 163, 184, 0.18)",
          border: "1px solid #dbe4ef"
        }}
      >
        <div className="text-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            style={{
              width: "64px",
              height: "64px",
              background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 10px 25px rgba(139, 92, 246, 0.4)"
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </motion.div>
          <h3 className="fw-bold mb-2" style={{ color: "#0f172a", letterSpacing: "-0.5px" }}>Two-Factor Auth</h3>
          <p style={{ color: "#64748b", fontSize: "15px" }}>
            Secure your digital wallet with an authenticator app.
          </p>
        </div>

        <div
          className="d-flex justify-content-between align-items-center p-3 mb-4"
          style={{
            background: "#f8fafc",
            borderRadius: "16px",
            border: "1px solid #e2e8f0"
          }}
        >
          <span style={{ color: "#334155", fontWeight: "500" }}>Current Status</span>
          <span
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              background: status === "Enabled" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
              color: status === "Enabled" ? "#34d399" : "#f87171",
              fontSize: "13px",
              fontWeight: "600",
              boxShadow: status === "Enabled" ? "0 0 15px rgba(16, 185, 129, 0.2)" : "none"
            }}
          >
            {status}
          </span>
        </div>

        <div
          className="mb-4 p-4"
          style={{
            background: "#f8fbff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0"
          }}
        >
          <h6 className="fw-semibold mb-3" style={{ color: "#0f172a", fontSize: "15px" }}>Setup Instructions</h6>
          <ul className="mb-0" style={{ color: "#64748b", paddingLeft: "20px", fontSize: "14px", lineHeight: "1.8" }}>
            <li>Install <b>Google Authenticator</b></li>
            <li>Click "Generate QR Code" below</li>
            <li>Scan the code with your app</li>
            <li>Logout & login again to verify</li>
          </ul>
        </div>

        <div className="d-flex flex-column gap-3 mb-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn w-100 fw-semibold"
            onClick={handleEnableMFA}
            disabled={loading || status === "Enabled"}
            style={{
              background: status === "Enabled" ? "#e2e8f0" : "linear-gradient(135deg, #8b5cf6, #3b82f6)",
              color: status === "Enabled" ? "#64748b" : "#fff",
              padding: "14px",
              borderRadius: "14px",
              border: status === "Enabled" ? "1px solid #cbd5e1" : "none",
              boxShadow: status === "Enabled" ? "none" : "0 8px 20px rgba(139, 92, 246, 0.3)"
            }}
          >
            {loading ? "Generating..." : status === "Enabled" ? "Already Enabled" : "Generate QR Code"}
          </motion.button>

          {status === "Enabled" && (
            <>
              <motion.button
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                whileHover={{ scale: 1.02, backgroundColor: "rgba(16, 185, 129, 0.15)" }}
                whileTap={{ scale: 0.98 }}
                className="btn w-100 fw-semibold mb-3"
                onClick={() => { localStorage.clear(); window.location.href = "/"; }}
                style={{
                  background: "rgba(16, 185, 129, 0.05)",
                  color: "#34d399",
                  padding: "14px",
                  borderRadius: "14px",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  transition: "all 0.3s ease"
                }}
              >
                Logout & Verify App
              </motion.button>
              
              <motion.button
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                whileHover={{ scale: 1.02, backgroundColor: "rgba(239, 68, 68, 0.15)" }}
                whileTap={{ scale: 0.98 }}
                className="btn w-100 fw-semibold"
                onClick={handleDisableMFA}
                style={{
                  background: "rgba(239, 68, 68, 0.05)",
                  color: "#f87171",
                  padding: "14px",
                  borderRadius: "14px",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  transition: "all 0.3s ease"
                }}
              >
                Disable MFA Protection
              </motion.button>
            </>
          )}
        </div>

        {qrImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-4 pt-3"
            style={{ borderTop: "1px solid #e2e8f0" }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "15px",
                background: "#ffffff",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
              }}
            >
              <img
                src={`data:image/png;base64,${qrImage}`}
                alt="QR Code"
                style={{ width: "180px", height: "180px", objectFit: "contain" }}
              />
            </div>
            <p className="mt-4 mb-0" style={{ color: "#64748b", fontSize: "14px" }}>
              Scan this code, then <b>logout</b> to complete setup.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default MFASetup;
