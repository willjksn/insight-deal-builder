"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { Clapperboard } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, isConfigured } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-canvas flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg shadow-sky-500/30 ring-4 ring-sky-400/20">
            <Clapperboard className="h-8 w-8 text-white" />
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
              {isSignUp && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Your account will stay locked until an administrator approves you and assigns
                  permissions.
                </p>
              )}
              {isSignUp && (
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
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                touch
              />

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <Button
                type="submit"
                size="touch"
                className="w-full"
                disabled={loading || !isConfigured}
              >
                {loading ? "Please wait..." : isSignUp ? "Request access" : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm font-medium text-sky-700 hover:text-sky-800"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Need an account? Request access"}
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
