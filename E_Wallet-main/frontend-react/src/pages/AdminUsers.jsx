import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

const styles = `
  .admin-page{min-height:100vh;background:linear-gradient(135deg,#fff8ee 0%,#f3f8ff 52%,#f6fcf8 100%);font-family:'Inter',sans-serif;padding:32px 18px}
  .admin-card{background:rgba(255,255,255,.9);border:1px solid #dce6f0;box-shadow:0 20px 44px rgba(148,163,184,.14);border-radius:28px}
  .admin-hero{background:linear-gradient(135deg,rgba(255,248,235,.96),rgba(240,247,255,.96))}
  .admin-eyebrow{display:inline-flex;gap:8px;align-items:center;padding:.45rem .8rem;border-radius:999px;background:#fff;color:#2563eb;font-size:.8rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
  .admin-stat{height:100%;padding:1.2rem}
  .admin-stat-icon{width:50px;height:50px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:1.2rem}
  .admin-title{color:#111827;font-weight:800;letter-spacing:-.04em}
  .admin-muted{color:#64748b}
  .admin-action{border:none;border-radius:14px;padding:.85rem 1.15rem;font-weight:700}
  .admin-action.ghost{background:#fff;border:1px solid #dce6f0;color:#1f2937}
  .admin-action.primary{background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;box-shadow:0 12px 24px rgba(59,130,246,.22)}
  .admin-search{display:flex;align-items:center;gap:10px;min-width:280px;padding:.8rem .95rem;border-radius:16px;border:1px solid #dce6f0;background:#fff}
  .admin-search input{width:100%;border:none;outline:none;background:transparent;color:#1f2937}
  .admin-search input::placeholder{color:#94a3b8}
  .admin-filter{border:1px solid #dce6f0;background:#fff;color:#64748b;border-radius:999px;padding:.58rem 1rem;font-size:.92rem;font-weight:700;transition:all .18s ease}
  .admin-filter.active{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border-color:transparent;box-shadow:0 10px 22px rgba(59,130,246,.18)}
  .admin-table{--bs-table-bg:transparent;--bs-table-border-color:#edf2f7;margin-bottom:0}
  .admin-table thead th{background:#f8fbff;color:#64748b;border-bottom:1px solid #dce6f0;font-size:.78rem;font-weight:800;letter-spacing:.08em;padding:1rem;text-transform:uppercase;white-space:nowrap}
  .admin-table tbody td{padding:1rem;vertical-align:middle;background:transparent;border-top:1px solid #edf2f7}
  .admin-row{cursor:pointer;transition:background-color .18s ease}
  .admin-row:hover{background:#f8fbff}
  .admin-badge{display:inline-flex;align-items:center;gap:6px;padding:.38rem .75rem;border-radius:999px;font-size:.82rem;font-weight:700}
  .admin-badge::before{content:'';width:8px;height:8px;border-radius:50%;background:currentColor}
  .admin-badge.blue{background:#dbeafe;color:#1d4ed8}
  .admin-badge.green{background:#dcfce7;color:#166534}
  .admin-badge.amber{background:#fef3c7;color:#9a6700}
  .admin-badge.red{background:#fee2e2;color:#b42318}
  .admin-badge.slate{background:#eef2f7;color:#475569}
  .admin-note{padding:.9rem 1rem;border-radius:16px;font-weight:600}
  .admin-note.green{background:#dcfce7;color:#166534}
  .admin-note.red{background:#fee2e2;color:#b42318}
  .admin-note.amber{background:#fef3c7;color:#9a6700}
  .admin-field,.admin-bank{border:1px solid #e7eef6;border-radius:20px;background:#fbfdff}
  .admin-field{padding:1rem}
  .admin-bank{padding:18px;background:#fff;box-shadow:0 12px 24px rgba(148,163,184,.08)}
  .admin-field-label{color:#6b7280;font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
  .admin-field-value{color:#1f2937;font-size:1rem;font-weight:600;margin-top:.35rem;word-break:break-word}
  .admin-modal-backdrop{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;z-index:1050;background:rgba(15,23,42,.16);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
  .admin-modal-card{width:100%;max-width:920px;max-height:90vh;overflow-y:auto;padding:26px;border-radius:30px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(250,252,255,.97));border:1px solid #dce6f0;box-shadow:0 30px 70px rgba(148,163,184,.24)}
  .admin-security{border-radius:24px;padding:20px;border:1px solid #e7eef6;background:linear-gradient(135deg,#fbfdff,#fffdf7)}
  @media (max-width:768px){.admin-page{padding:20px 12px}.admin-search{min-width:100%}.admin-table thead th,.admin-table tbody td{padding:.85rem .75rem}}
`;

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const initials = (name, username) =>
  (name || username || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const maskCard = (cardNumber) => {
  if (!cardNumber) {
    return "Card number not available";
  }
  return `**** ${String(cardNumber).replace(/\s+/g, "").slice(-4)}`;
};

const readJson = async (response, fallback) => {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
};

function Badge({ label, tone }) {
  return <span className={`admin-badge ${tone}`}>{label}</span>;
}

function Note({ note }) {
  if (!note?.text) {
    return null;
  }
  return <div className={`admin-note ${note.tone || "red"}`}>{note.text}</div>;
}

function Field({ label, value }) {
  return (
    <div className="admin-field">
      <div className="admin-field-label">{label}</div>
      <div className="admin-field-value">{value || "Not available"}</div>
    </div>
  );
}

function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailNote, setDetailNote] = useState(null);
  const [actionLoading, setActionLoading] = useState("");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const adminName = localStorage.getItem("username") || "admin";

  const logout = () => {
    ["token", "tempToken", "tempRole", "role", "userId", "username", "mfaEnabled"].forEach((key) => {
      localStorage.removeItem(key);
    });
    navigate("/admin-login");
  };

  const updateUserState = (userId, changes) => {
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...changes } : user)));
    setSelectedUser((current) => (current && current.id === userId ? { ...current, ...changes } : current));
  };

  const fetchUsers = async () => {
    if (!token) {
      logout();
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await readJson(response, []);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
          return;
        }
        setUsers([]);
        setFeedback({ text: data.message || "Unable to load users", tone: "red" });
        setLoading(false);
        return;
      }
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setUsers([]);
      setFeedback({ text: "Unable to reach the admin service", tone: "red" });
    }
    setLoading(false);
  };

  const openUser = async (userId) => {
    if (!token) {
      logout();
      return;
    }
    setSelectedUserId(userId);
    setSelectedUser(null);
    setDetailLoading(true);
    setDetailNote(null);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await readJson(response, {});
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
          return;
        }
        setDetailNote({ text: data.message || "Unable to load user details", tone: "red" });
        setDetailLoading(false);
        return;
      }
      setSelectedUser(data);
    } catch (error) {
      console.error(error);
      setDetailNote({ text: "Unable to load user details", tone: "red" });
    }
    setDetailLoading(false);
  };

  const closeModal = () => {
    if (actionLoading) {
      return;
    }
    setSelectedUserId(null);
    setSelectedUser(null);
    setDetailLoading(false);
    setDetailNote(null);
  };

  const updateSecurity = async (kind, value) => {
    if (!selectedUser || !token) {
      return;
    }
    setActionLoading(kind);
    setDetailNote(null);
    try {
      const endpoint = kind === "mfa" ? "mfa" : "blocked";
      const body = kind === "mfa" ? { enabled: value } : { blocked: value };
      const response = await fetch(`${API_BASE_URL}/admin/users/${selectedUser.id}/${endpoint}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const data = await readJson(response, {});
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
          return;
        }
        setDetailNote({ text: data.message || "Unable to update user settings", tone: "red" });
        setActionLoading("");
        return;
      }
      updateUserState(selectedUser.id, kind === "mfa" ? { mfaEnabled: data.mfaEnabled } : { blocked: data.blocked });
      setDetailNote({ text: data.message || "User settings updated", tone: "green" });
    } catch (error) {
      console.error(error);
      setDetailNote({ text: "Unable to update user settings", tone: "red" });
    }
    setActionLoading("");
  };

  useEffect(() => {
    if (!token || role !== "ADMIN") {
      navigate("/admin-login");
      return;
    }
    fetchUsers();
  }, [navigate, role, token]);

  useEffect(() => {
    if (selectedUserId === null) {
      return undefined;
    }
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedUserId, actionLoading]);

  const totalUsers = users.length;
  const blockedUsers = users.filter((user) => user.blocked).length;
  const activeUsers = totalUsers - blockedUsers;
  const mfaUsers = users.filter((user) => user.mfaEnabled).length;
  const query = search.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const matchesQuery =
      !query ||
      [user.name, user.username, user.email, user.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    if (!matchesQuery) {
      return false;
    }
    if (filter === "blocked") {
      return user.blocked;
    }
    if (filter === "secured") {
      return user.mfaEnabled;
    }
    if (filter === "active") {
      return !user.blocked;
    }
    return true;
  });

  return (
    <div className="admin-page">
      <style>{styles}</style>
      <div className="container" style={{ maxWidth: "1240px" }}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="admin-card admin-hero p-4 p-lg-4 mb-4">
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4">
              <div>
                <div className="admin-eyebrow mb-3">
                  <i className="bi bi-shield-lock" />
                  Admin Console
                </div>
                <h1 className="admin-title mb-2" style={{ fontSize: "2.2rem" }}>
                  Cleaner user management
                </h1>
                <p className="admin-muted mb-0" style={{ maxWidth: "720px" }}>
                  Review wallet balances, linked bank accounts, and user security settings from a lighter admin workspace.
                </p>
              </div>

              <div className="d-flex flex-column align-items-start align-items-lg-end gap-2">
                <div style={{ color: "#475569", fontWeight: 600 }}>Signed in as @{adminName}</div>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="admin-action ghost" onClick={fetchUsers}>
                    <i className="bi bi-arrow-clockwise me-2" />
                    Refresh
                  </button>
                  <button type="button" className="admin-action primary" onClick={logout}>
                    <i className="bi bi-box-arrow-right me-2" />
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            {[
              { label: "Total Users", value: totalUsers, icon: "bi-people", bg: "#dbeafe", color: "#1d4ed8" },
              { label: "Active Users", value: activeUsers, icon: "bi-person-check", bg: "#dcfce7", color: "#166534" },
              { label: "MFA Enabled", value: mfaUsers, icon: "bi-shield-check", bg: "#fef3c7", color: "#9a6700" },
              { label: "Blocked Users", value: blockedUsers, icon: "bi-person-slash", bg: "#fee2e2", color: "#b42318" }
            ].map((item) => (
              <div className="col-md-6 col-xl-3" key={item.label}>
                <div className="admin-card admin-stat">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="admin-stat-icon" style={{ background: item.bg, color: item.color }}>
                      <i className={`bi ${item.icon}`} />
                    </div>
                  </div>
                  <div className="admin-muted" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                    {item.label}
                  </div>
                  <div style={{ color: "#1f2937", fontSize: "1.72rem", fontWeight: 800 }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-card p-4">
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-4">
              <div>
                <h2 className="admin-title mb-1" style={{ fontSize: "1.45rem" }}>
                  Users
                </h2>
                <p className="admin-muted mb-0">
                  Click a row to view user details, wallet balance, and linked bank accounts.
                </p>
              </div>

              <div className="d-flex flex-column flex-lg-row gap-2 align-items-stretch">
                <div className="admin-search">
                  <i className="bi bi-search" style={{ color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder="Search by name, username, email or phone"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="d-flex flex-wrap gap-2">
                  {[
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "secured", label: "MFA Enabled" },
                    { id: "blocked", label: "Blocked" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`admin-filter ${filter === item.id ? "active" : ""}`}
                      onClick={() => setFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div className="admin-muted" style={{ fontSize: "0.94rem", fontWeight: 600 }}>
                Showing {filteredUsers.length} of {totalUsers} users
              </div>
              {loading && <div style={{ color: "#2563eb", fontWeight: 700 }}>Loading users...</div>}
            </div>

            <Note note={feedback} />
            {feedback?.text ? <div style={{ height: "16px" }} /> : null}

            <div className="table-responsive">
              <table className="table admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Contact</th>
                    <th>Wallet Balance</th>
                    <th>MFA</th>
                    <th>Status</th>
                    <th style={{ width: "60px" }} />
                  </tr>
                </thead>
                <tbody>
                  {!loading && filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
                        No users matched the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="admin-row"
                        onClick={() => openUser(user.id)}
                        style={{ opacity: user.blocked ? 0.72 : 1 }}
                      >
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "16px",
                                background: "linear-gradient(135deg,#dbeafe,#fef3c7)",
                                color: "#1e3a8a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800
                              }}
                            >
                              {initials(user.name, user.username)}
                            </div>
                            <div>
                              <div style={{ color: "#111827", fontWeight: 700 }}>{user.name || "Unnamed user"}</div>
                              <div className="admin-muted" style={{ fontSize: "0.92rem" }}>
                                @{user.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ color: "#111827", fontWeight: 600 }}>{user.email || "No email"}</div>
                          <div className="admin-muted" style={{ fontSize: "0.92rem" }}>
                            {user.phone || "No phone"}
                          </div>
                        </td>
                        <td style={{ color: "#0f172a", fontWeight: 700 }}>{money(user.walletBalance)}</td>
                        <td>
                          <Badge label={user.mfaEnabled ? "Enabled" : "Disabled"} tone={user.mfaEnabled ? "amber" : "slate"} />
                        </td>
                        <td>
                          <Badge label={user.blocked ? "Blocked" : "Active"} tone={user.blocked ? "red" : "green"} />
                        </td>
                        <td style={{ textAlign: "right", color: "#94a3b8" }}>
                          <i className="bi bi-chevron-right" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedUserId !== null && (
          <motion.div className="admin-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal}>
            <motion.div
              className="admin-modal-card"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    style={{
                      width: "62px",
                      height: "62px",
                      borderRadius: "20px",
                      background: "linear-gradient(135deg,#dbeafe,#fef3c7)",
                      color: "#1e3a8a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "1.05rem"
                    }}
                  >
                    {initials(selectedUser?.name, selectedUser?.username)}
                  </div>
                  <div>
                    <div className="admin-title" style={{ fontSize: "1.58rem" }}>
                      {selectedUser?.name || "Loading user..."}
                    </div>
                    <div className="admin-muted">{selectedUser?.username ? `@${selectedUser.username}` : "Fetching account details"}</div>
                  </div>
                </div>
                <button type="button" className="admin-action ghost" onClick={closeModal} style={{ padding: ".8rem .95rem" }}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <Note note={detailNote} />
              {detailNote?.text ? <div style={{ height: "18px" }} /> : null}

              {detailLoading ? (
                <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#2563eb", fontWeight: 700 }}>
                  Loading user details...
                </div>
              ) : selectedUser ? (
                <>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6 col-lg-3">
                      <Field label="Email" value={selectedUser.email} />
                    </div>
                    <div className="col-md-6 col-lg-3">
                      <Field label="Phone" value={selectedUser.phone} />
                    </div>
                    <div className="col-md-6 col-lg-3">
                      <Field label="Role" value={selectedUser.role} />
                    </div>
                    <div className="col-md-6 col-lg-3">
                      <Field label="Wallet Balance" value={money(selectedUser.walletBalance)} />
                    </div>
                  </div>

                  <div className="admin-security mb-4">
                    <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
                      <div>
                        <div className="admin-title mb-2" style={{ fontSize: "1.1rem" }}>
                          Security controls
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          <Badge label={selectedUser.mfaEnabled ? "MFA enabled" : "MFA disabled"} tone={selectedUser.mfaEnabled ? "amber" : "slate"} />
                          <Badge label={selectedUser.blocked ? "Account blocked" : "Account active"} tone={selectedUser.blocked ? "red" : "green"} />
                        </div>
                      </div>

                      <div className="d-flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="admin-action"
                          disabled={actionLoading === "mfa"}
                          onClick={() => updateSecurity("mfa", !selectedUser.mfaEnabled)}
                          style={{
                            background: selectedUser.mfaEnabled ? "#fff" : "linear-gradient(135deg,#fde68a,#facc15)",
                            color: selectedUser.mfaEnabled ? "#9a6700" : "#713f12",
                            border: selectedUser.mfaEnabled ? "1px solid #fcd34d" : "none"
                          }}
                        >
                          {actionLoading === "mfa" ? "Updating..." : selectedUser.mfaEnabled ? "Disable MFA" : "Enable MFA"}
                        </button>
                        <button
                          type="button"
                          className="admin-action"
                          disabled={actionLoading === "blocked"}
                          onClick={() => updateSecurity("blocked", !selectedUser.blocked)}
                          style={{
                            background: selectedUser.blocked ? "linear-gradient(135deg,#86efac,#4ade80)" : "linear-gradient(135deg,#fca5a5,#f87171)",
                            color: selectedUser.blocked ? "#14532d" : "#7f1d1d"
                          }}
                        >
                          {actionLoading === "blocked" ? "Updating..." : selectedUser.blocked ? "Unblock User" : "Block User"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                    <div>
                      <div className="admin-title" style={{ fontSize: "1.15rem" }}>
                        Linked bank accounts
                      </div>
                      <div className="admin-muted">
                        {(selectedUser.bankAccounts?.length || 0)} account{selectedUser.bankAccounts?.length === 1 ? "" : "s"} connected
                      </div>
                    </div>
                  </div>

                  {selectedUser.bankAccounts?.length ? (
                    <div className="row g-3">
                      {selectedUser.bankAccounts.map((account) => (
                        <div className="col-md-6" key={account.id}>
                          <div className="admin-bank h-100">
                            <div className="d-flex align-items-start justify-content-between mb-3">
                              <div>
                                <div style={{ color: "#111827", fontWeight: 800, fontSize: "1.04rem" }}>
                                  {account.bankName || "Bank account"}
                                </div>
                                <div className="admin-muted" style={{ fontSize: "0.92rem" }}>
                                  {maskCard(account.cardNumber)}
                                </div>
                              </div>
                              <div
                                style={{
                                  width: "42px",
                                  height: "42px",
                                  borderRadius: "14px",
                                  background: "#e0ecff",
                                  color: "#2563eb",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <i className="bi bi-bank2" />
                              </div>
                            </div>
                            <Field label="Account Holder" value={account.accountHolder} />
                            <div style={{ height: "10px" }} />
                            <Field label="Account Balance" value={money(account.balance)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        borderRadius: "22px",
                        padding: "2rem 1.25rem",
                        border: "1px dashed #c9d8e8",
                        background: "#fbfdff",
                        textAlign: "center",
                        color: "#64748b"
                      }}
                    >
                      No linked bank accounts found for this user.
                    </div>
                  )}
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminUsers;
