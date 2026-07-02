"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { BrandLogo } from "@/components/brand/BrandLogo";

type Mode = "signIn" | "signUp" | "resetPassword";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<Mode>("signIn");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword, signOut, isConfigured } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "resetPassword") {
        await resetPassword(email);
        setMessage("Password reset email sent. Check your inbox.");
        setMode("signIn");
        return;
      }
      if (mode === "signUp") {
        await signUp(email, password, displayName);
        await signOut();
        setMessage(
          "Account created. An admin will approve your access — sign in once you are approved."
        );
        setMode("signIn");
        setPassword("");
        return;
      }
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setMessage("");
  };

  return (
    <div className="login-canvas flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <BrandLogo variant="icon" className="h-16 w-16 drop-shadow-lg" priority />
          </div>
          <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            {APP_TAGLINE}
          </p>
        </div>

        <Card className="border-slate-700/50 bg-white/95 shadow-2xl shadow-black/20">
          <CardBody className="p-6">
            {!isConfigured && (
              <div className="mb-4 rounded-xl bg-sky-50 border border-sky-200 p-3 text-sm text-sky-900">
                Firebase is not configured. Copy <code className="text-xs">.env.local.example</code> to{" "}
                <code className="text-xs">.env.local</code> and add your Firebase credentials.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signUp" && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Your account will stay locked until an administrator approves you and assigns
                  permissions.
                </p>
              )}
              {mode === "resetPassword" && (
                <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                  Enter your account email and we&apos;ll send a link to reset your password.
                </p>
              )}
              {mode === "signUp" && (
                <Input
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  touch
                />
              )}
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                touch
              />
              {mode !== "resetPassword" && (
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  touch
                />
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-emerald-700">{message}</p>}

              <Button
                type="submit"
                size="touch"
                className="w-full"
                disabled={loading || !isConfigured}
              >
                {loading
                  ? "Please wait..."
                  : mode === "resetPassword"
                    ? "Send reset link"
                    : mode === "signUp"
                      ? "Request access"
                      : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 space-y-2 text-center">
              {mode === "signIn" && (
                <>
                  <button
                    type="button"
                    onClick={() => switchMode("signUp")}
                    className="block w-full text-sm font-medium text-sky-700 hover:text-sky-800"
                  >
                    Need an account? Request access
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("resetPassword")}
                    className="block w-full text-sm text-slate-500 hover:text-slate-700"
                  >
                    Forgot password?
                  </button>
                </>
              )}
              {mode === "signUp" && (
                <button
                  type="button"
                  onClick={() => switchMode("signIn")}
                  className="text-sm font-medium text-sky-700 hover:text-sky-800"
                >
                  Already have an account? Sign in
                </button>
              )}
              {mode === "resetPassword" && (
                <button
                  type="button"
                  onClick={() => switchMode("signIn")}
                  className="text-sm font-medium text-sky-700 hover:text-sky-800"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
