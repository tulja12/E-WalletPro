import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AUTH_API_BASE_URL } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";
import {
  validateForgotPasswordIdentityForm,
  validateForgotPasswordResetForm,
  validateOtp
} from "../utils/validation";
import "../styles/auth.css";

const EMAIL_STEP = "email";
const OTP_STEP = "otp";
const PASSWORD_STEP = "password";

function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(EMAIL_STEP);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("Enter your username and the linked email address.");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateForgotPasswordIdentityForm({ username, email });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim()
        })
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        setError(extractErrorMessage(data, "Unable to start password reset."));
        setLoading(false);
        return;
      }

      setChallengeToken(data.tempToken);
      setStep(OTP_STEP);
      setInfo(data.message || "Enter the 6-digit code from your authenticator app.");
    } catch {
      setError("Unable to reach the password reset service");
    }

    setLoading(false);
  };

  const handleOtpSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateOtp(otp);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/forgot-password/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${challengeToken}`
        },
        body: JSON.stringify({ otp })
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        setError(extractErrorMessage(data, "OTP verification failed."));
        setLoading(false);
        return;
      }

      setResetToken(data.resetToken);
      setStep(PASSWORD_STEP);
      setInfo(data.message || "Set a new password for your account.");
    } catch {
      setError("Unable to verify the MFA code");
    }

    setLoading(false);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateForgotPasswordResetForm({
      newPassword,
      confirmPassword
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/forgot-password/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resetToken}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        setError(extractErrorMessage(data, "Unable to reset the password."));
        setLoading(false);
        return;
      }

      setInfo(data.message || "Password updated successfully.");
      setTimeout(() => navigate("/"), 1200);
    } catch {
      setError("Unable to update the password");
    }

    setLoading(false);
  };

  const renderStepForm = () => {
    if (step === EMAIL_STEP) {
      return (
        <form onSubmit={handleEmailSubmit} className="auth-form">
          <label className="auth-label">Username</label>
          <input
            type="text"
            className="auth-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="your_username"
            required
          />

          <label className="auth-label">Email</label>
          <input
            type="email"
            className="auth-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            required
          />

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Checking..." : "Continue"}
          </button>
        </form>
      );
    }

    if (step === OTP_STEP) {
      return (
        <form onSubmit={handleOtpSubmit} className="auth-form">
          <label className="auth-label">Authenticator code</label>
          <input
            type="text"
            inputMode="numeric"
            className="auth-input auth-code-input"
            value={otp}
            onChange={(event) => {
              const value = event.target.value.replace(/[^0-9]/g, "");
              if (value.length <= 6) {
                setOtp(value);
              }
            }}
            placeholder="000000"
            required
          />

          <button type="submit" className="auth-btn" disabled={loading || otp.length !== 6}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      );
    }

    return (
      <form onSubmit={handlePasswordSubmit} className="auth-form">
        <label className="auth-label">New password</label>
        <div className="auth-password-box">
          <input
            type={showNewPassword ? "text" : "password"}
            className="auth-password-input"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className="auth-show-btn"
            onClick={() => setShowNewPassword((current) => !current)}
          >
            {showNewPassword ? "Hide" : "Show"}
          </button>
        </div>

        <label className="auth-label" style={{ marginTop: "12px" }}>
          Confirm password
        </label>
        <div className="auth-password-box">
          <input
            type={showConfirmPassword ? "text" : "password"}
            className="auth-password-input"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className="auth-show-btn"
            onClick={() => setShowConfirmPassword((current) => !current)}
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Updating..." : "Reset Password"}
        </button>
      </form>
    );
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-badge">PASSWORD RESET</div>
        <h1 className="auth-title">Forgot password</h1>
        <p className="auth-subtitle">
          Recover your account with username, email, and MFA verification.
        </p>

        <div className="auth-step-row">
          <div className={`auth-step-pill ${step === EMAIL_STEP ? "is-active" : ""}`}>1. Account</div>
          <div className={`auth-step-pill ${step === OTP_STEP ? "is-active" : ""}`}>2. MFA</div>
          <div className={`auth-step-pill ${step === PASSWORD_STEP ? "is-active" : ""}`}>3. Password</div>
        </div>

        <div className="auth-note">
          {step === EMAIL_STEP ? (
            info
          ) : (
            <>
              Account: <strong>{username.trim()}</strong>
              <br />
              Email: <strong>{email.trim()}</strong>
              <br />
              {info}
            </>
          )}
        </div>

        {error ? <div className="auth-error">{error}</div> : null}

        {renderStepForm()}

        <div className="auth-links auth-links-single">
          <span>
            Back to <Link to="/">user login</Link>
          </span>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
