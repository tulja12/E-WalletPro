import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { apiUrl } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";
import {
  sanitizePin,
  sanitizeUsername,
  validateAccountPin,
  validateSelfTransfer,
  validateUserTransfer
} from "../utils/validation";

const cardGradients = [
  "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
  "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #581c87 100%)"
];

const formatCurrency = (value) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const maskCard = (cardNumber) => `**** ${String(cardNumber || "").slice(-4) || "0000"}`;

function Transfer() {
  const [mode, setMode] = useState("self");
  const [accounts, setAccounts] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWalletBalance, setLoadingWalletBalance] = useState(true);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [sourcePin, setSourcePin] = useState("");
  const [receiverUsername, setReceiverUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const currentUsername = localStorage.getItem("username") || "";

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

  useEffect(() => {
    if (!token || !userId || userId === "undefined") {
      localStorage.clear();
      navigate("/");
      return;
    }

    loadData();
  }, [navigate, token, userId]);

  const selectedFromAccount = useMemo(
    () => accounts.find((account) => String(account.id) === String(fromAccount)) || null,
    [accounts, fromAccount]
  );

  const selectedToAccount = useMemo(
    () => accounts.find((account) => String(account.id) === String(toAccount)) || null,
    [accounts, toAccount]
  );

  const handleSelfTransfer = async (event) => {
    event.preventDefault();
    setMessage("");

    const validationError = validateSelfTransfer({ fromAccount, toAccount, amount });
    if (validationError) {
      setMessage(validationError);
      return;
    }

    const pinError = validateAccountPin(sourcePin, "Source card PIN");
    if (pinError) {
      setMessage(pinError);
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
          pin: sourcePin,
          amount: Number(amount)
        })
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        setMessage(extractErrorMessage(data, "Transfer failed"));
        return;
      }

      setMessage("Transfer successful. History will sync automatically.");
      setAmount("");
      setSourcePin("");
      await loadData();
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
        `Payment sent to @${data.receiverUsername}. Transaction #${data.transactionId}. History syncs automatically.`
      );
      setWalletBalance(Number(data.remainingWalletBalance || 0));
      setAmount("");
      setReceiverUsername("");
    } catch (error) {
      console.error(error);
      setMessage("Unable to reach the transfer service");
    }
  };

  const isSuccessMessage =
    message.toLowerCase().includes("payment sent") || message.toLowerCase().includes("transfer successful");

  const cardButtonStyle = (selected, disabled, gradient) => ({
    width: "100%",
    textAlign: "left",
    border: selected ? "2px solid #93c5fd" : "1px solid rgba(255,255,255,0.08)",
    borderRadius: "22px",
    padding: "20px",
    color: "#ffffff",
    background: gradient,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: selected
      ? "0 20px 36px rgba(37, 99, 235, 0.24)"
      : "0 18px 34px rgba(15, 23, 42, 0.24)"
  });

  return (
    <div style={{ padding: "40px 20px" }}>
      <div className="container" style={{ maxWidth: "1260px", margin: "0 auto" }}>
        <div className="mb-4">
          <h2 className="fw-bold mb-1" style={{ color: "#0f172a", letterSpacing: "-0.7px" }}>
            Transfer Funds
          </h2>
          <p style={{ color: "#64748b", margin: 0 }}>
            Move money between your linked accounts or send a wallet payment to another user.
          </p>
        </div>

        <div
          className="d-flex mb-4 p-1"
          style={{
            background: "#f8fafc",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            maxWidth: "380px"
          }}
        >
          <button
            type="button"
            className="btn w-50 fw-semibold"
            style={{
              background: mode === "self" ? "linear-gradient(135deg, #10b981, #059669)" : "transparent",
              color: mode === "self" ? "#fff" : "#64748b",
              borderRadius: "12px",
              border: "none"
            }}
            onClick={() => {
              setMode("self");
              setMessage("");
            }}
          >
            Self Transfer
          </button>
          <button
            type="button"
            className="btn w-50 fw-semibold"
            style={{
              background: mode === "peer" ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "transparent",
              color: mode === "peer" ? "#fff" : "#64748b",
              borderRadius: "12px",
              border: "none"
            }}
            onClick={() => {
              setMode("peer");
              setMessage("");
            }}
          >
            Send to User
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === "peer" ? (
            <motion.div
              key="peer"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 18 }}
              className="row g-4"
            >
              <div className="col-lg-7">
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "28px",
                    padding: "28px",
                    border: "1px solid #dbe4ef",
                    boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)"
                  }}
                >
                  <h5 className="fw-bold mb-1" style={{ color: "#0f172a" }}>Send from Wallet</h5>
                  <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "14px" }}>
                    Wallet-to-user payments do not require a bank account selection.
                  </p>

                  <form onSubmit={handlePeerTransfer}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold" style={{ color: "#334155", fontSize: "13px" }}>
                        Recipient Username
                      </label>
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
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#0f172a",
                            borderRadius: "12px",
                            padding: "12px 16px",
                            boxShadow: "inset 0 2px 4px rgba(148,163,184,0.12)",
                            borderLeft: "none",
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0
                          }}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold" style={{ color: "#334155", fontSize: "13px" }}>
                        Amount
                      </label>
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
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#0f172a",
                            borderRadius: "12px",
                            padding: "12px 16px",
                            boxShadow: "inset 0 2px 4px rgba(148,163,184,0.12)",
                            borderLeft: "none",
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            fontSize: "20px",
                            fontWeight: 700
                          }}
                        />
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="btn w-100 fw-semibold"
                      style={{
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        color: "#fff",
                        padding: "15px",
                        borderRadius: "14px",
                        border: "none",
                        boxShadow: "0 10px 24px rgba(37, 99, 235, 0.28)"
                      }}
                    >
                      Send Payment
                    </motion.button>
                  </form>
                </div>
              </div>

              <div className="col-lg-5">
                <div
                  style={{
                    background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)",
                    borderRadius: "28px",
                    padding: "28px",
                    color: "#fff",
                    minHeight: "100%",
                    boxShadow: "0 24px 56px rgba(15, 23, 42, 0.28)"
                  }}
                >
                  <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1.2px", color: "#93c5fd" }}>
                    Wallet Balance
                  </div>
                  <div className="fw-bold mt-2" style={{ fontSize: "40px", letterSpacing: "-1px" }}>
                    {loadingWalletBalance ? "Loading..." : formatCurrency(walletBalance)}
                  </div>

                  <div
                    className="mt-4"
                    style={{
                      borderRadius: "18px",
                      padding: "18px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)"
                    }}
                  >
                    <div className="fw-semibold mb-2">Transfer Note</div>
                    <p className="mb-0" style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.6" }}>
                      The payment is applied immediately from the wallet. Process history updates automatically after sync.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="self"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              className="row g-4 align-items-start"
            >
              <div className="col-lg-4">
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "28px",
                    padding: "28px",
                    border: "1px solid #dbe4ef",
                    boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)"
                  }}
                >
                  <div className="mb-3">
                    <h5 className="fw-bold mb-1" style={{ color: "#0f172a" }}>From</h5>
                    <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                      Choose the source account.
                    </p>
                  </div>
                  <div className="d-flex flex-column gap-3">
                    {accounts.map((account, index) => {
                      const selected = String(fromAccount) === String(account.id);

                      return (
                        <motion.button
                          key={`from-${account.id}`}
                          type="button"
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => {
                            setFromAccount(String(account.id));
                            setSourcePin("");
                            setMessage("");
                          }}
                          style={cardButtonStyle(selected, false, cardGradients[index % cardGradients.length])}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.64)" }}>
                                {account.bankName}
                              </div>
                              <div className="fw-bold mt-2" style={{ fontSize: "22px" }}>{maskCard(account.cardNumber)}</div>
                            </div>
                            <span style={{ fontSize: "12px", color: "#bfdbfe", fontWeight: 700 }}>
                              {selected ? "Selected" : ""}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between align-items-end">
                            <div>
                              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.64)" }}>
                                Balance
                              </div>
                              <div className="fw-semibold">{formatCurrency(account.balance)}</div>
                            </div>
                            <div style={{ color: account.pinConfigured ? "#a7f3d0" : "#fde68a", fontSize: "12px", fontWeight: 600 }}>
                              {account.pinConfigured ? "PIN ready" : "PIN missing"}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div
                  style={{
                    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                    borderRadius: "28px",
                    padding: "28px",
                    border: "1px solid #dbe4ef",
                    boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)"
                  }}
                >
                  <h5 className="fw-bold mb-1 text-center" style={{ color: "#0f172a" }}>Transfer Details</h5>
                  <p className="text-center" style={{ color: "#64748b", marginBottom: "24px", fontSize: "14px" }}>
                    Enter the amount, review the route, and authorize with the source account PIN.
                  </p>

                  <form onSubmit={handleSelfTransfer}>
                    <div
                      className="mb-4"
                      style={{
                        borderRadius: "22px",
                        border: "1px solid #dbe4ef",
                        background: "#ffffff",
                        padding: "18px",
                        boxShadow: "0 14px 28px rgba(148, 163, 184, 0.1)"
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <div style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            Route
                          </div>
                          <div className="fw-semibold mt-1" style={{ color: "#0f172a" }}>
                            {selectedFromAccount ? `${selectedFromAccount.bankName} ${maskCard(selectedFromAccount.cardNumber)}` : "Choose source"}
                          </div>
                        </div>
                        {selectedFromAccount ? (
                          <span style={{ color: selectedFromAccount.pinConfigured ? "#047857" : "#b45309", fontSize: "12px", fontWeight: 700 }}>
                            {selectedFromAccount.pinConfigured ? "PIN ready" : "PIN missing"}
                          </span>
                        ) : null}
                      </div>

                      <div
                        className="d-flex align-items-center justify-content-center"
                        style={{ color: "#2563eb", fontWeight: 700, marginBottom: "10px", letterSpacing: "1px" }}
                      >
                        TO
                      </div>

                      <div className="fw-semibold" style={{ color: "#0f172a" }}>
                        {selectedToAccount ? `${selectedToAccount.bankName} ${maskCard(selectedToAccount.cardNumber)}` : "Choose destination"}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold" style={{ color: "#334155", fontSize: "13px" }}>
                        Amount
                      </label>
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
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#0f172a",
                            borderRadius: "12px",
                            padding: "12px 16px",
                            boxShadow: "inset 0 2px 4px rgba(148,163,184,0.12)",
                            borderLeft: "none",
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            fontSize: "18px",
                            fontWeight: 700
                          }}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold" style={{ color: "#334155", fontSize: "13px" }}>
                        Source Account PIN
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        className="form-control"
                        placeholder="Enter 4-digit PIN"
                        value={sourcePin}
                        onChange={(event) => setSourcePin(sanitizePin(event.target.value))}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          color: "#0f172a",
                          borderRadius: "12px",
                          padding: "12px 16px",
                          boxShadow: "inset 0 2px 4px rgba(148,163,184,0.12)"
                        }}
                      />
                      <small className="d-block mt-2" style={{ color: "#64748b" }}>
                        Only the source account PIN is required.
                      </small>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      disabled={!selectedFromAccount?.pinConfigured}
                      className="btn w-100 fw-semibold"
                      style={{
                        background: selectedFromAccount?.pinConfigured
                          ? "linear-gradient(135deg, #10b981, #059669)"
                          : "#e2e8f0",
                        color: selectedFromAccount?.pinConfigured ? "#fff" : "#64748b",
                        padding: "14px",
                        borderRadius: "14px",
                        border: "none",
                        boxShadow: selectedFromAccount?.pinConfigured
                          ? "0 10px 24px rgba(16, 185, 129, 0.28)"
                          : "none"
                      }}
                    >
                      Transfer Now
                    </motion.button>
                  </form>
                </div>
              </div>

              <div className="col-lg-4">
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "28px",
                    padding: "28px",
                    border: "1px solid #dbe4ef",
                    boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)"
                  }}
                >
                  <div className="mb-3">
                    <h5 className="fw-bold mb-1" style={{ color: "#0f172a" }}>To</h5>
                    <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                      Choose the destination account.
                    </p>
                  </div>
                  <div className="d-flex flex-column gap-3">
                    {accounts.map((account, index) => {
                      const selected = String(toAccount) === String(account.id);
                      const disabled = String(fromAccount) === String(account.id);

                      return (
                        <motion.button
                          key={`to-${account.id}`}
                          type="button"
                          whileHover={{ y: disabled ? 0 : -2 }}
                          whileTap={{ scale: disabled ? 1 : 0.99 }}
                          disabled={disabled}
                          onClick={() => {
                            setToAccount(String(account.id));
                            setMessage("");
                          }}
                          style={cardButtonStyle(selected, disabled, cardGradients[(index + 1) % cardGradients.length])}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.64)" }}>
                                {account.bankName}
                              </div>
                              <div className="fw-bold mt-2" style={{ fontSize: "22px" }}>{maskCard(account.cardNumber)}</div>
                            </div>
                            <span style={{ fontSize: "12px", color: disabled ? "#cbd5e1" : "#bfdbfe", fontWeight: 700 }}>
                              {disabled ? "Same card" : selected ? "Selected" : ""}
                            </span>
                          </div>
                          <div className="fw-semibold">{formatCurrency(account.balance)}</div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {message ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
            style={{
              background: isSuccessMessage ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.1)",
              color: isSuccessMessage ? "#047857" : "#b91c1c",
              border: `1px solid ${isSuccessMessage ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.18)"}`,
              borderRadius: "16px",
              padding: "14px 18px",
              fontWeight: 500
            }}
          >
            {message}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

export default Transfer;
