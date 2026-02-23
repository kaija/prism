import { verifyEmailAction } from "../actions";
import Link from "next/link";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const params = await searchParams;
  const { token, email } = params;

  if (!token || !email) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Invalid Link</h1>
          <p className="auth-subtitle">This verification link is missing required parameters.</p>
          <p className="auth-footer-text">
            <Link href="/auth/signin">Back to Sign In</Link>
          </p>
        </div>
      </div>
    );
  }

  const result = await verifyEmailAction(token, email);

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
        {result.success ? (
          <>
            <h1 className="auth-title">Email Verified</h1>
            <div className="auth-alert auth-alert-success">{result.message}</div>
          </>
        ) : (
          <>
            <h1 className="auth-title">Verification Failed</h1>
            <div className="auth-alert auth-alert-error">{result.error}</div>
          </>
        )}
        <p className="auth-footer-text" style={{ marginTop: 20 }}>
          <Link href="/auth/signin">Go to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
