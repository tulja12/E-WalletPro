import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";
import {
  sanitizeCardNumber,
  sanitizeLettersOnly,
  sanitizePin,
  validateBankAccountForm
} from "../utils/validation";

const emptyForm = {
  bankName: "",
  cardNumber: "",
  accountHolder: "",
  pin: "",
  balance: ""
};

function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token || !userId || userId === "undefined") {
      localStorage.clear();
      navigate("/");
      return;
    }

    fetchAccounts();
  }, [navigate, token, userId]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(apiUrl("/accounts"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await readResponsePayload(response);

      if (!response.ok) {
        setMessage({ type: "error", text: extractErrorMessage(data, "Unable to load accounts") });
        return;
      }

      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Unable to load accounts" });
    }
  };

  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this account?")) {
      return;
    }

    try {
      const response = await fetch(apiUrl(`/accounts/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await readResponsePayload(response);
        setMessage({ type: "error", text: extractErrorMessage(data, "Unable to remove the account") });
        return;
      }

      setMessage({ type: "success", text: "Account removed successfully" });
      fetchAccounts();
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Unable to remove the account" });
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    const validationError = validateBankAccountForm(form);
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setSaving(true);

    const isNew = !form.id;
    const url = isNew ? apiUrl("/accounts") : apiUrl(`/accounts/${form.id}`);
    const method = isNew ? "POST" : "PUT";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bankName: form.bankName.trim(),
          cardNumber: sanitizeCardNumber(form.cardNumber),
          accountHolder: form.accountHolder.trim(),
          pin: form.pin.trim(),
          balance: Number(form.balance)
        })
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        setMessage({ type: "error", text: extractErrorMessage(data, "Unable to save the account") });
        setSaving(false);
        return;
      }

      setMessage({
        type: "success",
        text: isNew ? "Account linked successfully" : "Account updated successfully"
      });
      setForm(null);
      fetchAccounts();
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Unable to save the account" });
    }

    setSaving(false);
  };

  const inputStyle = {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    color: "#0f172a",
    borderRadius: "12px",
    padding: "12px 16px",
    transition: "all 0.3s ease",
    boxShadow: "inset 0 2px 4px rgba(148,163,184,0.12)",
    width: "100%",
    marginBottom: "15px"
  };

  const labelStyle = {
    color: "#334155",
    fontSize: "13px",
    fontWeight: "500",
    marginBottom: "6px",
    display: "block"
  };

  return (
    <div style={{ padding: "40px 40px" }}>
      <div className="container" style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div className="mb-5">
          <h2 className="fw-bold mb-1" style={{ color: "#0f172a", letterSpacing: "-0.5px" }}>
            Linked Cards
          </h2>
          <p style={{ color: "#64748b", margin: 0 }}>
            Manage your linked cards and bank accounts.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 rounded-4"
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)",
            border: "1px solid #dbe4ef"
          }}
        >
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <p className="mb-1 fw-semibold text-uppercase" style={{ color: "#64748b", fontSize: "12px", letterSpacing: "1px" }}>
                Total Linked Balance
              </p>
              <h2 className="fw-bold m-0" style={{ fontSize: "2.5rem" }}>
                Rs {totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setForm({ ...emptyForm })}
              className="btn px-4 py-3 fw-semibold text-white d-flex align-items-center"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                borderRadius: "14px",
                border: "none",
                boxShadow: "0 10px 25px rgba(59, 130, 246, 0.4)"
              }}
            >
              <i className="bi bi-plus-lg me-2" />
              Add Account
            </motion.button>
          </div>
        </motion.div>

        {message.text ? (
          <div
            className="mb-4 p-3"
            style={{
              background: message.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
              color: message.type === "success" ? "#047857" : "#b91c1c",
              border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
              borderRadius: "14px"
            }}
          >
            {message.text}
          </div>
        ) : null}

        <div className="row g-4">
          <AnimatePresence>
            {accounts.map((account, index) => {
              const bgGradients = [
                "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                "linear-gradient(135deg, #4c1d95 0%, #2e1065 100%)",
                "linear-gradient(135deg, #1e3a8a 0%, #172554 100%)",
                "linear-gradient(135deg, #064e3b 0%, #022c22 100%)"
              ];
              const cardBg = bgGradients[index % bgGradients.length];

              return (
                <motion.div
                  className="col-lg-4 col-md-6"
                  key={account.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div
                    className="p-4 text-white"
                    style={{
                      borderRadius: "24px",
                      background: cardBg,
                      position: "relative",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)"
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="fw-bold m-0" style={{ letterSpacing: "1px", textTransform: "uppercase", fontSize: "14px" }}>
                        {account.bankName}
                      </h5>
                      <span
                        className="px-2 py-1 fw-semibold"
                        style={{
                          borderRadius: "999px",
                          background: account.pinConfigured ? "rgba(16, 185, 129, 0.16)" : "rgba(245, 158, 11, 0.16)",
                          border: `1px solid ${account.pinConfigured ? "rgba(16, 185, 129, 0.28)" : "rgba(245, 158, 11, 0.28)"}`,
                          color: account.pinConfigured ? "#a7f3d0" : "#fde68a",
                          fontSize: "10px",
                          letterSpacing: "0.8px",
                          textTransform: "uppercase"
                        }}
                      >
                        {account.pinConfigured ? "PIN Set" : "PIN Missing"}
                      </span>
                    </div>

                    <div className="mb-3">
                      <svg width="35" height="25" viewBox="0 0 45 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="45" height="32" rx="6" fill="#fbbf24" />
                        <path d="M12 0V32M33 0V32M0 12H45M0 20H45" stroke="#d97706" strokeWidth="1.5" />
                      </svg>
                    </div>

                    <h3
                      className="mb-4 fw-bold"
                      style={{
                        letterSpacing: "3px",
                        opacity: 0.9,
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: "1.4rem"
                      }}
                    >
                      **** **** **** {String(account.cardNumber || "").slice(-4) || "0000"}
                    </h3>

                    <div className="d-flex justify-content-between mb-4">
                      <div>
                        <small style={{ color: "rgba(255,255,255,0.6)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
                          Card Holder
                        </small>
                        <div className="fw-semibold" style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>
                          {account.accountHolder}
                        </div>
                      </div>
                      <div className="text-end">
                        <small style={{ color: "rgba(255,255,255,0.6)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
                          Balance
                        </small>
                        <div className="fw-bold fs-5">
                          Rs {Number(account.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    <div
                      className="d-flex justify-content-between align-items-center mb-4"
                      style={{
                        padding: "12px 14px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.08)"
                      }}
                    >
                      <div>
                        <small style={{ color: "rgba(255,255,255,0.6)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
                          Security
                        </small>
                        <div className="fw-semibold" style={{ fontSize: "13px" }}>
                          {account.pinConfigured ? "Protected by 4-digit PIN" : "Add a PIN to protect this card"}
                        </div>
                      </div>
                      <i
                        className={`bi ${account.pinConfigured ? "bi-shield-lock-fill" : "bi-shield-exclamation"}`}
                        style={{ fontSize: "22px", color: account.pinConfigured ? "#a7f3d0" : "#fde68a" }}
                      />
                    </div>

                    <div className="d-flex gap-2" style={{ paddingTop: "15px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      <button
                        className="btn btn-sm w-50 fw-semibold"
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          color: "white",
                          borderRadius: "10px",
                          border: "1px solid rgba(255,255,255,0.05)"
                        }}
                        onClick={() => setForm({ ...account, pin: "", balance: String(account.balance ?? "") })}
                      >
                        Edit Account
                      </button>
                      <button
                        className="btn btn-sm w-50 fw-semibold"
                        style={{
                          background: "rgba(239, 68, 68, 0.15)",
                          color: "#fecaca",
                          borderRadius: "10px",
                          border: "1px solid rgba(239, 68, 68, 0.2)"
                        }}
                        onClick={() => handleDelete(account.id)}
                      >
                        Remove Account
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {accounts.length === 0 ? (
            <div className="col-12">
              <div className="text-center py-5">
                <h5 className="fw-semibold" style={{ color: "#0f172a" }}>
                  No Accounts Linked
                </h5>
                <p style={{ color: "#64748b" }}>
                  Add a bank account to start adding funds to your wallet.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <AnimatePresence>
          {form ? (
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
                backdropFilter: "blur(5px)"
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-4"
                style={{
                  width: "100%",
                  maxWidth: "450px",
                  background: "#ffffff",
                  borderRadius: "24px",
                  border: "1px solid #dbe4ef",
                  boxShadow: "0 24px 56px rgba(15,23,42,0.16)"
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="fw-bold m-0" style={{ color: "#0f172a" }}>
                    {form.id ? "Edit Card" : "Add Card"}
                  </h4>
                  <button
                    className="btn btn-sm"
                    style={{
                      color: "#94a3b8",
                      background: "#f8fafc",
                      borderRadius: "50%",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none"
                    }}
                    onClick={() => setForm(null)}
                  >
                    X
                  </button>
                </div>

                <form onSubmit={handleSave}>
                  <div>
                    <label style={labelStyle}>Bank Name</label>
                    <input
                      className="form-control"
                      placeholder="e.g. Chase Bank"
                      value={form.bankName}
                      onChange={(event) => setForm({ ...form, bankName: sanitizeLettersOnly(event.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Card Number</label>
                    <input
                      className="form-control"
                      placeholder="1234123412341234"
                      value={form.cardNumber}
                      onChange={(event) => setForm({ ...form, cardNumber: sanitizeCardNumber(event.target.value) })}
                      inputMode="numeric"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Account Holder</label>
                    <input
                      className="form-control"
                      placeholder="John Doe"
                      value={form.accountHolder}
                      onChange={(event) => setForm({ ...form, accountHolder: sanitizeLettersOnly(event.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{form.id ? "Account PIN (leave blank to keep current)" : "4-Digit Account PIN"}</label>
                    <input
                      className="form-control"
                      placeholder={form.id ? "Enter new PIN only if you want to replace it" : "1234"}
                      value={form.pin}
                      onChange={(event) => setForm({ ...form, pin: sanitizePin(event.target.value) })}
                      inputMode="numeric"
                      type="password"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Initial Balance</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      placeholder="5000"
                      value={form.balance}
                      onChange={(event) => setForm({ ...form, balance: event.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <p style={{ color: "#64748b", fontSize: "12px", marginTop: "-6px", marginBottom: "16px" }}>
                    This PIN is required when moving money from the selected bank card.
                  </p>

                  <button
                    type="submit"
                    disabled={saving}
                    className="btn w-100 fw-semibold text-white mt-2"
                    style={{
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "none"
                    }}
                  >
                    {saving ? "Saving..." : form.id ? "Save Changes" : "Link Account"}
                  </button>
                </form>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Accounts;
