import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OptionLab | Learn options by doing",
  description:
    "A local-first paper trading simulator for learning stocks and options.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
