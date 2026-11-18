import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav, TestBar } from "@/components/nav";
import { StoreProvider } from "@/lib/store";
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
  title: "Weave",
  description: "Weave your worries into one hedge. Baskets of Gemini prediction markets that pay for each event that happens, in USDC on Arc.",
};

// Light is pinned by default (docs/design/DESIGN.md); a saved choice wins.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <StoreProvider>
          <TestBar />
          <Nav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 sm:px-6 md:pb-20">{children}</main>
          <footer className="border-t border-line pb-16 md:pb-0">
            <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-fg-muted sm:px-6">
              <p className="max-w-3xl">
                Testnet demo on Arc. Basket legs reference Gemini Predictions markets. Trading involves risk, including
                possible loss of your entire position. Not investment advice.
              </p>
              <p className="mt-2">Prices are a snapshot of Gemini Predictions on Nov 18, 2026, 4:40 PM CST.</p>
            </div>
          </footer>
        </StoreProvider>
      </body>
    </html>
  );
}
