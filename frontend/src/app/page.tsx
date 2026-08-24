"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useSession, signUp } from "@/lib/auth-client";
import { Footer } from "@/components/Footer";
import { Sidebar } from "@/components/Sidebar";

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await signUp.email({
        email,
        password,
        name: name || email.split("@")[0],
      });
      if (res?.error) {
        setError(res.error.message || "Failed to create account.");
      } else {
        router.push("/scenes");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#262733] text-[#EDEFF1] relative flex flex-col scanline-bg pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
      {/* Background Ambient Radial Glow Blobs */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-[#93BADF]/15 via-[#708F7F]/10 to-[#431625]/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#431625]/25 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Main Title Screen Container */}
      <div className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
        <Sidebar />

        {/* CENTER STAGE (Cinematic Hero Title Screen) */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center min-h-[calc(100vh-80px)] lg:min-h-screen">
          <div className="max-w-2xl w-full flex flex-col items-center space-y-8">
            
            {/* Custom Logo Container */}
            <div className="relative group">
              <Image
                src="/voicely.png"
                alt="Voicely Logo"
                width={112}
                height={112}
                className="rounded-3xl shadow-2xl drop-shadow-[0_0_30px_rgba(147,186,223,0.35)] transition-transform duration-500 hover:scale-105"
              />
            </div>

            {/* Game Title */}
            <div>
              <h1 className="font-display text-6xl sm:text-8xl font-black tracking-tight text-white glow-title leading-none">
                Voicely
              </h1>
              <p className="mt-4 font-body text-base sm:text-xl text-[#93BADF] tracking-widest uppercase font-semibold">
                Practice Your Voice Acting Skills
              </p>
            </div>

            {/* Inline Sign Up Form or Logged In CTA */}
            {session?.user ? (
              <div className="glass-card p-6 rounded-2xl border border-[#93BADF]/30 bg-[#1d1e27]/80 w-full max-w-sm flex flex-col items-center gap-4">
                <span className="text-xs text-[#708F7F] font-mono">
                  WELCOME BACK, {session.user.name?.toUpperCase() || "ACTOR"}
                </span>
                <Link
                  href="/scenes"
                  className="w-full rounded-xl bg-[#93BADF] py-3.5 text-sm font-bold text-[#262733] shadow-lg shadow-[#93BADF]/20 hover:bg-white hover:scale-105 active:scale-95 transition-all text-center tracking-wider uppercase"
                >
                  ENTER STUDIO
                </Link>
              </div>
            ) : (
              <div className="glass-card p-8 rounded-3xl border border-[#93BADF]/20 bg-[#1d1e27]/85 backdrop-blur-xl w-full max-w-md shadow-2xl">
                <span className="text-xs font-semibold text-[#93BADF] uppercase tracking-widest block mb-4">
                  Create Your Voice Actor Profile
                </span>

                {error && (
                  <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignUp} className="space-y-4 text-left">
                  <div>
                    <input
                      type="text"
                      placeholder="Display Name (optional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-[#93BADF]/20 bg-[#262733]/90 px-4 py-3 text-sm text-white placeholder-[#EDEFF1]/40 focus:border-[#93BADF] focus:outline-none focus:ring-1 focus:ring-[#93BADF]"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#93BADF]/20 bg-[#262733]/90 px-4 py-3 text-sm text-white placeholder-[#EDEFF1]/40 focus:border-[#93BADF] focus:outline-none focus:ring-1 focus:ring-[#93BADF]"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#93BADF]/20 bg-[#262733]/90 px-4 py-3 pr-11 text-sm text-white placeholder-[#EDEFF1]/40 focus:border-[#93BADF] focus:outline-none focus:ring-1 focus:ring-[#93BADF]"
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#93BADF] py-3.5 text-sm font-bold text-[#262733] shadow-lg shadow-[#93BADF]/20 hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-wider"
                  >
                    {loading ? "Creating Account..." : "SIGN UP & START"}
                  </button>
                </form>

                <div className="mt-5 text-center text-xs text-[#EDEFF1]/60">
                  Already have an account?{" "}
                  <Link href="/login" className="font-bold text-[#93BADF] hover:underline">
                    Log in
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ABOUT SECTION (Below the fold) */}
      <section id="about" className="relative z-10 border-t border-[#93BADF]/15 bg-[#1d1e27]/90 py-20 px-6 sm:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Why Voicely?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#EDEFF1]/70 max-w-2xl mx-auto leading-relaxed">
            Voice acting practice suffers from subjective feedback and slow iteration cycles. Voicely turns dialogue practice into a game.
          </p>

          {/* 3 Feature Pillars */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="glass-card p-6 rounded-2xl border border-[#93BADF]/20 bg-[#262733]/80">
              <div className="h-10 w-10 rounded-xl bg-[#93BADF]/20 flex items-center justify-center text-[#93BADF] font-mono text-sm mb-4">
                01
              </div>
              <h3 className="font-display text-xl font-bold text-[#93BADF] mb-2">
                Virtual Slicing
              </h3>
              <p className="text-xs text-[#EDEFF1]/80 leading-relaxed">
                Breaks down dialogue into individual lines for practice.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-[#708F7F]/30 bg-[#262733]/80">
              <div className="h-10 w-10 rounded-xl bg-[#708F7F]/20 flex items-center justify-center text-[#708F7F] font-mono text-sm mb-4">
                02
              </div>
              <h3 className="font-display text-xl font-bold text-[#708F7F] mb-2">
                ML-Driven Feedback
              </h3>
              <p className="text-xs text-[#EDEFF1]/80 leading-relaxed">
                Evaluates your takes on pitch contours, speech cadence, and character timbre embeddings.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-purple-500/20 bg-[#262733]/80">
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 font-mono text-sm mb-4">
                03
              </div>
              <h3 className="font-display text-xl font-bold text-purple-300 mb-2">
                Gamified
              </h3>
              <p className="text-xs text-[#EDEFF1]/80 leading-relaxed">
                Performance grades from S+ down to F with pros, cons, and line-by-line metric breakdowns.
              </p>
            </div>
          </div>

          <div className="mt-12">
            <Link
              href="/scenes"
              className="inline-flex items-center gap-2 rounded-xl bg-[#93BADF] px-8 py-3 text-sm font-bold text-[#262733] shadow-lg shadow-[#93BADF]/20 hover:bg-white hover:scale-105 transition-all uppercase tracking-wider"
            >
              EXPLORE SCENES
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
