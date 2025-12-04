import "./globals.css"
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/contexts/theme-context"
import { SWRProvider } from "@/contexts/swr-provider"
import { ZebraBrowserPrintScript } from "@/components/zebra-browser-print-script"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ProFlow - Fluxo profissional entre setores - Profarma",
  description: "Sistema completo de recebimento, embalagem, custos e expedição - Profarma",
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }
    ]
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ZebraBrowserPrintScript />
        <SWRProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SWRProvider>
      </body>
    </html>
  )
}
