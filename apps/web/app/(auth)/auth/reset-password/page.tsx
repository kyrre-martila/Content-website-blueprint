"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthError, resetPassword } from "../../../../lib/api/auth";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing reset token.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, password });
      setSuccess(true);
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError("Could not reset password. Please try again.");
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
          <h1 className="auth__title">Set a new password</h1>
          <p className="auth__subtitle">Choose a new password for your account.</p>
        </header>

        {success && (
          <p className="auth__message auth__message--success" role="status">
            Password reset successful. You can now sign in with your new password.
          </p>
        )}

        {error && (
          <p className="auth__message auth__message--error" role="alert">
            {error}
          </p>
        )}

        <form className="auth__form" noValidate onSubmit={handleSubmit}>
          <div className="auth__field">
            <label htmlFor="password" className="auth__label">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="auth__input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading || success}
            />
          </div>

          <button type="submit" className="auth__submit" disabled={loading || success}>
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </form>
        </div>
      </div>
    </>
  );
}
