"use client";

import { useState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionResult } from "../actions";

export default function SignUpPage() {
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const formData = new FormData(e.currentTarget);
    const res = await signUpAction(null, formData);
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="36" height="36" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="50,8 8,82 92,82" />
            <polygon points="50,24 20,76 80,76" />
            <polygon points="50,40 32,70 68,70" />
          </svg>
        </div>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Sign up to get started with Prism</p>

        {result?.success && (
          <div className="auth-alert auth-alert-success">{result.message}</div>
        )}
        {result && !result.success && (
          <div className="auth-alert auth-alert-error">{result.error}</div>
        )}

        {!result?.success && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" type="text" placeholder="Your name" autoComplete="name" />
            </div>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" placeholder="Min 8 characters" required minLength={8} autoComplete="new-password" />
            </div>
            <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
              {loading ? "Creating account…" : "Sign Up"}
            </button>
          </form>
        )}

        <p className="auth-footer-text">
          Already have an account? <Link href="/auth/signin">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
