import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { apiUrl } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";
import { sanitizePin, validateAccountPin, validateAmount } from "../utils/validation";

const cardGradients = [
  "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #581c87 100%)"
];

const formatCurrency = (value) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const maskCard = (cardNumber) => `•••• ${String(cardNumber || "").slice(-4) || "0000"}`;

function AddMoney() {
  const [amount, setAmount] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [accountPin, setAccountPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!token || !userId || userId === "undefined") {
      localStorage.clear();
      navigate("/");
      return;
    }

    const fetchAccounts = async () => {
      try {
        const response = await fetch(apiUrl("/accounts"), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await readResponsePayload(response);

        if (!response.ok) {
          setMessage(extractErrorMessage(data, "Unable to load linked bank accounts."));
          return;
        }

        setAccounts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setMessage("Unable to load linked bank accounts.");
      }
    };

    fetchAccounts();
  }, [navigate, token, userId]);

  const selectedAccountDetails = useMemo(
    () => accounts.find((account) => String(account.id) === String(selectedAccount)) || null,
    [accounts, selectedAccount]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!selectedAccount) {
      setMessage("Select a bank card");
      return;
    }

    const pinError = validateAccountPin(accountPin, "Selected card PIN");
    if (pinError) {
      setMessage(pinError);
      return;
    }

    const amountError = validateAmount(amount);
    if (amountError) {
      setMessage(amountError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(apiUrl("/wallet/add-from-account"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId: Number(selectedAccount),
          pin: accountPin,
          amount: Number(amount)
        })
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        setMessage(extractErrorMessage(data, "Unable to add money to the wallet"));
        setLoading(false);
        return;
      }

      setMessage(
        `Funds added successfully. Wallet balance: ${formatCurrency(data.walletBalance || 0)}. History syncs automatically.`
      );
      setAmount("");
      setAccountPin("");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error) {
      console.error(error);
      setMessage("Unable to reach the wallet service");
    }

    setLoading(false);
  };

  const isSuccess = message.toLowerCase().includes("successfully");

  return (
    <div style={{ padding: "40px 20px" }}>
      <div className="container" style={{ maxWidth: "1120px", margin: "0 auto" }}>
        <div className="mb-4">
          <h2 className="fw-bold mb-1" style={{ color: "#0f172a", letterSpacing: "-0.7px" }}>
            Add Wallet Funds
          </h2>
          <p style={{ color: "#64748b", margin: 0 }}>
            Select a linked card, enter the amount, and authorize the source card with its PIN.
          </p>
        </div>

        <div className="row g-4">
          <div className="col-lg-7">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "#ffffff",
                borderRadius: "28px",
                padding: "28px",
                border: "1px solid #dbe4ef",
                boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)"
              }}
            >
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                <div>
                  <h5 className="fw-bold mb-1" style={{ color: "#0f172a" }}>Choose Source Card</h5>
                  <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                    All linked cards are shown here for direct selection.
                  </p>
                </div>
                <span
                  className="px-3 py-2 fw-semibold"
                  style={{
                    borderRadius: "999px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: "12px"
                  }}
                >
                  {accounts.length} linked card{accounts.length === 1 ? "" : "s"}
                </span>
              </div>

              {accounts.length === 0 ? (
                <div
                  style={{
                    borderRadius: "20px",
                    border: "1px dashed #cbd5e1",
                    background: "#f8fafc",
                    padding: "32px",
                    textAlign: "center"
                  }}
                >
                  <h6 className="fw-semibold mb-2" style={{ color: "#0f172a" }}>No linked cards yet</h6>
                  <p style={{ color: "#64748b", marginBottom: "12px" }}>
                    Add a bank account before funding your wallet.
                  </p>
                  <Link to="/accounts">Open linked cards</Link>
                </div>
              ) : (
                <div className="row g-3">
                  {accounts.map((account, index) => {
                    const selected = String(selectedAccount) === String(account.id);

                    return (
                      <div className="col-md-6" key={account.id}>
                        <motion.button
                          type="button"
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => {
                            setSelectedAccount(String(account.id));
                            setAccountPin("");
                            setMessage("");
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: selected ? "2px solid #60a5fa" : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "24px",
                            padding: "22px",
                            color: "#ffffff",
                            background: cardGradients[index % cardGradients.length],
                            boxShadow: selected
                              ? "0 22px 40px rgba(37, 99, 235, 0.26)"
                              : "0 20px 40px rgba(15, 23, 42, 0.28)"
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-4">
                            <div>
                              <div style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.64)" }}>
                                {account.bankName}
                              </div>
                              <div className="fw-bold mt-2" style={{ fontSize: "24px", letterSpacing: "1px" }}>
                                {maskCard(account.cardNumber)}
                              </div>
                            </div>
                            <span
                              style={{
                                borderRadius: "999px",
                                padding: "6px 10px",
                                fontSize: "10px",
                                letterSpacing: "0.8px",
                                textTransform: "uppercase",
                                background: account.pinConfigured ? "rgba(16, 185, 129, 0.16)" : "rgba(245, 158, 11, 0.16)",
                                border: `1px solid ${account.pinConfigured ? "rgba(16, 185, 129, 0.32)" : "rgba(245, 158, 11, 0.32)"}`,
                                color: account.pinConfigured ? "#a7f3d0" : "#fde68a"
                              }}
                            >
                              {account.pinConfigured ? "PIN Ready" : "PIN Missing"}
                            </span>
                          </div>

                          <div className="d-flex justify-content-between align-items-end">
                            <div>
                              <div style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.64)" }}>
                                Available
                              </div>
                              <div className="fw-semibold" style={{ fontSize: "18px" }}>
                                {formatCurrency(account.balance)}
                              </div>
                            </div>
                            {selected ? (
                              <div style={{ fontSize: "12px", color: "#bfdbfe", fontWeight: 700 }}>Selected</div>
                            ) : null}
                          </div>
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          <div className="col-lg-5">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              style={{
                background: "#ffffff",
                borderRadius: "28px",
                padding: "28px",
                border: "1px solid #dbe4ef",
                boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)"
              }}
            >
              <div className="mb-4">
                <h5 className="fw-bold mb-1" style={{ color: "#0f172a" }}>Funding Details</h5>
                <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                  Confirm the selected source card and amount before continuing.
                </p>
              </div>

              {selectedAccountDetails ? (
                <div
                  className="mb-4"
                  style={{
                    borderRadius: "18px",
                    border: "1px solid #dbe4ef",
                    background: "#f8fafc",
                    padding: "18px"
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-semibold" style={{ color: "#0f172a" }}>{selectedAccountDetails.bankName}</div>
                      <div style={{ color: "#64748b", fontSize: "14px" }}>{maskCard(selectedAccountDetails.cardNumber)}</div>
                    </div>
                    <div className="text-end">
                      <div style={{ color: "#64748b", fontSize: "12px" }}>Balance</div>
                      <div className="fw-bold" style={{ color: "#0f172a" }}>{formatCurrency(selectedAccountDetails.balance)}</div>
                    </div>
                  </div>
                  {!selectedAccountDetails.pinConfigured ? (
                    <p className="mb-0 mt-3" style={{ color: "#b45309", fontSize: "13px" }}>
                      This card does not have a PIN yet. Update it in <Link to="/accounts">Linked Cards</Link> before funding.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div
                  className="mb-4"
                  style={{
                    borderRadius: "18px",
                    border: "1px dashed #cbd5e1",
                    background: "#f8fafc",
                    padding: "18px",
                    color: "#64748b",
                    fontSize: "14px"
                  }}
                >
                  Select a card to continue.
                </div>
              )}

              <form onSubmit={handleSubmit}>
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
                        borderBottomLeftRadius: 0
                      }}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold" style={{ color: "#334155", fontSize: "13px" }}>
                    Source Card PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    className="form-control"
                    placeholder="Enter 4-digit PIN"
                    value={accountPin}
                    onChange={(event) => setAccountPin(sanitizePin(event.target.value))}
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
                    The PIN is checked only for the selected source card.
                  </small>
                </div>

                <motion.button
                  whileHover={{ scale: accounts.length === 0 ? 1 : 1.01 }}
                  whileTap={{ scale: accounts.length === 0 ? 1 : 0.99 }}
                  disabled={accounts.length === 0 || loading || !selectedAccountDetails?.pinConfigured}
                  className="btn w-100 fw-semibold"
                  style={{
                    background:
                      accounts.length === 0 || !selectedAccountDetails?.pinConfigured
                        ? "#e2e8f0"
                        : "linear-gradient(135deg, #10b981, #059669)",
                    color: accounts.length === 0 || !selectedAccountDetails?.pinConfigured ? "#64748b" : "#fff",
                    padding: "14px",
                    borderRadius: "14px",
                    border: "none",
                    boxShadow:
                      accounts.length === 0 || !selectedAccountDetails?.pinConfigured
                        ? "none"
                        : "0 10px 24px rgba(16, 185, 129, 0.28)"
                  }}
                >
                  {loading ? "Processing..." : "Move Funds to Wallet"}
                </motion.button>
              </form>

              {message ? (
                <div
                  className="mt-4"
                  style={{
                    background: isSuccess ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.1)",
                    color: isSuccess ? "#047857" : "#b91c1c",
                    border: `1px solid ${isSuccess ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.18)"}`,
                    borderRadius: "14px",
                    padding: "14px 16px",
                    fontWeight: 500
                  }}
                >
                  {message}
                </div>
              ) : null}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddMoney;
