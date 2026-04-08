import React, { useEffect, useMemo, useState } from "react";
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
        setHistoryNotice("History offline. New entries will appear after sync resumes.");
      } else {
        setMessage(extractErrorMessage(data, "Failed to load transactions."));
        setHistoryNotice("");
      }
    } catch (error) {
      setMessage("");
      setHistoryNotice("History offline. New entries will appear after sync resumes.");
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

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort(
        (left, right) => new Date(right.dateTime).getTime() - new Date(left.dateTime).getTime()
      ),
    [transactions]
  );

  const formatAmount = (amount) =>
    `Rs ${Number(amount || 0).toLocaleString("en-IN", {
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
        amountColor: "#dc2626",
        badgeBg: "rgba(239, 68, 68, 0.12)",
        badgeColor: "#b91c1c",
        badgeBorder: "rgba(239, 68, 68, 0.18)",
        iconBg: "rgba(239, 68, 68, 0.14)",
        iconColor: "#dc2626",
        prefix: "-"
      };
    }

    if (impactType === "INTERNAL") {
      return {
        amountColor: "#b45309",
        badgeBg: "rgba(245, 158, 11, 0.14)",
        badgeColor: "#b45309",
        badgeBorder: "rgba(245, 158, 11, 0.2)",
        iconBg: "rgba(245, 158, 11, 0.14)",
        iconColor: "#d97706",
        prefix: ""
      };
    }

    return {
      amountColor: "#059669",
      badgeBg: "rgba(16, 185, 129, 0.12)",
      badgeColor: "#047857",
      badgeBorder: "rgba(16, 185, 129, 0.18)",
      iconBg: "rgba(16, 185, 129, 0.12)",
      iconColor: "#059669",
      prefix: "+"
    };
  };

  const getStatusBadge = (status) => {
    if (status === "SUCCESS") {
      return { bg: "rgba(16, 185, 129, 0.12)", color: "#047857", border: "rgba(16, 185, 129, 0.18)" };
    }
    if (status === "FAILED") {
      return { bg: "rgba(239, 68, 68, 0.12)", color: "#b91c1c", border: "rgba(239, 68, 68, 0.18)" };
    }
    return { bg: "rgba(245, 158, 11, 0.12)", color: "#b45309", border: "rgba(245, 158, 11, 0.18)" };
  };

  return (
    <div style={{ padding: "40px 20px" }}>
      <div className="container" style={{ maxWidth: "1080px", margin: "0 auto" }}>
        <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: "#0f172a", letterSpacing: "-0.6px" }}>
              Process History
            </h2>
            <p style={{ color: "#64748b", margin: 0 }}>
              Latest activity first, with exact time for every wallet event.
            </p>
          </div>

          <button
            className="btn fw-semibold"
            onClick={sendHistoryEmail}
            disabled={emailingHistory || loading || Boolean(historyNotice)}
            style={{
              background:
                emailingHistory || historyNotice
                  ? "rgba(59, 130, 246, 0.14)"
                  : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#fff",
              border: "none",
              borderRadius: "14px",
              padding: "12px 18px",
              minWidth: "190px",
              boxShadow: "0 12px 24px rgba(37, 99, 235, 0.2)"
            }}
          >
            {historyNotice ? "History Offline" : emailingHistory ? "Sending..." : "Email My History"}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            background: "#ffffff",
            borderRadius: "28px",
            padding: "28px",
            boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)",
            border: "1px solid #dbe4ef"
          }}
        >
          {notice.text ? (
            <div
              className="mb-4"
              style={{
                background: notice.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.1)",
                color: notice.type === "success" ? "#047857" : "#b91c1c",
                border: `1px solid ${notice.type === "success" ? "rgba(16, 185, 129, 0.18)" : "rgba(239, 68, 68, 0.18)"}`,
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
                background: "rgba(245, 158, 11, 0.12)",
                color: "#b45309",
                border: "1px solid rgba(245, 158, 11, 0.18)",
                borderRadius: "14px",
                padding: "14px 16px"
              }}
            >
              {historyNotice}
            </div>
          ) : null}

          {loading ? (
            <div className="text-center py-5" style={{ color: "#0f172a" }}>
              <div className="spinner-border mb-3" style={{ color: "#2563eb" }} role="status"></div>
              <p className="mb-0">Loading history...</p>
            </div>
          ) : message ? (
            <div className="text-center py-5">
              <div
                className="alert mx-auto"
                style={{
                  maxWidth: "420px",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#b91c1c",
                  border: "1px solid rgba(239, 68, 68, 0.18)",
                  borderRadius: "14px"
                }}
              >
                {message}
              </div>
            </div>
          ) : historyNotice && sortedTransactions.length === 0 ? (
            <div className="text-center py-5">
              <h5 className="fw-semibold" style={{ color: "#0f172a" }}>History Sync Pending</h5>
              <p style={{ color: "#64748b", maxWidth: "420px", margin: "0 auto" }}>
                Transfers can still complete. Records will show up here automatically when sync resumes.
              </p>
            </div>
          ) : sortedTransactions.length > 0 ? (
            <div className="d-flex flex-column gap-3">
              {sortedTransactions.map((transaction, index) => {
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
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ y: -1, background: "#f8fbff" }}
                    onClick={() => setSelectedTransaction(transaction)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      borderRadius: "20px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      padding: "18px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "16px"
                    }}
                  >
                    <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                      <div
                        style={{
                          width: "54px",
                          height: "54px",
                          borderRadius: "16px",
                          background: impactMeta.iconBg,
                          color: impactMeta.iconColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "22px",
                          fontWeight: 800,
                          marginRight: "16px",
                          flexShrink: 0
                        }}
                      >
                        {initials}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div className="fw-bold" style={{ color: "#0f172a" }}>{transaction.summary}</div>
                        <div style={{ color: "#475569", fontSize: "14px", marginTop: "4px" }}>{transaction.detailLine}</div>
                        <div style={{ color: "#64748b", fontSize: "12px", marginTop: "6px" }}>
                          {formatDateTime(transaction.dateTime)}
                        </div>
                      </div>
                    </div>

                    <div className="text-end" style={{ flexShrink: 0 }}>
                      <div
                        className="fw-bold"
                        style={{
                          color: impactMeta.amountColor,
                          fontSize: "18px",
                          letterSpacing: "-0.4px"
                        }}
                      >
                        {impactMeta.prefix}
                        {formatAmount(transaction.amount)}
                      </div>
                      <div className="d-flex justify-content-end gap-2 flex-wrap mt-2">
                        <span
                          className="px-2 py-1 fw-bold"
                          style={{
                            fontSize: "10px",
                            borderRadius: "999px",
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
                            borderRadius: "999px",
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
          ) : (
            <div className="text-center py-5">
              <h5 className="fw-semibold" style={{ color: "#0f172a" }}>No Transactions Yet</h5>
              <p style={{ color: "#64748b", marginBottom: 0 }}>
                Your activity will appear here after you make a transfer, deposit, or withdrawal.
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
              background: "rgba(15,23,42,0.55)",
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
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              style={{
                width: "100%",
                maxWidth: "640px",
                background: "#ffffff",
                borderRadius: "28px",
                border: "1px solid #dbe4ef",
                boxShadow: "0 28px 64px rgba(15,23,42,0.24)",
                overflow: "hidden"
              }}
            >
              <div
                className="d-flex justify-content-between align-items-start"
                style={{
                  padding: "24px 24px 18px",
                  borderBottom: "1px solid #e2e8f0"
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#2563eb",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      fontSize: "12px",
                      marginBottom: "8px"
                    }}
                  >
                    Transaction Details
                  </div>
                  <h4 className="fw-bold m-0" style={{ color: "#0f172a" }}>
                    Record #{selectedTransaction.id || "NA"}
                  </h4>
                </div>
                <button
                  className="btn btn-sm"
                  style={{
                    color: "#64748b",
                    background: "#f8fafc",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    border: "none"
                  }}
                  onClick={() => setSelectedTransaction(null)}
                >
                  X
                </button>
              </div>

              <div style={{ padding: "24px" }}>
                <div className="row g-3">
                  {[
                    { label: "Type", value: selectedTransaction.typeLabel || selectedTransaction.type || "NA" },
                    { label: "Amount", value: formatAmount(selectedTransaction.amount) },
                    { label: "Impact", value: selectedTransaction.impactLabel || "NA" },
                    { label: "Status", value: selectedTransaction.status || "NA" },
                    { label: "From", value: selectedTransaction.fromLabel || "NA" },
                    { label: "To", value: selectedTransaction.toLabel || "NA" },
                    { label: "Route", value: selectedTransaction.detailLine || "NA" },
                    { label: "Date & Time", value: formatDateTime(selectedTransaction.dateTime) }
                  ].map((item) => (
                    <div className="col-12 col-md-6" key={item.label}>
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "18px",
                          padding: "16px",
                          height: "100%"
                        }}
                      >
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.8px",
                            marginBottom: "8px"
                          }}
                        >
                          {item.label}
                        </div>
                        <div style={{ color: "#0f172a", fontWeight: 600, wordBreak: "break-word" }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
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
