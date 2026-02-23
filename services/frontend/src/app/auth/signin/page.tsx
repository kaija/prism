"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="auth-page"><div className="auth-card"><p>Loading…</p></div></div>}>
      <SignInContent />
    </Suspense>
  );
}

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const verified = searchParams.get("verified");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [credError, setCredError] = useState("");

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setCredError("Invalid email or password, or email not verified.");
    } else {
      window.location.href = "/projects";
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/projects" });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <svg width="36" height="36" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="50,8 8,82 92,82" />
            <polygon points="50,24 20,76 80,76" />
            <polygon points="50,40 32,70 68,70" />
          </svg>
        </div>
        <h1 className="auth-title">Welcome to Prism</h1>
        <p className="auth-subtitle">Sign in to access your analytics dashboard</p>

        {verified === "true" && (
          <div className="auth-alert auth-alert-success">
            Email verified successfully. You can now sign in.
          </div>
        )}

        {error && (
          <div className="auth-alert auth-alert-error">
            {error === "OAuthAccountNotLinked"
              ? "This email is already associated with another sign-in method."
              : error === "CredentialsSignin"
                ? "Invalid email or password."
                : "An error occurred during sign-in. Please try again."}
          </div>
        )}

        {credError && (
          <div className="auth-alert auth-alert-error">{credError}</div>
        )}

        {/* Credentials form */}
        <form onSubmit={handleCredentialsSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        {/* Google OAuth */}
        <button type="button" className="auth-btn auth-btn-google" onClick={handleGoogleSignIn}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Sign in with Google
        </button>

        <p className="auth-footer-text">
          Don&apos;t have an account? <Link href="/auth/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
