import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ClawHub — Agent Skill Marketplace",
    template: "%s | ClawHub",
  },
  description:
    "Discover, install, and publish AI agent skills. The public registry for OpenClaw.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <header className="border-b">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <a href="/" className="text-xl font-bold">
              🦞 ClawHub
            </a>
            <div className="flex items-center gap-6 text-sm">
              <a href="/search" className="hover:text-blue-600">
                Search
              </a>
              <a href="/publish" className="hover:text-blue-600">
                Publish
              </a>
              <a
                href="https://github.com/HKUDS/clawhub"
                className="hover:text-blue-600"
              >
                GitHub
              </a>
              <a
                href="/api/auth/login"
                className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
              >
                Sign In
              </a>
            </div>
          </nav>
        </header>
        {children}
        <footer className="border-t py-8 text-center text-sm text-gray-500">
          <p>
            ClawHub — The public registry for OpenClaw skills.{" "}
            <a href="/docs" className="underline">
              Docs
            </a>{" "}
            ·{" "}
            <a href="https://github.com/HKUDS/clawhub" className="underline">
              GitHub
            </a>{" "}
            · MIT License
          </p>
        </footer>
      </body>
    </html>
  );
}
