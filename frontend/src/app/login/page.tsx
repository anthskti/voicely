"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/scenes";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res?.error) {
        setError(res.error.message || "Invalid credentials");
      } else {
        router.push(redirectPath);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to log in";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 glass-card p-8 rounded-2xl border border-[#93BADF]/20 bg-[#1d1e27]/90 shadow-2xl">
      <div className="text-center">
        <Link href="/" className="inline-block font-display text-3xl font-bold tracking-wider text-[#93BADF]">
          Voicely
        </Link>
        <h2 className="mt-4 font-display text-2xl font-bold text-white">Welcome back</h2>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-center text-xs text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-[#93BADF] uppercase tracking-wider mb-2">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voiceactor@voicely.com"
            className="w-full rounded-xl border border-[#93BADF]/20 bg-[#262733] px-4 py-3 text-sm text-white placeholder-[#EDEFF1]/30 focus:border-[#93BADF] focus:outline-none focus:ring-1 focus:ring-[#93BADF]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#93BADF] uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="w-full rounded-xl border border-[#93BADF]/20 bg-[#262733] px-4 py-3 pr-11 text-sm text-white placeholder-[#EDEFF1]/30 focus:border-[#93BADF] focus:outline-none focus:ring-1 focus:ring-[#93BADF]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93BADF]/70 hover:text-[#93BADF] transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#93BADF] py-3 text-sm font-bold text-[#262733] shadow-lg shadow-[#93BADF]/20 hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <div className="text-center text-xs text-[#EDEFF1]/60">
        Don&apos;t have an account?{" "}
        <Link
          href={`/signup?redirect=${encodeURIComponent(redirectPath)}`}
          className="font-bold text-[#93BADF] hover:underline"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#262733] px-4 py-12">
      <Suspense fallback={<div className="text-[#93BADF] font-mono text-sm">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
