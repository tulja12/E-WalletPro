import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { apiUrl, AUTH_API_BASE_URL } from "../config/api";
import { readResponsePayload } from "../utils/api";

const formatCurrency = (value) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const formatDateTime = (date) =>
  new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

const maskCard = (cardNumber) => `•••• ${String(cardNumber || "").slice(-4) || "0000"}`;

function Dashboard() {
  const [balance, setBalance] = useState(0);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [historyOffline, setHistoryOffline] = useState(false);
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
        const [balanceResponse, mfaResponse, accountsResponse, transactionsResponse] = await Promise.all([
          fetch(apiUrl("/wallet/balance"), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${AUTH_API_BASE_URL}/mfa-status`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl("/accounts"), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl("/transactions"), {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const [balanceData, mfaData, accountsData, transactionsData] = await Promise.all([
          readResponsePayload(balanceResponse),
          readResponsePayload(mfaResponse),
          readResponsePayload(accountsResponse),
          readResponsePayload(transactionsResponse)
        ]);

        if (balanceResponse.ok) {
          setBalance(Number(balanceData.balance || 0));
        }

        if (mfaResponse.ok) {
          setMfaEnabled(Boolean(mfaData.enabled));
        }

        if (accountsResponse.ok) {
          setAccounts(Array.isArray(accountsData) ? accountsData : []);
        }

        if (transactionsResponse.ok) {
          setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
          setHistoryOffline(false);
        } else if (transactionsResponse.status >= 500) {
          setHistoryOffline(true);
        }
      } catch (error) {
        console.error(error);
        setHistoryOffline(true);
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

  const username = localStorage.getItem("username") || "User";
  const totalLinkedBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const protectedCards = accounts.filter((account) => account.pinConfigured).length;
  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((left, right) => new Date(right.dateTime).getTime() - new Date(left.dateTime).getTime())
        .slice(0, 4),
    [transactions]
  );

  return (
    <div style={{ padding: "40px 20px", minHeight: "100%" }}>
      <div className="container" style={{ maxWidth: "1220px", margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #172554 55%, #0f766e 100%)",
            borderRadius: "32px",
            padding: "34px",
            color: "#ffffff",
            boxShadow: "0 30px 70px rgba(15, 23, 42, 0.28)",
            overflow: "hidden",
            position: "relative"
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-90px",
              right: "-20px",
              width: "260px",
              height: "260px",
              borderRadius: "50%",
              background: "rgba(59, 130, 246, 0.18)",
              filter: "blur(18px)"
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-70px",
              left: "-40px",
              width: "220px",
              height: "220px",
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.18)",
              filter: "blur(16px)"
            }}
          />

          <div className="row g-4 align-items-end" style={{ position: "relative", zIndex: 1 }}>
            <div className="col-lg-8">
              <div style={{ fontSize: "12px", letterSpacing: "1.6px", textTransform: "uppercase", color: "#93c5fd" }}>
                Good {greeting}
              </div>
              <h1 className="fw-bold mt-2 mb-2" style={{ letterSpacing: "-1px" }}>
                Welcome back, {username}
              </h1>

              <div className="d-flex flex-wrap gap-3">
                <Link
                  to="/addmoney"
                  className="btn fw-semibold"
                  style={{
                    background: "#ffffff",
                    color: "#0f172a",
                    borderRadius: "16px",
                    padding: "13px 18px",
                    border: "none"
                  }}
                >
                  Add Funds
                </Link>
                <Link
                  to="/transfer"
                  className="btn fw-semibold"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#ffffff",
                    borderRadius: "16px",
                    padding: "13px 18px",
                    border: "1px solid rgba(255,255,255,0.14)"
                  }}
                >
                  Transfer Money
                </Link>
                <Link
                  to="/accounts"
                  className="btn fw-semibold"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#ffffff",
                    borderRadius: "16px",
                    padding: "13px 18px",
                    border: "1px solid rgba(255,255,255,0.14)"
                  }}
                >
                  Manage Cards
                </Link>
              </div>
            </div>

            <div className="col-lg-4">
              <div
                style={{
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "24px",
                  padding: "24px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backdropFilter: "blur(10px)"
                }}
              >
                <div style={{ color: "#cbd5e1", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1.2px" }}>
                  Available Wallet Balance
                </div>
                <div className="fw-bold mt-2" style={{ fontSize: "42px", letterSpacing: "-1px" }}>
                  {formatCurrency(balance)}
                </div>
                <div className="mt-3" style={{ color: "#cbd5e1", fontSize: "14px" }}>
                  Ready for wallet payments, top-ups, and internal transfers.
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="row g-4 mt-1">
          {[
            {
              label: "Linked Cards",
              value: accounts.length,
              detail: `${protectedCards}/${accounts.length || 0} PIN protected`,
              accent: "#2563eb",
              bg: "#eff6ff"
            },
            {
              label: "Total Linked Balance",
              value: formatCurrency(totalLinkedBalance),
              detail: "Across all saved bank cards",
              accent: "#059669",
              bg: "#ecfdf5"
            },
            {
              label: "Security Status",
              value: mfaEnabled ? "MFA On" : "MFA Off",
              detail: mfaEnabled ? "Account protection active" : "Enable MFA for stronger login security",
              accent: mfaEnabled ? "#059669" : "#d97706",
              bg: mfaEnabled ? "#ecfdf5" : "#fffbeb"
            }
          ].map((card) => (
            <div className="col-md-4" key={card.label}>
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "24px",
                  padding: "24px",
                  border: "1px solid #dbe4ef",
                  boxShadow: "0 18px 40px rgba(148, 163, 184, 0.14)",
                  height: "100%"
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "14px",
                    background: card.bg,
                    color: card.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    marginBottom: "16px"
                  }}
                >
                  {String(card.label).charAt(0)}
                </div>
                <div style={{ color: "#64748b", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  {card.label}
                </div>
                <div className="fw-bold mt-2" style={{ color: "#0f172a", fontSize: "28px", letterSpacing: "-0.6px" }}>
                  {card.value}
                </div>
                <div className="mt-2" style={{ color: "#64748b", fontSize: "14px" }}>
                  {card.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-4 mt-1">
          <div className="col-lg-7">
            <div
              style={{
                background: "#ffffff",
                borderRadius: "28px",
                padding: "28px",
                border: "1px solid #dbe4ef",
                boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)",
                height: "100%"
              }}
            >
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
                <div>
                  <h4 className="fw-bold mb-1" style={{ color: "#0f172a" }}>Linked Cards</h4>
                  <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                    Visible balances and PIN readiness for each saved card.
                  </p>
                </div>
                <Link to="/accounts" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                  View all
                </Link>
              </div>

              {accounts.length === 0 ? (
                <div
                  style={{
                    borderRadius: "22px",
                    border: "1px dashed #cbd5e1",
                    background: "#f8fafc",
                    padding: "28px",
                    textAlign: "center"
                  }}
                >
                  <h6 className="fw-semibold mb-2" style={{ color: "#0f172a" }}>No cards linked yet</h6>
                  <p style={{ color: "#64748b", marginBottom: "12px" }}>
                    Add a bank card to start wallet funding and self-transfers.
                  </p>
                  <Link to="/accounts">Open linked cards</Link>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {accounts.slice(0, 3).map((account) => (
                    <div
                      key={account.id}
                      style={{
                        borderRadius: "22px",
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        padding: "18px 20px"
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <div>
                          <div className="fw-semibold" style={{ color: "#0f172a" }}>
                            {account.bankName}
                          </div>
                          <div style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
                            {maskCard(account.cardNumber)} • {account.accountHolder}
                          </div>
                        </div>
                        <span
                          style={{
                            borderRadius: "999px",
                            padding: "6px 10px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: account.pinConfigured ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                            color: account.pinConfigured ? "#047857" : "#b45309",
                            border: `1px solid ${account.pinConfigured ? "rgba(16, 185, 129, 0.18)" : "rgba(245, 158, 11, 0.18)"}`
                          }}
                        >
                          {account.pinConfigured ? "PIN Ready" : "PIN Missing"}
                        </span>
                      </div>

                      <div className="d-flex justify-content-between align-items-end mt-3">
                        <div style={{ color: "#64748b", fontSize: "13px" }}>Available card balance</div>
                        <div className="fw-bold" style={{ color: "#0f172a", fontSize: "20px" }}>
                          {formatCurrency(account.balance)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-lg-5">
            <div
              style={{
                background: "#ffffff",
                borderRadius: "28px",
                padding: "28px",
                border: "1px solid #dbe4ef",
                boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)",
                marginBottom: "24px"
              }}
            >
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h4 className="fw-bold mb-1" style={{ color: "#0f172a" }}>Security</h4>
                  <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                    Login protection and linked-card readiness.
                  </p>
                </div>
                <span
                  style={{
                    borderRadius: "999px",
                    padding: "6px 10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: mfaEnabled ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                    color: mfaEnabled ? "#047857" : "#b45309"
                  }}
                >
                  {mfaEnabled ? "Protected" : "Attention"}
                </span>
              </div>

              <div
                style={{
                  borderRadius: "20px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "18px"
                }}
              >
                <div className="fw-semibold" style={{ color: "#0f172a" }}>
                  {mfaEnabled ? "Multi-factor authentication is enabled." : "Multi-factor authentication is disabled."}
                </div>
                <div style={{ color: "#64748b", fontSize: "14px", marginTop: "6px" }}>
                  {mfaEnabled
                    ? "Your account has an extra verification step during sign-in."
                    : "Enable MFA to reduce the risk of unauthorized wallet access."}
                </div>
              </div>

              <div className="d-flex gap-3 mt-3">
                {mfaEnabled ? (
                  <button
                    onClick={handleDisableMFA}
                    className="btn w-100 fw-semibold"
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.18)",
                      color: "#b91c1c",
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
                      padding: "12px"
                    }}
                  >
                    Enable MFA
                  </Link>
                )}
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                borderRadius: "28px",
                padding: "28px",
                border: "1px solid #dbe4ef",
                boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)"
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h4 className="fw-bold mb-1" style={{ color: "#0f172a" }}>Recent Activity</h4>
                  <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                    Quick snapshot of the latest wallet records.
                  </p>
                </div>
                <Link to="/transactions" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                  Open history
                </Link>
              </div>

              {historyOffline ? (
                <div
                  style={{
                    borderRadius: "18px",
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.18)",
                    padding: "16px",
                    color: "#b45309"
                  }}
                >
                  History offline. New entries will appear here after sync resumes.
                </div>
              ) : recentTransactions.length === 0 ? (
                <div
                  style={{
                    borderRadius: "18px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "18px",
                    color: "#64748b"
                  }}
                >
                  No recent activity yet.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      style={{
                        borderRadius: "18px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        padding: "16px"
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <div>
                          <div className="fw-semibold" style={{ color: "#0f172a" }}>
                            {transaction.summary}
                          </div>
                          <div style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>
                            {transaction.detailLine}
                          </div>
                        </div>
                        <div style={{ color: "#64748b", fontSize: "12px", flexShrink: 0 }}>
                          {formatDateTime(transaction.dateTime)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
