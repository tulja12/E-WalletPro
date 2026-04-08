import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { apiUrl } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";
import { validateAmount } from "../utils/validation";

function AddMoney() {
  const [amount, setAmount] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!selectedAccount) {
      setMessage("Select a bank account");
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
        `Funds added successfully. Wallet balance: Rs ${Number(data.walletBalance || 0).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`
      );
      setAmount("");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error) {
      console.error(error);
      setMessage("Unable to reach the wallet service");
    }

    setLoading(false);
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

  const isSuccess = message.toLowerCase().includes("successfully");

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
            Add Wallet Funds
          </h3>
          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
            Move money from a linked bank account into your wallet.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label style={labelStyle}>Select Bank Account</label>
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
              value={selectedAccount}
              onChange={(event) => setSelectedAccount(event.target.value)}
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.bankName} (**** {account.cardNumber?.slice(-4)}) - Rs {Number(account.balance || 0).toLocaleString("en-IN")}
                </option>
              ))}
            </select>
            {accounts.length === 0 ? (
              <small className="mt-2 d-block" style={{ color: "#b45309" }}>
                No linked accounts found. <Link to="/accounts">Add a bank account first.</Link>
              </small>
            ) : null}
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
            whileHover={{ scale: accounts.length === 0 ? 1 : 1.02 }}
            whileTap={{ scale: accounts.length === 0 ? 1 : 0.98 }}
            disabled={accounts.length === 0 || loading}
            className="btn w-100 fw-semibold mb-3"
            style={{
              background: accounts.length === 0 ? "#e2e8f0" : "linear-gradient(135deg, #10b981, #059669)",
              color: accounts.length === 0 ? "#64748b" : "#fff",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              boxShadow: accounts.length === 0 ? "none" : "0 8px 20px rgba(16, 185, 129, 0.3)",
              fontSize: "16px"
            }}
          >
            {loading ? "Processing..." : "Add Funds to Wallet"}
          </motion.button>
        </form>

        {message ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 text-center mt-3"
            style={{
              background: isSuccess ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
              color: isSuccess ? "#047857" : "#b91c1c",
              border: `1px solid ${isSuccess ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
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

export default AddMoney;
