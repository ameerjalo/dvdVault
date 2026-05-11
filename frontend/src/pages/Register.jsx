import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import "./Login.css";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/register", { email, password });
      setSuccess("Registration successful! Redirecting to login…");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      const detail = err.response?.data?.detail ?? "Registration failed.";
      setError(typeof detail === "string" ? detail : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="card login-card">
        <div className="login-brand">
          <span className="brand-mark">D</span>
          <span>dvdVault</span>
        </div>
        <h1>Create your account</h1>
        <p className="login-subtitle">
          Join dvdVault to start building your cinematic collection.
        </p>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          {success && <div className="register-success">{success}</div>}
          <button
            className="btn login-submit"
            type="submit"
            disabled={submitting || Boolean(success)}
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="login-footer-text">
          Already have an account?{" "}
          <Link to="/login" className="login-footer-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
