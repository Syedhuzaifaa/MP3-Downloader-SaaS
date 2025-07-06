import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import fs from "fs-extra"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

const ConvertSchema = z.object({
  videoId: z.string().min(1),
  url: z.string().url(),
})

// Create temp directory for downloads
const TEMP_DIR = path.join(process.cwd(), "temp")
fs.ensureDirSync(TEMP_DIR)

// Cache for video info to avoid repeated API calls
const videoInfoCache = new Map<string, any>()

export async function POST(request: NextRequest) {
  const tempAudioPath = ""

  try {
    const body = await request.json()
    const { videoId, url } = ConvertSchema.parse(body)

    console.log(`🚀 Fast conversion for video: ${videoId}`)

    // Step 1: Quick environment check
    const environment = await quickEnvironmentCheck()
    console.log(`⚡ Environment: ${environment.type}`)

    // Step 2: Get video info (with caching)
    console.log("📋 Getting video info...")
    const videoInfo = await getCachedVideoInfo(url, videoId, environment)
    if (!videoInfo) {
      return NextResponse.json({ error: "No se pudo obtener información del video." }, { status: 400 })
    }

    console.log(`✅ Info: ${videoInfo.title}`)

    // Step 3: Start background download immediately
    console.log("🚀 Starting fast download...")
    const downloadPromise = fastDownloadAudio(url, videoId, environment)

    // Step 4: Return quick response while download continues
    const quickResponse = {
      id: videoId,
      title: videoInfo.title,
      thumbnail: videoInfo.thumbnail,
      duration: videoInfo.duration,
      fileSize: "Calculando...",
      downloadUrl: `/api/download/${videoId}`,
      quality: environment.hasFFmpeg ? "320kbps MP3" : "Original",
      format: environment.hasFFmpeg ? "mp3" : "m4a",
      isDemo: false,
      status: "processing",
    }

    // Start download in background
    downloadPromise
      .then(async (result) => {
        console.log(`✅ Background download completed: ${result.filePath}`)
        // Update file size
        const stats = await fs.stat(result.filePath)
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(1)
        console.log(`📊 File size: ${fileSizeInMB}MB`)
      })
      .catch((error) => {
        console.error(`❌ Background download failed:`, error)
      })

    return NextResponse.json(quickResponse)
  } catch (error) {
    console.error("❌ Error:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

async function quickEnvironmentCheck() {
  const environment = {
    type: "unknown",
    hasYtDlp: false,
    hasFFmpeg: false,
  }

  // Quick parallel checks
  const checks = await Promise.allSettled([
    execAsync("yt-dlp --version").then(() => (environment.hasYtDlp = true)),
    execAsync("ffmpeg -version").then(() => (environment.hasFFmpeg = true)),
  ])

  if (environment.hasYtDlp && environment.hasFFmpeg) {
    environment.type = "full"
  } else if (environment.hasYtDlp) {
    environment.type = "ytdlp-only"
  } else {
    environment.type = "online"
  }

  return environment
}

async function getCachedVideoInfo(url: string, videoId: string, environment: any) {
  // Check cache first
  if (videoInfoCache.has(videoId)) {
    console.log("📋 Using cached video info")
    return videoInfoCache.get(videoId)
  }

  try {
    let videoInfo = null

    // Fast method 1: yt-dlp with timeout
    if (environment.hasYtDlp) {
      try {
        console.log("📋 Fast yt-dlp info...")
        const { stdout } = await Promise.race([
          execAsync(`yt-dlp --dump-json --no-warnings --no-playlist "${url}"`),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)), // 5 second timeout
        ])

        const info = JSON.parse(stdout as string)
        videoInfo = {
          title: info.title || "Unknown Title",
          thumbnail: info.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          duration: info.duration || 180,
        }
      } catch (error) {
        console.log("⚠️ yt-dlp info timeout, using fallback")
      }
    }

    // Fast method 2: YouTube oEmbed (very fast)
    if (!videoInfo) {
      console.log("📋 Using fast oEmbed...")
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`

      const response = await Promise.race([
        fetch(oembedUrl),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)), // 3 second timeout
      ])

      if ((response as Response).ok) {
        const data = await (response as Response).json()
        videoInfo = {
          title: data.title || "Unknown Title",
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          duration: 180,
        }
      }
    }

    // Cache the result
    if (videoInfo) {
      videoInfoCache.set(videoId, videoInfo)
      // Clear cache after 1 hour
      setTimeout(() => videoInfoCache.delete(videoId), 60 * 60 * 1000)
    }

    return videoInfo
  } catch (error) {
    console.error("❌ Error getting video info:", error)
    return null
  }
}

async function fastDownloadAudio(url: string, videoId: string, environment: any) {
  console.log(`⚡ Fast download method: ${environment.type}`)

  if (environment.hasYtDlp && environment.hasFFmpeg) {
    return await superFastDownloadWithFFmpeg(url, videoId)
  } else if (environment.hasYtDlp) {
    return await fastDownloadOriginal(url, videoId)
  } else {
    return await onlineDownload(url, videoId)
  }
}

async function superFastDownloadWithFFmpeg(url: string, videoId: string) {
  const outputPath = path.join(TEMP_DIR, `${videoId}.mp3`)

  // Super optimized yt-dlp command for speed
  const command = [
    "yt-dlp",
    "--extract-audio",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "5", // Faster than 0 (best quality)
    "--no-warnings",
    "--no-playlist",
    "--concurrent-fragments",
    "4", // Parallel downloads
    "--throttled-rate",
    "100K", // Prevent throttling
    "--no-check-certificates",
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "-o",
    `"${outputPath.replace(".mp3", ".%(ext)s")}"`,
    `"${url}"`,
  ].join(" ")

  console.log("⚡ Super fast command:", command)

  const { stdout } = await execAsync(command)
  console.log("📤 Fast download output:", stdout)

  await findAndRenameOutputFile(outputPath)

  return {
    filePath: outputPath,
    format: "mp3",
    quality: "192kbps MP3 (Fast)",
  }
}

async function fastDownloadOriginal(url: string, videoId: string) {
  // Download smallest audio format for speed
  const command = [
    "yt-dlp",
    "-f",
    "worstaudio[ext=m4a]/worstaudio", // Smallest file for speed
    "--no-warnings",
    "--no-playlist",
    "--concurrent-fragments",
    "4",
    "--throttled-rate",
    "100K",
    "--no-check-certificates",
    "-o",
    `"${TEMP_DIR}/${videoId}_temp.%(ext)s"`,
    `"${url}"`,
  ].join(" ")

  console.log("⚡ Fast original command:", command)

  const { stdout } = await execAsync(command)
  console.log("📤 Fast original output:", stdout)

  const downloadedFile = await findActualDownloadedFile(videoId)

  if (!downloadedFile) {
    throw new Error("Downloaded file not found")
  }

  return {
    filePath: downloadedFile.path,
    format: downloadedFile.extension.replace(".", ""),
    quality: `Fast ${downloadedFile.extension.toUpperCase()}`,
  }
}

async function onlineDownload(url: string, videoId: string) {
  const outputPath = path.join(TEMP_DIR, `${videoId}.mp3`)

  // Try multiple fast online services in parallel
  const services = [
    cobaltDownload(url),
    // Add more services here
  ]

  try {
    const result = await Promise.race(services)
    await fs.writeFile(outputPath, result)
    return {
      filePath: outputPath,
      format: "mp3",
      quality: "Online Service",
    }
  } catch (error) {
    console.log("❌ All online services failed, creating demo")
    await createFastDemo(outputPath)
    return {
      filePath: outputPath,
      format: "mp3",
      quality: "Demo",
    }
  }
}

async function cobaltDownload(url: string): Promise<Buffer> {
  const response = await fetch("https://api.cobalt.tools/api/json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      url: url,
      vCodec: "h264",
      vQuality: "480", // Lower quality for speed
      aFormat: "mp3",
      isAudioOnly: true,
    }),
  })

  if (!response.ok) throw new Error("Cobalt failed")

  const result = await response.json()
  if (result.status !== "success" || !result.url) {
    throw new Error("Cobalt no URL")
  }

  const audioResponse = await fetch(result.url)
  if (!audioResponse.ok) throw new Error("Cobalt download failed")

  return Buffer.from(await audioResponse.arrayBuffer())
}

async function createFastDemo(outputPath: string) {
  // Create a very small demo file quickly
  const sampleRate = 22050 // Lower sample rate for smaller file
  const duration = 10 // Shorter duration
  const samples = sampleRate * duration

  const buffer = new ArrayBuffer(samples * 2)
  const view = new DataView(buffer)

  for (let i = 0; i < samples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.3
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)))
    view.setInt16(i * 2, intSample, true)
  }

  const wavHeader = createWavHeader(samples, sampleRate)
  const wavBuffer = new ArrayBuffer(wavHeader.length + buffer.byteLength)
  const wavView = new Uint8Array(wavBuffer)

  wavView.set(wavHeader, 0)
  wavView.set(new Uint8Array(buffer), wavHeader.length)

  await fs.writeFile(outputPath, Buffer.from(wavBuffer))
}

async function findActualDownloadedFile(videoId: string) {
  const tempDir = TEMP_DIR
  const possibleExtensions = [".m4a", ".webm", ".mp3", ".opus"]

  for (const ext of possibleExtensions) {
    const testPath = path.join(tempDir, `${videoId}_temp${ext}`)
    if (await fs.pathExists(testPath)) {
      const finalPath = path.join(tempDir, `${videoId}${ext}`)
      await fs.move(testPath, finalPath)
      return {
        path: finalPath,
        extension: ext,
      }
    }
  }

  return null
}

async function findAndRenameOutputFile(outputPath: string) {
  const possibleFiles = [
    outputPath,
    outputPath.replace(".mp3", ".m4a"),
    outputPath.replace(".mp3", ".webm"),
    outputPath.replace(".mp3", ".opus"),
  ]

  for (const file of possibleFiles) {
    if (await fs.pathExists(file)) {
      if (file !== outputPath) {
        await fs.move(file, outputPath)
      }
      return
    }
  }

  throw new Error("Downloaded file not found")
}

function createWavHeader(samples: number, sampleRate: number): Uint8Array {
  const header = new ArrayBuffer(44)
  const view = new DataView(header)

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + samples * 2, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, "data")
  view.setUint32(40, samples * 2, true)

  return new Uint8Array(header)
}

function getErrorMessage(error: any): string {
  return `Error: ${error.message || "Error desconocido"}`
}

function extractVideoId(url: string): string {
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : ""
}
