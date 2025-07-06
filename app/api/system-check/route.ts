import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function GET() {
  const checks = {
    ytDlp: false,
    youtubeDl: false,
    ffmpeg: false,
    python: false,
    node: false,
  }

  const versions: Record<string, string> = {}

  try {
    // Check yt-dlp
    try {
      const { stdout } = await execAsync("yt-dlp --version")
      checks.ytDlp = true
      versions.ytDlp = stdout.trim()
    } catch (error) {
      console.log("yt-dlp not found")
    }

    // Check youtube-dl
    try {
      const { stdout } = await execAsync("youtube-dl --version")
      checks.youtubeDl = true
      versions.youtubeDl = stdout.trim()
    } catch (error) {
      console.log("youtube-dl not found")
    }

    // Check ffmpeg
    try {
      const { stdout } = await execAsync("ffmpeg -version")
      checks.ffmpeg = true
      versions.ffmpeg = stdout.split("\n")[0]
    } catch (error) {
      console.log("ffmpeg not found")
    }

    // Check python
    try {
      const { stdout } = await execAsync("python3 --version")
      checks.python = true
      versions.python = stdout.trim()
    } catch (error) {
      try {
        const { stdout } = await execAsync("python --version")
        checks.python = true
        versions.python = stdout.trim()
      } catch (error2) {
        console.log("python not found")
      }
    }

    // Check node
    try {
      const { stdout } = await execAsync("node --version")
      checks.node = true
      versions.node = stdout.trim()
    } catch (error) {
      console.log("node not found")
    }

    return NextResponse.json({
      status: "success",
      checks,
      versions,
      recommendations: getRecommendations(checks),
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: error.message,
      checks,
      versions,
    })
  }
}

function getRecommendations(checks: Record<string, boolean>) {
  const recommendations = []

  if (!checks.ytDlp && !checks.youtubeDl) {
    recommendations.push("Install yt-dlp: pip install yt-dlp")
  }

  if (!checks.ffmpeg) {
    recommendations.push("Install FFmpeg: https://ffmpeg.org/download.html")
  }

  if (!checks.python) {
    recommendations.push("Install Python: https://python.org/downloads/")
  }

  if (recommendations.length === 0) {
    recommendations.push("All dependencies are installed correctly!")
  }

  return recommendations
}
