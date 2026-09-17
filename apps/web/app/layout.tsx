import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EverRule demo",
  description: "Turn a costly AI-agent incident into a tested prevention rule your own systems enforce. Synthetic demo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <span className="wordmark">EverRule</span>
          <span className="tag">Synthetic demo. No real customer data.</span>
        </header>
        <main>{children}</main>
        <footer className="foot">Rules decide. LLMs propose. Humans authorize. Your infrastructure enforces.</footer>
      </body>
    </html>
  );
}
