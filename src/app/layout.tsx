import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flick! Dashboard",
  description: "Admin dashboard for the Flick! lighter tracking app",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
