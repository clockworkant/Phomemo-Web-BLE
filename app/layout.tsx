import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "T02 Printer App",
  description: "Connect and print to T02 thermal printer via BLE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  );
}
