import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoundQuest — Adaptive soundtrack studio",
  description: "Compose game-state mixes, schedule musical transitions, and hear your soundtrack in a playable arena.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:"try{var t=localStorage.getItem('soundquest-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){}"}} /></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
