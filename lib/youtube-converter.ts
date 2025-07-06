import youtubeDl from "youtube-dl-exec"
import ffmpeg from "fluent-ffmpeg"
import fs from "fs-extra"
import path from "path"

export interface ConversionOptions {
  quality: "128" | "192" | "320"
  format: "mp3" | "m4a" | "wav"
}

export class YouTubeConverter {
  private tempDir: string

  constructor(tempDir: string = path.join(process.cwd(), "temp")) {
    this.tempDir = tempDir
    fs.ensureDirSync(this.tempDir)
  }

  async getVideoInfo(url: string) {
    try {
      const info = await youtubeDl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: ["referer:youtube.com", "user-agent:googlebot"],
      })

      return {
        id: info.id,
        title: info.title,
        duration: info.duration,
        thumbnail: info.thumbnail,
        uploader: info.uploader,
        viewCount: info.view_count,
        uploadDate: info.upload_date,
      }
    } catch (error) {
      console.error("Error getting video info:", error)
      throw new Error("Failed to get video information")
    }
  }

  async convertToAudio(
    url: string,
    videoId: string,
    options: ConversionOptions = { quality: "320", format: "mp3" },
  ): Promise<string> {
    const tempVideoPath = path.join(this.tempDir, `${videoId}_temp`)
    const outputPath = path.join(this.tempDir, `${videoId}.${options.format}`)

    try {
      // Step 1: Download audio using youtube-dl
      await this.downloadAudio(url, tempVideoPath, options)

      // Step 2: Convert using FFmpeg if needed
      if (options.format !== "mp3" || options.quality !== "320") {
        await this.convertWithFFmpeg(tempVideoPath, outputPath, options)
      }

      return outputPath
    } catch (error) {
      // Cleanup on error
      await this.cleanup([tempVideoPath, outputPath])
      throw error
    }
  }

  private async downloadAudio(url: string, outputPath: string, options: ConversionOptions) {
    const downloadOptions: any = {
      output: `${outputPath}.%(ext)s`,
      format: "bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio",
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    }

    if (options.format === "mp3") {
      downloadOptions.extractAudio = true
      downloadOptions.audioFormat = "mp3"
      downloadOptions.audioQuality = options.quality === "320" ? 0 : Number.parseInt(options.quality)
    }

    await youtubeDl(url, downloadOptions)
  }

  private async convertWithFFmpeg(inputPath: string, outputPath: string, options: ConversionOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      // Find actual input file
      const possibleExtensions = [".m4a", ".webm", ".mp4", ".mp3"]
      let actualInputPath = ""

      for (const ext of possibleExtensions) {
        const testPath = inputPath + ext
        if (fs.existsSync(testPath)) {
          actualInputPath = testPath
          break
        }
      }

      if (!actualInputPath) {
        reject(new Error("Input file not found"))
        return
      }

      const command = ffmpeg(actualInputPath).toFormat(options.format).audioChannels(2).audioFrequency(44100)

      // Set bitrate based on quality
      if (options.format === "mp3") {
        command.audioBitrate(Number.parseInt(options.quality))
      }

      command
        .on("start", (commandLine) => {
          console.log("FFmpeg started:", commandLine)
        })
        .on("progress", (progress) => {
          console.log(`Processing: ${progress.percent?.toFixed(1) || 0}% done`)
        })
        .on("end", async () => {
          console.log("Conversion finished")
          await this.cleanup([actualInputPath])
          resolve()
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err)
          reject(err)
        })
        .save(outputPath)
    })
  }

  private async cleanup(paths: string[]) {
    for (const filePath of paths) {
      try {
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath)
        }
      } catch (error) {
        console.error(`Error cleaning up ${filePath}:`, error)
      }
    }
  }

  async cleanupOldFiles(maxAgeMinutes = 30) {
    try {
      const files = await fs.readdir(this.tempDir)
      const now = Date.now()

      for (const file of files) {
        const filePath = path.join(this.tempDir, file)
        const stats = await fs.stat(filePath)
        const ageMinutes = (now - stats.mtime.getTime()) / (1000 * 60)

        if (ageMinutes > maxAgeMinutes) {
          await fs.remove(filePath)
          console.log(`Cleaned up old file: ${file}`)
        }
      }
    } catch (error) {
      console.error("Error during cleanup:", error)
    }
  }
}
