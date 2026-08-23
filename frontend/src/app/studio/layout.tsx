import { AuthGuard } from "@/components/AuthGuard";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
