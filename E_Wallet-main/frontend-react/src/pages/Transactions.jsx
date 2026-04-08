import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { apiUrl } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [message, setMessage] = useState("");
  const [historyNotice, setHistoryNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [emailingHistory, setEmailingHistory] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      localStorage.clear();
      navigate("/");
      return;
    }
    fetchTransactions();
  }, [navigate]);

  useEffect(() => {
    if (!historyNotice) {
      return undefined;
    }

    const retryTimer = window.setInterval(() => {
      fetchTransactions({ silent: true });
    }, 5000);

    return () => window.clearInterval(retryTimer);
  }, [historyNotice]);

  const fetchTransactions = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/transactions"), {
        method: "GET",
        headers: { Authorization: "Bearer " + token }
      });

      const data = await readResponsePayload(response);

      if (response.ok) {
        setTransactions(Array.isArray(data) ? data : []);
        setMessage("");
        setHistoryNotice("");
      } else if (response.status >= 500) {
        setMessage("");
        setHistoryNotice(
          "Transaction history service is temporarily unavailable. Completed wallet operations will appear here automatically when it comes back online."
        );
      } else {
        setMessage(extractErrorMessage(data, "Failed to load transactions."));
        setHistoryNotice("");
      }
    } catch (error) {
      setMessage("");
      setHistoryNotice(
        "Transaction history service is temporarily unavailable. Completed wallet operations will appear here automatically when it comes back online."
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const sendHistoryEmail = async () => {
    try {
      setEmailingHistory(true);
      setNotice({ type: "", text: "" });

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/transactions/email-history"), {
        method: "POST",
        headers: { Authorization: "Bearer " + token }
      });

      const data = await readResponsePayload(response);
      setNotice({
        type: response.ok ? "success" : "error",
        text: extractErrorMessage(
          data,
          response.ok ? "Transaction history email sent." : "Failed to send transaction history email."
        )
      });
    } catch (error) {
      setNotice({ type: "error", text: "Unable to reach the transaction service." });
    } finally {
      setEmailingHistory(false);
    }
  };

  const formatAmount = (amount) =>
    `\u20B9${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const formatDateTime = (date) =>
    new Date(date).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

  const getImpactMeta = (impactType) => {
    if (impactType === "DEBIT") {
      return {
        amountColor: "#fca5a5",
        badgeBg: "rgba(239, 68, 68, 0.14)",
        badgeColor: "#f87171",
        badgeBorder: "rgba(239, 68, 68, 0.3)",
        gradient: "linear-gradient(135deg, #ef4444, #dc2626)",
        prefix: "-"
      };
    }

    if (impactType === "INTERNAL") {
      return {
        amountColor: "#fcd34d",
        badgeBg: "rgba(245, 158, 11, 0.16)",
        badgeColor: "#fbbf24",
        badgeBorder: "rgba(245, 158, 11, 0.3)",
        gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
        prefix: ""
      };
    }

    return {
      amountColor: "#6ee7b7",
      badgeBg: "rgba(16, 185, 129, 0.14)",
      badgeColor: "#34d399",
      badgeBorder: "rgba(16, 185, 129, 0.3)",
      gradient: "linear-gradient(135deg, #10b981, #059669)",
      prefix: "+"
    };
  };

  const getStatusBadge = (status) => {
    if (status === "SUCCESS") {
      return { bg: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "rgba(16, 185, 129, 0.3)" };
    }
    if (status === "FAILED") {
      return { bg: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "rgba(239, 68, 68, 0.3)" };
    }
    return { bg: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" };
  };

  const groupedTransactions = Object.entries(
    transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.dateTime).toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric"
      });
      const today = new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric"
      });
      const key = date === today ? "Today" : date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(transaction);
      return acc;
    }, {})
  );

  const closeModal = () => setSelectedTransaction(null);

  return (
    <div style={{ padding: "40px 40px" }}>
      <div className="container" style={{ maxWidth: "1040px", margin: "0 auto" }}>
        <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: "#0f172a", letterSpacing: "-0.5px" }}>
              Transaction History
            </h2>
            <p style={{ color: "#64748b", margin: 0 }}>
              Review your wallet activity. History is synced asynchronously and will catch up automatically after service recovery.
            </p>
          </div>

          <button
            className="btn fw-semibold"
            onClick={sendHistoryEmail}
            disabled={emailingHistory || loading || Boolean(historyNotice)}
            style={{
              background:
                emailingHistory || historyNotice
                  ? "rgba(59, 130, 246, 0.18)"
                  : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "12px 18px",
              minWidth: "190px",
              boxShadow: "0 14px 28px rgba(29, 78, 216, 0.25)"
            }}
          >
            {historyNotice ? "History Service Offline" : emailingHistory ? "Sending..." : "Email My History"}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-100"
          style={{
            background: "#ffffff",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: "24px",
            padding: "30px",
            boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)",
            border: "1px solid #dbe4ef"
          }}
        >
          {notice.text ? (
            <div
              className="mb-4"
              style={{
                background: notice.type === "success" ? "rgba(16, 185, 129, 0.14)" : "rgba(239, 68, 68, 0.14)",
                color: notice.type === "success" ? "#86efac" : "#fca5a5",
                border: `1px solid ${notice.type === "success" ? "rgba(16, 185, 129, 0.24)" : "rgba(239, 68, 68, 0.24)"}`,
                borderRadius: "14px",
                padding: "14px 16px"
              }}
            >
              {notice.text}
            </div>
          ) : null}

          {historyNotice ? (
            <div
              className="mb-4"
              style={{
                background: "rgba(245, 158, 11, 0.14)",
                color: "#b45309",
                border: "1px solid rgba(245, 158, 11, 0.24)",
                borderRadius: "14px",
                padding: "14px 16px"
              }}
            >
              {historyNotice}
            </div>
          ) : null}

          {loading ? (
            <div className="text-center py-5" style={{ color: "#0f172a" }}>
              <div className="spinner-border mb-3" style={{ color: "#3b82f6" }} role="status"></div>
              <p>Loading history...</p>
            </div>
          ) : message ? (
            <div className="text-center py-5">
              <div
                className="alert mx-auto"
                style={{
                  maxWidth: "420px",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#f87171",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "12px"
                }}
              >
                {message}
              </div>
            </div>
          ) : historyNotice && transactions.length === 0 ? (
            <div className="text-center py-5">
              <div style={{ fontSize: "50px", color: "#fbbf24", marginBottom: "15px" }}>Sync</div>
              <h5 className="fw-semibold" style={{ color: "#0f172a" }}>History Sync In Progress</h5>
              <p style={{ color: "#64748b", maxWidth: "460px", margin: "0 auto" }}>
                Transfers and wallet updates can still complete while the transaction history service is offline.
                This page retries automatically and will show the queued entries when the service comes back online.
              </p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="transaction-list">
              {groupedTransactions.map(([dateGroup, items]) => (
                <div key={dateGroup} className="mb-4">
                  <h6
                    className="fw-semibold mb-3"
                    style={{
                      color: "#64748b",
                      textTransform: "uppercase",
                      fontSize: "12px",
                      letterSpacing: "1px",
                      borderBottom: "1px solid #e2e8f0",
                      paddingBottom: "10px"
                    }}
                  >
                    {dateGroup}
                  </h6>

                  <div className="d-flex flex-column gap-2">
                    {items.map((transaction, index) => {
                      const impactMeta = getImpactMeta(transaction.impactType);
                      const statusInfo = getStatusBadge(transaction.status);
                      const badgeText = transaction.impactLabel || "Transaction";
                      const initials = (transaction.typeLabel || "T").charAt(0).toUpperCase();

                      return (
                        <motion.button
                          key={transaction.id || index}
                          type="button"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ background: "#f8fbff", scale: 1.01 }}
                          onClick={() => setSelectedTransaction(transaction)}
                          style={{
                            background: "#f8fafc",
                            borderRadius: "16px",
                            padding: "16px 20px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            border: "1px solid #e2e8f0",
                            transition: "all 0.2s",
                            width: "100%",
                            textAlign: "left"
                          }}
                        >
                          <div className="d-flex align-items-center">
                            <div
                              style={{
                                width: "50px",
                                height: "50px",
                                borderRadius: "14px",
                                background: impactMeta.gradient,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: "16px",
                                color: "white",
                                fontSize: "20px",
                                fontWeight: 700,
                                boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
                              }}
                            >
                              {initials}
                            </div>

                            <div>
                              <p className="mb-0 fw-bold fs-6" style={{ color: "#0f172a" }}>{transaction.summary}</p>
                              <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                                <small style={{ color: "#64748b", fontSize: "13px" }}>{transaction.detailLine}</small>
                                <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#475569" }}></span>
                                <small style={{ color: "#64748b", fontSize: "12px" }}>
                                  {new Date(transaction.dateTime).toLocaleTimeString(undefined, {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </small>
                              </div>
                            </div>
                          </div>

                          <div className="text-end">
                            <div
                              className="fw-bold mb-1"
                              style={{
                                color: impactMeta.amountColor,
                                fontSize: "18px",
                                letterSpacing: "-0.5px"
                              }}
                            >
                              {impactMeta.prefix}
                              {formatAmount(transaction.amount)}
                            </div>
                            <div className="d-flex justify-content-end gap-2 flex-wrap">
                              <span
                                className="px-2 py-1 fw-bold"
                                style={{
                                  fontSize: "10px",
                                  borderRadius: "8px",
                                  background: impactMeta.badgeBg,
                                  color: impactMeta.badgeColor,
                                  border: `1px solid ${impactMeta.badgeBorder}`,
                                  letterSpacing: "0.5px",
                                  textTransform: "uppercase"
                                }}
                              >
                                {badgeText}
                              </span>
                              <span
                                className="px-2 py-1 fw-bold"
                                style={{
                                  fontSize: "10px",
                                  borderRadius: "8px",
                                  background: statusInfo.bg,
                                  color: statusInfo.color,
                                  border: `1px solid ${statusInfo.border}`,
                                  letterSpacing: "0.5px",
                                  textTransform: "uppercase"
                                }}
                              >
                                {transaction.status}
                              </span>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <div style={{ fontSize: "50px", color: "#cbd5e1", marginBottom: "15px" }}>History</div>
              <h5 className="fw-semibold" style={{ color: "#0f172a" }}>No Transactions Yet</h5>
              <p style={{ color: "#64748b" }}>
                Your activity will appear here once you make a transfer, deposit, or withdrawal.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedTransaction ? (
          <div
            className="modal d-flex align-items-center justify-content-center"
            style={{
              background: "rgba(0,0,0,0.6)",
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1050,
              backdropFilter: "blur(6px)",
              padding: "20px"
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                width: "100%",
                maxWidth: "560px",
                background: "#0f172a",
                borderRadius: "24px",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
                overflow: "hidden"
              }}
            >
              <div
                className="d-flex justify-content-between align-items-start"
                style={{
                  padding: "24px 24px 18px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)"
                }}
              >
                <div>
                  <p
                    style={{
                      color: "#60a5fa",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      fontSize: "12px",
                      marginBottom: "8px"
                    }}
                  >
                    Transaction Details
                  </p>
                  <h4 className="fw-bold text-white m-0">{selectedTransaction.summary}</h4>
                </div>
                <button
                  className="btn btn-sm"
                  style={{
                    color: "#94a3b8",
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    border: "none"
                  }}
                  onClick={closeModal}
                >
                  X
                </button>
              </div>

              <div style={{ padding: "24px" }}>
                <p style={{ color: "#cbd5e1", marginBottom: "20px" }}>{selectedTransaction.description}</p>

                <div className="row g-3">
                  {[
                    { label: "Transaction ID", value: selectedTransaction.id || "NA" },
                    { label: "Category", value: selectedTransaction.typeLabel || selectedTransaction.type || "NA" },
                    { label: "Amount", value: formatAmount(selectedTransaction.amount) },
                    { label: "Credit / Debit", value: selectedTransaction.impactLabel || "NA" },
                    { label: "From", value: selectedTransaction.fromLabel || "NA" },
                    { label: "To", value: selectedTransaction.toLabel || "NA" },
                    { label: "Status", value: selectedTransaction.status || "NA" },
                    { label: "Date & Time", value: formatDateTime(selectedTransaction.dateTime) }
                  ].map((item) => (
                    <div className="col-12 col-md-6" key={item.label}>
                      <div
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "16px",
                          padding: "16px"
                        }}
                      >
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.8px",
                            marginBottom: "8px"
                          }}
                        >
                          {item.label}
                        </div>
                        <div style={{ color: "#fff", fontWeight: 600, wordBreak: "break-word" }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: "20px",
                    background: "rgba(37, 99, 235, 0.12)",
                    border: "1px solid rgba(59, 130, 246, 0.18)",
                    borderRadius: "16px",
                    padding: "16px"
                  }}
                >
                  <div
                    style={{
                      color: "#93c5fd",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      marginBottom: "8px"
                    }}
                  >
                    Movement Summary
                  </div>
                  <div style={{ color: "#dbeafe", fontWeight: 600 }}>{selectedTransaction.detailLine}</div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default Transactions;
