"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Clock, Music, Play, Pause, CheckCircle, FileAudio, Loader2 } from "lucide-react"
import Image from "next/image"
import type { VideoInfo } from "@/types"
import { useState, useRef, useEffect } from "react"

interface DownloadCardProps {
  videoInfo: VideoInfo & { format?: string; status?: string }
}

export function DownloadCard({ videoInfo }: DownloadCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [fileReady, setFileReady] = useState(videoInfo.status !== "processing")
  const [fileSize, setFileSize] = useState(videoInfo.fileSize)
  const [mounted, setMounted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fix hydration issues
  useEffect(() => {
    setMounted(true)
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Poll for file readiness if still processing
  useEffect(() => {
    if (!mounted || videoInfo.status !== "processing") return

    const checkProgress = async () => {
      try {
        const response = await fetch(`/api/progress/${videoInfo.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.ready) {
            setFileReady(true)
            setFileSize(`${data.sizeInMB} MB`)
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
            }
          }
        }
      } catch (error) {
        console.error("Error checking progress:", error)
      }
    }

    // Start polling after 3 seconds
    const timeoutId = setTimeout(() => {
      checkProgress() // Check immediately
      pollIntervalRef.current = setInterval(checkProgress, 3000) // Then every 3 seconds
    }, 3000)

    return () => {
      clearTimeout(timeoutId)
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [videoInfo.id, videoInfo.status, mounted])

  const handleDownload = async () => {
    if (!fileReady) {
      alert("El archivo aún se está procesando. Por favor espera un momento.")
      return
    }

    setDownloading(true)
    setDownloadProgress(0)

    try {
      const response = await fetch(videoInfo.downloadUrl)

      if (!response.ok) {
        throw new Error("Error al descargar el archivo")
      }

      const contentLength = response.headers.get("content-length")
      const total = contentLength ? Number.parseInt(contentLength, 10) : 0

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No se pudo leer el archivo")
      }

      const chunks: Uint8Array[] = []
      let downloaded = 0

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        downloaded += value.length

        if (total > 0) {
          setDownloadProgress(Math.round((downloaded / total) * 100))
        }
      }

      const contentType = response.headers.get("content-type") || "audio/mpeg"
      const blob = new Blob(chunks, { type: contentType })
      const blobUrl = window.URL.createObjectURL(blob)

      const format = videoInfo.format || "mp3"
      const extension = format === "mp3" ? "mp3" : format

      // Create and trigger download
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = `${videoInfo.title.replace(/[^a-z0-9\s]/gi, "").replace(/\s+/g, "_")}.${extension}`

      // Append to body, click, then remove
      document.body.appendChild(link)
      link.click()

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      }, 100)

      alert(`¡Descarga completada! Archivo ${extension.toUpperCase()} descargado.`)
    } catch (error) {
      console.error("Error downloading file:", error)
      alert("Error al descargar. Intenta de nuevo.")
    } finally {
      setDownloading(false)
      setDownloadProgress(0)
    }
  }

  const handlePlayPause = () => {
    if (!fileReady || !mounted) {
      alert("El archivo aún se está procesando.")
      return
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error)
          alert("No se pudo reproducir el audio.")
        })
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto mb-8">
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-32 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mb-8">
      {/* Status Alert */}
      {fileReady ? (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>¡Listo!</strong> Tu audio ha sido procesado y está disponible para descarga.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800">
            <strong>Procesando...</strong> Tu audio se está convirtiendo. Esto tomará unos segundos.
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5 text-green-600" />
            {fileReady ? "Audio Listo" : "Procesando Audio..."}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Thumbnail */}
            <div className="relative w-full md:w-48 h-32 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={videoInfo.thumbnail || "/placeholder.svg?height=180&width=320"}
                alt={videoInfo.title}
                fill
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = "/placeholder.svg?height=180&width=320"
                }}
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="bg-white/90 rounded-full p-2">
                  {fileReady ? (
                    <Music className="h-6 w-6 text-gray-700" />
                  ) : (
                    <Loader2 className="h-6 w-6 text-gray-700 animate-spin" />
                  )}
                </div>
              </div>
            </div>

            {/* Video Info */}
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold text-lg line-clamp-2">{videoInfo.title}</h3>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(videoInfo.duration)}
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {(videoInfo.format || "mp3").toUpperCase()}
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {fileSize}
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {videoInfo.quality}
                </Badge>
              </div>

              {/* Audio Player */}
              {mounted && (
                <audio
                  ref={audioRef}
                  src={fileReady ? videoInfo.downloadUrl : undefined}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                  crossOrigin="anonymous"
                />
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handlePlayPause}
                  variant="outline"
                  disabled={!fileReady}
                  className="flex-1 md:flex-none bg-transparent hover:bg-blue-50"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      {fileReady ? "Reproducir" : "Procesando..."}
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleDownload}
                  disabled={downloading || !fileReady}
                  className="flex-1 md:flex-none bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {downloadProgress > 0 ? `${downloadProgress}%` : "Descargando..."}
                    </>
                  ) : !fileReady ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar {(videoInfo.format || "MP3").toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
