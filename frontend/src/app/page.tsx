"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useSession, signUp, signOut } from "@/lib/auth-client";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

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

  const scrollToAbout = () => {
    const el = document.getElementById("about");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#262733] text-[#EDEFF1] relative flex flex-col scanline-bg">
      {/* Background Ambient Radial Glow Blobs */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-[#93BADF]/15 via-[#708F7F]/10 to-[#431625]/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#431625]/25 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Main Title Screen Container */}
      <div className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
        
        {/* LEFT SIDE PANEL (Fixed Navigation) */}
        <aside className="w-full lg:w-64 bg-[#1a1b24]/90 border-b lg:border-b-0 lg:border-r border-[#93BADF]/15 backdrop-blur-xl flex flex-col justify-between p-6 shrink-0 z-20">
          <div>
            {/* Top Brand Tag */}
            <div className="flex items-center gap-3 mb-10">
              <Image
                src="/voicely.png"
                alt="Voicely Logo"
                width={36}
                height={36}
                className="rounded-xl shadow-md shadow-[#93BADF]/20"
              />
              <span className="font-display text-xl font-bold tracking-wider text-white">
                VOICELY
              </span>
            </div>

            {/* Menu Items */}
            <nav className="flex flex-col gap-2">
              <Link
                href="/scenes"
                className="group relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-[#EDEFF1]/80 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[#93BADF] opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-[#93BADF] font-mono group-hover:scale-110 transition-transform">▶</span>
                <span>Scenes</span>
              </Link>

              <Link
                href="/library"
                className="group relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-[#EDEFF1]/80 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[#708F7F] opacity-0 group-hover:opacity-100 transition-opacity" />
                <svg className="w-4 h-4 text-[#708F7F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>My Library</span>
              </Link>

              {/* Divider */}
              <div className="my-3 border-t border-white/10" />

              <button
                onClick={scrollToAbout}
                className="group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#EDEFF1]/60 hover:text-white hover:bg-white/5 transition-all duration-200 text-left"
              >
                <span className="text-amber-400 font-mono text-xs">↓</span>
                <span>About Voicely</span>
              </button>
            </nav>
          </div>

          {/* User Status at Side Panel Bottom */}
          <div className="mt-8 pt-4 border-t border-white/10">
            {isPending ? (
              <div className="h-6 w-24 animate-pulse rounded bg-white/5" />
            ) : session?.user ? (
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                    {session.user.name || session.user.email?.split("@")[0]}
                  </span>
                  <span className="text-[10px] text-[#708F7F]">Logged In</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="text-xs text-[#EDEFF1]/50">
                Not logged in
              </div>
            )}
          </div>
        </aside>

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
              <h1 className="font-display text-6xl sm:text-8xl font-black tracking-tight text-white glow-title uppercase leading-none">
                VOICELY
              </h1>
              <p className="mt-4 font-body text-base sm:text-xl text-[#93BADF] tracking-widest uppercase font-semibold">
                Voice Acting Practice Loop
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
                  ENTER STUDIO →
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
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 mb-4">
            THE STORY BEHIND VOICELY
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Why We Built Voicely
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#EDEFF1]/70 max-w-2xl mx-auto leading-relaxed">
            Traditional voice acting practice suffers from subjective feedback and slow iteration cycles. Voicely turns dialogue practice into a high-octane game loop.
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
                Zero-latency timestamp jumps between lines on single master video streams, avoiding expensive server-side video rendering.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-[#708F7F]/30 bg-[#262733]/80">
              <div className="h-10 w-10 rounded-xl bg-[#708F7F]/20 flex items-center justify-center text-[#708F7F] font-mono text-sm mb-4">
                02
              </div>
              <h3 className="font-display text-xl font-bold text-[#708F7F] mb-2">
                Objective ML Feedback
              </h3>
              <p className="text-xs text-[#EDEFF1]/80 leading-relaxed">
                Evaluates your takes on pitch contours (Librosa), speech cadence, and character timbre embeddings (Resemblyzer).
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-purple-500/20 bg-[#262733]/80">
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 font-mono text-sm mb-4">
                03
              </div>
              <h3 className="font-display text-xl font-bold text-purple-300 mb-2">
                osu!-Style Rating
              </h3>
              <p className="text-xs text-[#EDEFF1]/80 leading-relaxed">
                Immediate performance grades from S+ down to F with actionable pros, cons, and line-by-line metric breakdowns.
              </p>
            </div>
          </div>

          <div className="mt-12">
            <Link
              href="/scenes"
              className="inline-flex items-center gap-2 rounded-xl bg-[#93BADF] px-8 py-3 text-sm font-bold text-[#262733] shadow-lg shadow-[#93BADF]/20 hover:bg-white hover:scale-105 transition-all uppercase tracking-wider"
            >
              EXPLORE SCENES CAROUSEL →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
