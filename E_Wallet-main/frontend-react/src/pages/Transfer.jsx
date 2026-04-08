import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { apiUrl } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";
import { sanitizeUsername, validateSelfTransfer, validateUserTransfer } from "../utils/validation";

function Transfer() {
  const [mode, setMode] = useState("self");
  const [accounts, setAccounts] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWalletBalance, setLoadingWalletBalance] = useState(true);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [receiverUsername, setReceiverUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const currentUsername = localStorage.getItem("username") || "";

  useEffect(() => {
    if (!token || !userId || userId === "undefined") {
      localStorage.clear();
      navigate("/");
      return;
    }

    const loadData = async () => {
      try {
        const [accountsResponse, walletResponse] = await Promise.all([
          fetch(apiUrl("/accounts"), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl("/wallet/balance"), {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const accountsData = await readResponsePayload(accountsResponse);
        const walletData = await readResponsePayload(walletResponse);

        if (accountsResponse.ok) {
          setAccounts(Array.isArray(accountsData) ? accountsData : []);
        } else {
          setMessage(extractErrorMessage(accountsData, "Unable to load linked bank accounts."));
        }

        if (walletResponse.ok) {
          setWalletBalance(Number(walletData.balance || 0));
        } else {
          setMessage((current) => current || extractErrorMessage(walletData, "Unable to load wallet balance."));
        }
      } catch (error) {
        console.error(error);
        setMessage("Unable to load transfer data.");
      } finally {
        setLoadingWalletBalance(false);
      }
    };

    loadData();
  }, [navigate, token, userId]);

  const handleSelfTransfer = async (event) => {
    event.preventDefault();
    setMessage("");

    const validationError = validateSelfTransfer({ fromAccount, toAccount, amount });
    if (validationError) {
      setMessage(validationError);
      return;
    }

    try {
      const response = await fetch(apiUrl("/wallet/transfer/self"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fromAccountId: Number(fromAccount),
          toAccountId: Number(toAccount),
          amount: Number(amount)
        })
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        setMessage(extractErrorMessage(data, "Transfer failed"));
        return;
      }

      setMessage("Transfer successful. History will update automatically.");
      setAmount("");
    } catch (error) {
      console.error(error);
      setMessage("Unable to reach the transfer service");
    }
  };

  const handlePeerTransfer = async (event) => {
    event.preventDefault();
    setMessage("");

    const validationError = validateUserTransfer({
      receiverUsername,
      amount,
      currentUsername
    });
    if (validationError) {
      setMessage(validationError);
      return;
    }

    const normalizedReceiverUsername = sanitizeUsername(receiverUsername);

    try {
      const response = await fetch(apiUrl("/wallet/transfer/user"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverUsername: normalizedReceiverUsername,
          amount: Number(amount)
        })
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        setMessage(extractErrorMessage(data, "Transfer failed"));
        return;
      }

      setMessage(
        `Payment sent to @${data.receiverUsername}. Transaction #${data.transactionId}. History will sync automatically.`
      );
      setWalletBalance(Number(data.remainingWalletBalance || 0));
      setAmount("");
      setReceiverUsername("");
    } catch (error) {
      console.error(error);
      setMessage("Unable to reach the transfer service");
    }
  };

  const inputStyle = {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    color: "#0f172a",
    borderRadius: "12px",
    padding: "12px 16px",
    transition: "all 0.3s ease",
    boxShadow: "inset 0 2px 4px rgba(148,163,184,0.12)",
    width: "100%"
  };

  const labelStyle = {
    color: "#334155",
    fontSize: "13px",
    fontWeight: "500",
    marginBottom: "6px",
    display: "block"
  };

  const isSuccessMessage =
    message.toLowerCase().includes("payment sent") || message.toLowerCase().includes("transfer successful");

  return (
    <div style={{ padding: "40px 20px", display: "flex", justifyContent: "center" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          width: "100%",
          maxWidth: "500px",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)",
          border: "1px solid #dbe4ef"
        }}
      >
        <div className="mb-4 text-center">
          <h3 className="fw-bold mb-0" style={{ color: "#0f172a", letterSpacing: "-0.5px" }}>
            Transfer
          </h3>
          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
            Send money or move funds between your own accounts.
          </p>
        </div>

        <div
          className="d-flex mb-4 p-1"
          style={{
            background: "#f8fafc",
            borderRadius: "14px",
            border: "1px solid #e2e8f0"
          }}
        >
          <button
            type="button"
            className="btn w-50 fw-semibold"
            style={{
              background: mode === "peer" ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "transparent",
              color: mode === "peer" ? "#fff" : "#64748b",
              borderRadius: "10px",
              border: "none"
            }}
            onClick={() => {
              setMode("peer");
              setMessage("");
            }}
          >
            Send to User
          </button>
          <button
            type="button"
            className="btn w-50 fw-semibold"
            style={{
              background: mode === "self" ? "linear-gradient(135deg, #10b981, #059669)" : "transparent",
              color: mode === "self" ? "#fff" : "#64748b",
              borderRadius: "10px",
              border: "none"
            }}
            onClick={() => {
              setMode("self");
              setMessage("");
            }}
          >
            Self Transfer
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === "peer" ? (
            <motion.form
              key="peer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handlePeerTransfer}
            >
              <div
                className="mb-4 p-3"
                style={{
                  background: "#f8fafc",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0"
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span style={{ color: "#64748b", fontSize: "13px", fontWeight: "600" }}>Wallet Balance</span>
                  <span className="fw-bold" style={{ color: "#0f172a" }}>
                    {loadingWalletBalance
                      ? "Loading..."
                      : `Rs ${walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
                <small style={{ color: "#64748b", fontSize: "12px", lineHeight: "1.5" }}>
                  Payments are sent from your wallet to another user and recorded in transaction history.
                </small>
              </div>

              <div className="mb-3">
                <label style={labelStyle}>Recipient Username</label>
                <div className="input-group">
                  <span
                    className="input-group-text"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRight: "none",
                      color: "#64748b"
                    }}
                  >
                    @
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="username"
                    value={receiverUsername}
                    onChange={(event) => setReceiverUsername(event.target.value.replace(/\s+/g, ""))}
                    style={{
                      ...inputStyle,
                      borderLeft: "none",
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0
                    }}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label style={labelStyle}>Amount</label>
                <div className="input-group">
                  <span
                    className="input-group-text"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRight: "none",
                      color: "#64748b"
                    }}
                  >
                    Rs
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    style={{
                      ...inputStyle,
                      borderLeft: "none",
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      fontSize: "20px",
                      fontWeight: "bold",
                      letterSpacing: "1px"
                    }}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn w-100 fw-semibold mb-3"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                  color: "#fff",
                  padding: "16px",
                  borderRadius: "14px",
                  border: "none",
                  boxShadow: "0 8px 25px rgba(139, 92, 246, 0.4)",
                  fontSize: "16px"
                }}
              >
                Send Secure Payment
              </motion.button>
            </motion.form>
          ) : (
            <motion.form
              key="self"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSelfTransfer}
            >
              <div className="mb-3">
                <label style={labelStyle}>From Account</label>
                <select
                  className="form-select"
                  style={{
                    ...inputStyle,
                    cursor: "pointer",
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 6l4 4 4-4'/%3e%3c/svg%3e\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 1rem center",
                    backgroundSize: "16px 12px"
                  }}
                  value={fromAccount}
                  onChange={(event) => setFromAccount(event.target.value)}
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} - **** {account.cardNumber?.slice(-4)} - Rs {Number(account.balance || 0).toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label style={labelStyle}>To Account</label>
                <select
                  className="form-select"
                  style={{
                    ...inputStyle,
                    cursor: "pointer",
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 6l4 4 4-4'/%3e%3c/svg%3e\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 1rem center",
                    backgroundSize: "16px 12px"
                  }}
                  value={toAccount}
                  onChange={(event) => setToAccount(event.target.value)}
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} - **** {account.cardNumber?.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label style={labelStyle}>Amount</label>
                <div className="input-group">
                  <span
                    className="input-group-text"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRight: "none",
                      color: "#64748b"
                    }}
                  >
                    Rs
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="form-control"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    style={{
                      ...inputStyle,
                      borderLeft: "none",
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0
                    }}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn w-100 fw-semibold mb-3"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  color: "#fff",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 8px 20px rgba(59, 130, 246, 0.3)",
                  fontSize: "16px"
                }}
              >
                Transfer Now
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {message ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 text-center mt-3"
            style={{
              background: isSuccessMessage ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
              color: isSuccessMessage ? "#047857" : "#b91c1c",
              border: `1px solid ${isSuccessMessage ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            {message}
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  );
}

export default Transfer;
