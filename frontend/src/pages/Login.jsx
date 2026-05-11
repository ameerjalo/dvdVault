import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import "./Login.css";
import "./Register.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@dvdvault.dev");
  const [password, setPassword] = useState("AdminPass123!");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Signed in successfully");
      navigate("/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail ?? "Sign in failed.";
      setError(detail);
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
        <h1>Sign in</h1>
        <p className="login-subtitle">Welcome back. Enter your credentials.</p>
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
              autoComplete="current-password"
              required
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button className="btn login-submit" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="login-footer-text">
          Don't have an account?{" "}
          <Link to="/register" className="login-footer-link">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
