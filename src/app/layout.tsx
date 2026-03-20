import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lectern — AI-Powered Study Platform",
    template: "%s | Lectern",
  },
  description:
    "Upload your course materials and get AI-generated lectures, practice questions, and a personal tutor. Built for university students who want to ace their exams.",
  keywords: [
    "study platform",
    "AI tutor",
    "study platform",
    "university exam prep",
    "AI lecture notes",
    "practice questions",
    "online learning",
  ],
  openGraph: {
    title: "Lectern — AI-Powered Study Platform",
    description:
      "Upload your course materials and get AI-generated lectures, practice questions, and a personal tutor.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
