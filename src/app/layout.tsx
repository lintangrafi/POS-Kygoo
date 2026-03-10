import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";
import "./globals.css";

const bodyFont = DM_Sans({
    subsets: ["latin"],
    variable: "--font-body",
});

const headingFont = Sora({
    subsets: ["latin"],
    variable: "--font-display",
});

export const metadata: Metadata = {
    title: "Kygoo Studio POS Console",
    description: "Operational command center for cashier, inventory, and financial tracking.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
            </head>
            <body className={`${bodyFont.variable} ${headingFont.variable} antialiased bg-background text-foreground`}>
                {children}
            </body>
        </html>
    );
}
