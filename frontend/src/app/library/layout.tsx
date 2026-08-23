import { AuthGuard } from "@/components/AuthGuard";

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
