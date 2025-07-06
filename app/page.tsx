"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Music, Youtube, Zap, Shield, Smartphone, AlertTriangle, CheckCircle, Settings } from "lucide-react"
import { DownloadCard } from "@/components/download-card"
import { validateYouTubeUrl, extractVideoId } from "@/lib/utils"
import type { VideoInfo } from "@/types"

export default function HomePage() {
  const [url, setUrl] = useState("")
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [systemStatus, setSystemStatus] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // Fix hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check system dependencies after mount
  useEffect(() => {
    if (mounted) {
      checkSystemStatus()
    }
  }, [mounted])

  const checkSystemStatus = async () => {
    try {
      const response = await fetch("/api/system-check")
      if (response.ok) {
        const data = await response.json()
        setSystemStatus(data)
      }
    } catch (error) {
      console.error("Error checking system status:", error)
      // Set default status if check fails
      setSystemStatus({
        checks: { ytDlp: false, youtubeDl: false },
        recommendations: ["Sistema en modo básico"],
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setVideoInfo(null)

    if (!validateYouTubeUrl(url)) {
      setError("Por favor, ingresa una URL válida de YouTube")
      return
    }

    setLoading(true)

    try {
      const videoId = extractVideoId(url)
      console.log("🚀 Starting fast conversion for:", videoId)

      const response = await fetch("/api/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoId, url }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error de conexión" }))
        throw new Error(errorData.error || "Error al procesar el video")
      }

      const data = await response.json()
      setVideoInfo(data)
      console.log("✅ Quick response received, processing in background")
    } catch (err: any) {
      console.error("❌ Conversion error:", err)
      setError(err.message || "Error al procesar el video. Por favor, intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* System Status Alert */}
      {systemStatus && (
        <div className="max-w-2xl mx-auto mb-6">
          {!systemStatus.checks?.ytDlp && !systemStatus.checks?.youtubeDl ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Modo básico:</strong> Usando servicios online (más lento).
                <details className="mt-2">
                  <summary className="cursor-pointer">Instalar para mejor velocidad</summary>
                  <ul className="mt-2 space-y-1">
                    {systemStatus.recommendations?.map((rec: string, index: number) => (
                      <li key={index} className="text-sm">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </details>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>⚡ Modo rápido activado:</strong> Conversión optimizada disponible.
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkSystemStatus}
                  className="ml-2 h-6 px-2 text-green-700 hover:text-green-800"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Verificar
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Header */}
      <header className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
            <Music className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          YouTube a MP3
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Convierte videos de YouTube a MP3 de forma súper rápida ⚡
        </p>
      </header>

      {/* Main Form */}
      <div className="max-w-2xl mx-auto mb-12">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Conversión Rápida ⚡</CardTitle>
            <CardDescription className="text-center">
              Pega la URL del video de YouTube - conversión en segundos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-10 h-12 text-lg"
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !url}
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Convertir ⚡
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Download Card */}
      {videoInfo && <DownloadCard videoInfo={videoInfo} />}

      {/* Features */}
      <div className="max-w-6xl mx-auto mt-16">
        <h2 className="text-3xl font-bold text-center mb-12">Conversión Súper Rápida ⚡</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center border-0 bg-white/60 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Súper Rápido ⚡</h3>
              <p className="text-gray-600">Respuesta inmediata, descarga en segundos</p>
            </CardContent>
          </Card>

          <Card className="text-center border-0 bg-white/60 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Optimizado</h3>
              <p className="text-gray-600">Algoritmos optimizados para máxima velocidad</p>
            </CardContent>
          </Card>

          <Card className="text-center border-0 bg-white/60 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sin Esperas</h3>
              <p className="text-gray-600">Procesamiento en segundo plano</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center mt-16 py-8 border-t border-gray-200">
        <p className="text-gray-600">© 2025 YouTube MP3 Downloader. Creado por Muhammad Arsalan.</p>
        <p className="text-sm text-gray-500 mt-2">Conversión súper rápida ⚡</p>
      </footer>
    </div>
  )
}
