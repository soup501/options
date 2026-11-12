"use client";

import { signIn } from "next-auth/react";
import { BASE_PATH } from "@/lib/base-path";

export default function Login() {
  return (
    <main className="login-page">
      <div className="login-card">
        <div className="brand login-brand">
          <span className="brand-mark">O</span>
          <span>
            option<span className="brand-accent">lab</span>
          </span>
        </div>
        <span className="eyebrow">PRIVATE LEARNING ACCOUNT</span>
        <h1>Practice with purpose.</h1>
        <p>
          Sign in to keep your paper portfolio and learning progress connected
          to your account.
        </p>
        <button
          className="button primary login-button"
          onClick={() => signIn("google", { callbackUrl: `${BASE_PATH}/options` })}
        >
          <span className="google-mark">G</span> Continue with Google
        </button>
        <small>
          Educational simulator only. No brokerage account is connected.
        </small>
      </div>
    </main>
  );
}
