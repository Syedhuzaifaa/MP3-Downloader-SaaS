import { type NextRequest, NextResponse } from "next/server"
import fs from "fs-extra"
import path from "path"

const TEMP_DIR = path.join(process.cwd(), "temp")

export async function GET(request: NextRequest, { params }: { params: { videoId: string } }) {
  try {
    const { videoId } = params

    // Check if file exists and get its size
    const possibleExtensions = [".mp3", ".m4a", ".webm", ".opus"]
    let fileInfo = null

    for (const ext of possibleExtensions) {
      const filePath = path.join(TEMP_DIR, `${videoId}${ext}`)
      if (await fs.pathExists(filePath)) {
        const stats = await fs.stat(filePath)
        fileInfo = {
          exists: true,
          size: stats.size,
          sizeInMB: (stats.size / (1024 * 1024)).toFixed(1),
          format: ext.replace(".", ""),
          ready: true,
        }
        break
      }
    }

    if (!fileInfo) {
      // File doesn't exist yet, still processing
      fileInfo = {
        exists: false,
        ready: false,
        status: "processing",
      }
    }

    return NextResponse.json(fileInfo)
  } catch (error) {
    return NextResponse.json({ error: "Error checking progress" }, { status: 500 })
  }
}
