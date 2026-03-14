"use client";

import { FormEvent, useState } from "react";
import { forgotPassword, AuthError } from "../../../../lib/api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword({ email: email.trim() });
      setSuccess(true);
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError("Could not submit request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="auth__visual" aria-hidden="true">
        <div className="auth__visual-overlay">
          <p className="auth__tagline">Blueprint</p>
          <h2 className="auth__visual-title">Account recovery</h2>
        </div>
      </div>

      <div className="auth__panel">
        <div className="auth__panel-inner">
        <header className="auth__header">
          <p className="auth__eyebrow">Password reset</p>
          <h1 className="auth__title">Forgot your password?</h1>
          <p className="auth__subtitle">
            Enter your account email and we&apos;ll send you a password reset link.
          </p>
        </header>

        {success && (
          <p className="auth__message auth__message--success" role="status">
            If an account exists for this email, a password reset link has been sent.
          </p>
        )}

        {error && (
          <p className="auth__message auth__message--error" role="alert">
            {error}
          </p>
        )}

        <form className="auth__form" noValidate onSubmit={handleSubmit}>
          <div className="auth__field">
            <label htmlFor="email" className="auth__label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="auth__input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth__submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        </div>
      </div>
    </>
  );
}
