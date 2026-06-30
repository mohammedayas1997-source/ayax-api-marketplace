import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Ayax APIs - Developer Marketplace",
    template: "%s | Ayax APIs",
  },
  description:
    "Ayax API Marketplace provides secure APIs for data, airtime, wallet services, transaction verification and digital service automation.",
  keywords: [
    "Ayax APIs",
    "API Marketplace",
    "VTU API",
    "Data API",
    "Airtime API",
    "Wallet API",
    "Nigeria API",
    "Developer API",
    "Ayax Digital Solutions",
  ],
  authors: [{ name: "Ayax Digital Solutions" }],
  creator: "Ayax Digital Solutions",
  publisher: "Ayax Digital Solutions",
  openGraph: {
    title: "Ayax APIs - Developer Marketplace",
    description:
      "Secure telecom, wallet and digital service APIs for developers and businesses.",
    url: "https://ayax-api-marketplace.vercel.app",
    siteName: "Ayax APIs",
    images: [
      {
        url: "/assets/logo.png",
        width: 1200,
        height: 630,
        alt: "Ayax APIs",
      },
    ],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ayax APIs - Developer Marketplace",
    description:
      "Secure telecom, wallet and digital service APIs for developers and businesses.",
    images: ["/assets/logo.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
  {children}
  <Footer />
</body>
    </html>
  );
}
