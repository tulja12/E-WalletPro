import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { apiUrl } from "../config/api";
import { extractErrorMessage, readResponsePayload } from "../utils/api";
import {
  sanitizePhoneNumber,
  sanitizeUsername,
  validateSignupForm
} from "../utils/validation";

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
    passkey: "",
    confirmPassword: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === "phone") {
      nextValue = sanitizePhoneNumber(value);
    }

    if (name === "username") {
      nextValue = value.replace(/\s+/g, "");
    }

    setFormData({ ...formData, [name]: nextValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validateSignupForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...payload } = formData;
      payload.username = sanitizeUsername(payload.username);
      payload.email = payload.email.trim();
      payload.name = payload.name.trim();
      payload.phone = payload.phone.trim();

      const res = await fetch(apiUrl("/signup"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await readResponsePayload(res);

      if (!res.ok) {
        setError(extractErrorMessage(data, "Signup failed"));
        setLoading(false);
        return;
      }

      navigate("/", {
        state: { message: "Account created successfully" }
      });
    } catch {
      setError("Unable to reach the signup service");
    }

    setLoading(false);
  };

  return (
      <div className="auth-page">
        <div className="auth-card">

          <div className="auth-badge">CREATE ACCOUNT</div>

          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">
            Enter your details to get started.
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">

            {/* Name + Phone */}
            <div className="auth-row">
              <input
                  name="name"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={handleChange}
                  className="auth-input"
                  required
              />

              <input
                  name="phone"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  className="auth-input"
                  required
              />
            </div>

            {/* Email */}
            <div className="auth-full">
              <input
                  name="email"
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                  className="auth-input"
                  required
              />
            </div>

            {/* Username */}
            <div className="auth-full">
              <input
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  className="auth-input"
                  required
              />
            </div>

            {/* Password + Confirm */}
            <div className="auth-row">

              {/* Password */}
              <div className="auth-password-box">
                <input
                    name="passkey"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.passkey}
                    onChange={handleChange}
                    className="auth-password-input"
                    required
                />

                <button
                    type="button"
                    className="auth-show-btn"
                    onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="auth-password-box">
                <input
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="auth-password-input"
                    required
                />

                <button
                    type="button"
                    className="auth-show-btn"
                    onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                    }
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>

            </div>

            <button
                type="submit"
                className="auth-btn"
                disabled={loading}
            >
              {loading ? "Creating..." : "Create Account"}
            </button>

          </form>

          <div className="auth-links">
          <span>
            Already have an account? <Link to="/">Sign in</Link>
          </span>
          </div>

        </div>
      </div>
  );
}

export default Signup;
