import { type NextRequest, NextResponse } from "next/server"
import fs from "fs-extra"
import path from "path"

const TEMP_DIR = path.join(process.cwd(), "temp")

export async function GET(request: NextRequest, { params }: { params: { videoId: string } }) {
  try {
    const { videoId } = params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "mp3"

    // Find the actual file
    const filePath = await findVideoFile(videoId)

    if (!filePath) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
    }

    console.log(`📁 Serving file: ${filePath}`)

    // Read the file
    const fileBuffer = await fs.readFile(filePath)
    const stats = await fs.stat(filePath)

    // Determine content type based on file extension
    const ext = path.extname(filePath).toLowerCase()
    const contentType = getContentType(ext)
    const fileName = `youtube-${videoId}${ext}`

    console.log(`📤 Serving ${fileName} (${contentType})`)

    // Create response with proper headers
    const response = new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": stats.size.toString(),
        "Cache-Control": "no-cache",
      },
    })

    // Schedule file cleanup after 5 minutes
    setTimeout(
      async () => {
        try {
          if (await fs.pathExists(filePath)) {
            await fs.remove(filePath)
            console.log(`🧹 Cleaned up temp file: ${fileName}`)
          }
        } catch (error) {
          console.error("Error cleaning up file:", error)
        }
      },
      5 * 60 * 1000,
    )

    return response
  } catch (error) {
    console.error("Error serving download:", error)
    return NextResponse.json({ error: "Error al descargar archivo" }, { status: 500 })
  }
}

async function findVideoFile(videoId: string): Promise<string | null> {
  const possibleExtensions = [".mp3", ".m4a", ".webm", ".opus", ".aac", ".wav"]

  for (const ext of possibleExtensions) {
    const filePath = path.join(TEMP_DIR, `${videoId}${ext}`)
    if (await fs.pathExists(filePath)) {
      return filePath
    }
  }

  return null
}

function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".webm": "audio/webm",
    ".opus": "audio/opus",
    ".aac": "audio/aac",
    ".wav": "audio/wav",
  }

  return contentTypes[extension] || "audio/mpeg"
}
