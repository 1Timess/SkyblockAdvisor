import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Statixel — Your SkyBlock profile, understood.",
  description: "Explore your SkyBlock profile, progression, and game knowledge with Statixel.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
