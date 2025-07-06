import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Descargador de MP3 de YouTube Gratis y Rápido",
  description:
    "Convierte fácilmente videos de YouTube a MP3 en alta calidad. Gratis, sin registro, y compatible con todos los dispositivos.",
  keywords: "youtube mp3, descargar mp3, convertidor youtube, mp3 gratis, youtube a mp3",
  authors: [{ name: "YouTube MP3 Downloader" }],
  creator: "YouTube MP3 Downloader",
  publisher: "YouTube MP3 Downloader",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://youtube-mp3-downloader.vercel.app",
    siteName: "Descargador de MP3 de YouTube",
    title: "Descargador de MP3 de YouTube Gratis y Rápido",
    description:
      "Convierte fácilmente videos de YouTube a MP3 en alta calidad. Gratis, sin registro, y compatible con todos los dispositivos.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Descargador de MP3 de YouTube",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Descargador de MP3 de YouTube Gratis y Rápido",
    description:
      "Convierte fácilmente videos de YouTube a MP3 en alta calidad. Gratis, sin registro, y compatible con todos los dispositivos.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://youtube-mp3-downloader.vercel.app",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">{children}</div>
      </body>
    </html>
  )
}
