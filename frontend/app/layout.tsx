import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { Toaster } from "react-hot-toast";
import QueryProvider from "@/components/shared/QueryProvider";

export const metadata: Metadata = {
  title: {
    default: "TurfBook — Book Turf Slots in Rajshahi",
    template: "%s | TurfBook",
  },
  description:
    "Find and book football, cricket & volleyball turf slots in Rajshahi. Instant confirmation, pay cash on arrival. Turf owners: manage your calendar online.",
  keywords: ["turf booking", "Rajshahi turf", "football turf", "cricket ground", "book turf"],
  openGraph: {
    title: "TurfBook — Book Turf Slots in Rajshahi",
    description: "The easiest way to book turf slots online in Rajshahi, Bangladesh.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <QueryProvider>
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155" },
                success: { iconTheme: { primary: "#22c55e", secondary: "#f1f5f9" } },
                error: { iconTheme: { primary: "#ef4444", secondary: "#f1f5f9" } },
              }}
            />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
