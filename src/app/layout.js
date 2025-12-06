import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/contexts/DataContext";
import Sidebar from "@/components/Layout/Sidebar";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "Metro Line 4 — Project Dashboard",
    description:
        "Dashboard for visualizing Metro Line 4 project statistics",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning
            >
                <DataProvider>
                    <div className="flex min-h-screen">
                        <Sidebar />
                        <div className="flex-1 lg:ml-64">
                            {children}
                        </div>
                    </div>
                </DataProvider>
            </body>
        </html>
    );
}
