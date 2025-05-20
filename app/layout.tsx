import { type Metadata, type Viewport } from "next"

import { fontSans } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { TailwindIndicator } from "@/components/tailwind-indicator"
import { ThemeProvider } from "@/components/theme-provider"

import "@/styles/globals.css"

export const metadata: Metadata = {
  icons: {
    icon: "https://i.pinimg.com/736x/b9/7e/83/b97e833dd2048893a250814a4b3bf571.jpg",
    shortcut: "https://i.pinimg.com/736x/b9/7e/83/b97e833dd2048893a250814a4b3bf571.jpg",
    apple: "https://i.pinimg.com/736x/b9/7e/83/b97e833dd2048893a250814a4b3bf571.jpg",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            "min-h-screen bg-background font-sans antialiased",
            fontSans.variable
          )}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="relative flex min-h-screen flex-col">
              {children}
            </div>
            <TailwindIndicator />
          </ThemeProvider>
        </body>
      </html>
    </>
  )
}
