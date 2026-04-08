import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { apiUrl } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";
import { validateEmail, validatePasswordChange } from "../utils/validation";

function Profile() {
  const [user, setUser] = useState({ username: "" });
  const [email, setEmail] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const navigate = useNavigate();

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    try {
      const response = await fetch(apiUrl("/user/details"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await readResponsePayload(response);

      if (!response.ok) {
        return;
      }

      setUser({ username: data.username || "" });
      setEmail(data.email || "");
      setMfaEnabled(Boolean(data.mfaEnabled));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleChangeEmail = async () => {
    const validationError = validateEmail(newEmail);
    if (validationError) {
      setEmailMessage(validationError);
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(apiUrl("/user/change-email"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail.trim() })
      });
      const data = await readResponsePayload(response);

      if (!response.ok) {
        setEmailMessage(extractErrorMessage(data, "Failed to update email"));
        return;
      }

      setShowEmailModal(false);
      setEmailMessage("");
      setNewEmail("");
      fetchProfile();
    } catch (error) {
      console.error(error);
      setEmailMessage("Unable to update email");
    }
  };

  const handleChangePassword = async () => {
    const validationError = validatePasswordChange({
      currentPassword,
      newPassword,
      confirmPassword
    });
    if (validationError) {
      setPasswordMessage(validationError);
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(apiUrl("/user/change-password"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await readResponsePayload(response);

      if (!response.ok) {
        setPasswordMessage(extractErrorMessage(data, "Failed to update password"));
        return;
      }

      setShowPasswordModal(false);
      setPasswordMessage("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(error);
      setPasswordMessage("Unable to update password");
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
    width: "100%",
    marginBottom: "15px"
  };

  return (
    <div style={{ padding: "40px 20px", display: "flex", justifyContent: "center" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} style={{ width: "100%", maxWidth: "600px" }}>
        <div className="mb-4 text-center">
          <h3 className="fw-bold mb-0" style={{ color: "#0f172a", letterSpacing: "-0.5px" }}>
            My Profile
          </h3>
          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
            Manage your personal information.
          </p>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "24px", padding: "40px", boxShadow: "0 24px 56px rgba(148, 163, 184, 0.16)", border: "1px solid #dbe4ef" }}>
          <div className="text-center mb-5">
            <div style={{ width: "90px", height: "90px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", color: "#fff", fontWeight: "bold" }}>
              {user.username ? user.username.charAt(0).toUpperCase() : localStorage.getItem("username")?.charAt(0).toUpperCase() || "U"}
            </div>
            <h4 className="mt-3 fw-bold mb-1" style={{ color: "#0f172a" }}>
              @{user.username || localStorage.getItem("username") || "user"}
            </h4>
            <p style={{ color: "#64748b", margin: 0 }}>{email || "No email available"}</p>
          </div>

          <div className="row g-4 mb-5">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center" style={{ background: "#f8fafc", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0" }}>
                <div>
                  <p style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 5px 0" }}>Email Address</p>
                  <div style={{ color: "#0f172a" }} className="fw-semibold">{email || "No email"}</div>
                </div>
                <button className="btn btn-sm" style={{ background: "#eff6ff", color: "#1e3a8a", borderRadius: "8px", border: "1px solid #bfdbfe" }} onClick={() => setShowEmailModal(true)}>
                  Change
                </button>
              </div>
            </div>

            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center" style={{ background: "#f8fafc", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0" }}>
                <div>
                  <p style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 5px 0" }}>Password</p>
                  <div style={{ color: "#0f172a" }} className="fw-semibold">********</div>
                </div>
                <button className="btn btn-sm" style={{ background: "#eff6ff", color: "#1e3a8a", borderRadius: "8px", border: "1px solid #bfdbfe" }} onClick={() => setShowPasswordModal(true)}>
                  Change
                </button>
              </div>
            </div>

            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center" style={{ background: "#f8fafc", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0" }}>
                <div>
                  <p style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 5px 0" }}>2FA Security</p>
                  <div style={{ color: "#0f172a" }} className="fw-semibold d-flex align-items-center">
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: mfaEnabled ? "#10b981" : "#ef4444", marginRight: "8px" }} />
                    {mfaEnabled ? "Enabled" : "Disabled"}
                  </div>
                </div>
                {!mfaEnabled ? (
                  <Link to="/mfa-setup" className="btn btn-sm" style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", borderRadius: "8px" }}>
                    Setup 2FA
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-5 text-center">
            <button onClick={handleLogout} className="btn w-100 fw-semibold" style={{ background: "#fff1f2", color: "#dc2626", padding: "14px", borderRadius: "12px", border: "1px solid #fecdd3" }}>
              Sign Out
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showEmailModal ? (
          <div className="modal d-flex align-items-center justify-content-center" style={{ background: "rgba(0,0,0,0.6)", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050, backdropFilter: "blur(5px)" }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="p-4" style={{ width: "100%", maxWidth: "400px", background: "#ffffff", borderRadius: "24px", border: "1px solid #dbe4ef", boxShadow: "0 24px 56px rgba(15,23,42,0.16)" }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold m-0" style={{ color: "#0f172a" }}>Change Email</h4>
                <button className="btn btn-sm" style={{ color: "#94a3b8", background: "#f8fafc", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", border: "none" }} onClick={() => { setShowEmailModal(false); setEmailMessage(""); }}>
                  X
                </button>
              </div>
              <input type="email" className="form-control" placeholder="New email address" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} style={inputStyle} />
              {emailMessage ? <p style={{ color: "#b91c1c", fontSize: "14px", marginBottom: "15px" }}>{emailMessage}</p> : null}
              <button className="btn w-100 fw-semibold text-white mt-2" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", padding: "12px", borderRadius: "12px", border: "none" }} onClick={handleChangeEmail}>
                Update Email
              </button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showPasswordModal ? (
          <div className="modal d-flex align-items-center justify-content-center" style={{ background: "rgba(0,0,0,0.6)", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050, backdropFilter: "blur(5px)" }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="p-4" style={{ width: "100%", maxWidth: "400px", background: "#ffffff", borderRadius: "24px", border: "1px solid #dbe4ef", boxShadow: "0 24px 56px rgba(15,23,42,0.16)" }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold m-0" style={{ color: "#0f172a" }}>Change Password</h4>
                <button className="btn btn-sm" style={{ color: "#94a3b8", background: "#f8fafc", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", border: "none" }} onClick={() => { setShowPasswordModal(false); setPasswordMessage(""); }}>
                  X
                </button>
              </div>
              <input type="password" className="form-control" placeholder="Current Password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} style={inputStyle} />
              <input type="password" className="form-control" placeholder="New Password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} style={inputStyle} />
              <input type="password" className="form-control" placeholder="Confirm Password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} style={inputStyle} />
              {passwordMessage ? <p style={{ color: "#b91c1c", fontSize: "14px", marginBottom: "15px" }}>{passwordMessage}</p> : null}
              <button className="btn w-100 fw-semibold text-white mt-2" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", padding: "12px", borderRadius: "12px", border: "none" }} onClick={handleChangePassword}>
                Update Password
              </button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default Profile;
