import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="w-full border-t border-[#93BADF]/10 bg-[#1d1e27] py-8 text-[#EDEFF1]/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 lg:px-8 md:flex-row">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <Image
            src="/voicely.png"
            alt="Voicely Logo"
            width={32}
            height={32}
            className="rounded-lg shadow-sm"
          />
          <div className="flex flex-col items-start gap-0.5">
            <span className="font-display font-bold text-[#EDEFF1] tracking-wider">
              Voicely
            </span>
            <p className="text-xs text-[#93BADF]/80">
              Real-time Voice Acting Practice Loop & AI Feedback Engine
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-xs">
          <Link href="/scenes" className="hover:text-white transition-colors">
            Scenes
          </Link>
          <Link href="/library" className="hover:text-white transition-colors">
            Library
          </Link>
          <Link href="/about" className="hover:text-white transition-colors">
            About
          </Link>
          <span className="text-[#93BADF]/40">•</span>
          <span className="text-[11px] text-[#EDEFF1]/40">
            © {new Date().getFullYear()} Voicely
          </span>
        </div>
      </div>
    </footer>
  );
}
