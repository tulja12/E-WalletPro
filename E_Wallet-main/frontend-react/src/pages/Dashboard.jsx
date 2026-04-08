import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { apiUrl, AUTH_API_BASE_URL } from "../config/api";
import { readResponsePayload } from "../utils/api";

function Dashboard() {
  const [balance, setBalance] = useState(0);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId || userId === "undefined") {
      localStorage.clear();
      navigate("/");
      return;
    }

    const loadDashboard = async () => {
      try {
        const [balanceResponse, mfaResponse] = await Promise.all([
          fetch(apiUrl("/wallet/balance"), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${AUTH_API_BASE_URL}/mfa-status`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const balanceData = await readResponsePayload(balanceResponse);
        const mfaData = await readResponsePayload(mfaResponse);

        if (balanceResponse.ok) {
          setBalance(Number(balanceData.balance || 0));
        }

        if (mfaResponse.ok) {
          setMfaEnabled(Boolean(mfaData.enabled));
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadDashboard();
  }, [navigate]);

  const handleDisableMFA = async () => {
    if (!window.confirm("Are you sure you want to disable MFA?")) {
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/disable-mfa`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setMfaEnabled(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const greeting =
    new Date().getHours() < 12
      ? "Morning"
      : new Date().getHours() < 18
        ? "Afternoon"
        : "Evening";

  return (
    <div style={{ padding: "40px 40px", minHeight: "100%" }}>
      <div className="container" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            background: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: "24px",
            padding: "40px",
            boxShadow: "0 28px 60px rgba(148, 163, 184, 0.16)",
            border: "1px solid #dbe4ef"
          }}
        >
          <div className="mb-5">
            <h2 className="fw-bold mb-1" style={{ color: "#0f172a", letterSpacing: "-0.5px" }}>
              Good {greeting}, {localStorage.getItem("username") || "User"}!
            </h2>
            <p style={{ color: "#64748b", margin: 0 }}>
              Your wallet summary and security status are shown below.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-lg-7">
              <motion.div
                initial={{ opacity: 0, rotateY: -15, scale: 0.95 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                style={{
                  minHeight: "240px",
                  borderRadius: "24px",
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  padding: "35px",
                  color: "white",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.2)"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "-100px",
                    left: "-50px",
                    width: "250px",
                    height: "250px",
                    background: "linear-gradient(135deg, rgba(255,255,255,0.15), transparent)",
                    borderRadius: "50%",
                    filter: "blur(30px)",
                    transform: "rotate(45deg)",
                    pointerEvents: "none"
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "-80px",
                    right: "-20px",
                    width: "200px",
                    height: "200px",
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), transparent)",
                    borderRadius: "50%",
                    filter: "blur(40px)",
                    pointerEvents: "none"
                  }}
                />

                <div className="d-flex justify-content-between align-items-center mb-4" style={{ position: "relative", zIndex: 2 }}>
                  <svg width="45" height="32" viewBox="0 0 45 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="45" height="32" rx="6" fill="#fbbf24" />
                    <path d="M12 0V32M33 0V32M0 12H45M0 20H45" stroke="#d97706" strokeWidth="1.5" />
                  </svg>
                  <div style={{ fontSize: "13px", letterSpacing: "2px", color: "#94a3b8" }}>E-WALLET PRO</div>
                </div>

                <div style={{ position: "relative", zIndex: 2, marginBottom: "30px" }}>
                  <p className="mb-0" style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "2px" }}>
                    Available Balance
                  </p>
                  <h1
                    className="fw-bold m-0"
                    style={{
                      fontSize: "3.5rem",
                      letterSpacing: "-1px",
                      fontFamily: "'Courier New', Courier, monospace",
                      textShadow: "0 2px 10px rgba(0,0,0,0.5)"
                    }}
                  >
                    Rs {balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h1>
                </div>

                <div className="d-flex justify-content-between align-items-end" style={{ position: "relative", zIndex: 2 }}>
                  <div>
                    <p className="mb-0" style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                      Card Holder
                    </p>
                    <p className="mb-0 fw-semibold" style={{ fontSize: "16px", letterSpacing: "2px", textTransform: "uppercase" }}>
                      {localStorage.getItem("username") || "Valued User"}
                    </p>
                  </div>
                  <div style={{ fontStyle: "italic", fontWeight: "900", fontSize: "24px", color: "rgba(255,255,255,0.9)", letterSpacing: "-1px" }}>
                    E-Wallet<span style={{ color: "#3b82f6" }}>Pro</span>
                  </div>
                </div>
              </motion.div>

              <div className="d-flex gap-3 mt-4">
                <Link
                  to="/addmoney"
                  className="btn fw-semibold flex-grow-1"
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "white",
                    borderRadius: "16px",
                    padding: "14px",
                    boxShadow: "0 8px 20px rgba(16, 185, 129, 0.3)"
                  }}
                >
                  <i className="bi bi-wallet2 me-2" />
                  Add Funds
                </Link>
                <Link
                  to="/transfer"
                  className="btn fw-semibold flex-grow-1"
                  style={{
                    background: "#eff6ff",
                    color: "#1e293b",
                    borderRadius: "16px",
                    padding: "14px",
                    border: "1px solid #bfdbfe"
                  }}
                >
                  <i className="bi bi-send-fill me-2" />
                  Transfer Money
                </Link>
              </div>
            </div>

            <div className="col-lg-5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  borderRadius: "24px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  padding: "30px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 16px 36px rgba(148, 163, 184, 0.12)",
                  minHeight: "100%"
                }}
              >
                <div>
                  <div className="d-flex align-items-center mb-3">
                    <div
                      style={{
                        width: "45px",
                        height: "45px",
                        borderRadius: "12px",
                        background: mfaEnabled ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: "16px"
                      }}
                    >
                      <span className="fs-5">{mfaEnabled ? "Secure" : "Alert"}</span>
                    </div>
                    <div>
                      <h5 className="fw-bold m-0" style={{ color: "#0f172a", letterSpacing: "-0.5px" }}>
                        Global Security
                      </h5>
                      <span style={{ fontSize: "12px", color: mfaEnabled ? "#34d399" : "#f59e0b" }}>
                        {mfaEnabled ? "Active and protected" : "Protection recommended"}
                      </span>
                    </div>
                  </div>
                  <p style={{ color: "#64748b", fontSize: "14px", lineHeight: "1.6" }}>
                    {mfaEnabled
                      ? "Your payments are protected by two-factor authentication."
                      : "Enable two-factor authentication to reduce the risk of unauthorized access."}
                  </p>
                </div>

                <div className="mt-2">
                  {mfaEnabled ? (
                    <button
                      onClick={handleDisableMFA}
                      className="btn w-100 fw-semibold"
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        color: "#f87171",
                        borderRadius: "14px",
                        padding: "12px"
                      }}
                    >
                      Disable MFA
                    </button>
                  ) : (
                    <Link
                      to="/mfa-setup"
                      className="btn w-100 fw-semibold"
                      style={{
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        border: "none",
                        color: "white",
                        borderRadius: "14px",
                        boxShadow: "0 8px 20px rgba(245, 158, 11, 0.3)",
                        padding: "12px"
                      }}
                    >
                      Setup Protection
                    </Link>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard;
