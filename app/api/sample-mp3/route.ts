import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get("videoId") || "demo"

    // Generate different tones based on video ID for demo purposes
    const frequency = getFrequencyFromVideoId(videoId)

    // Generate a simple audio tone
    const sampleRate = 44100
    const duration = 10 // 10 seconds
    const samples = sampleRate * duration

    // Create a simple sine wave with different frequency per video
    const buffer = new ArrayBuffer(samples * 2)
    const view = new DataView(buffer)

    for (let i = 0; i < samples; i++) {
      const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.3
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)))
      view.setInt16(i * 2, intSample, true)
    }

    // Create WAV header
    const wavHeader = createWavHeader(samples, sampleRate)
    const wavBuffer = new ArrayBuffer(wavHeader.length + buffer.byteLength)
    const wavView = new Uint8Array(wavBuffer)

    wavView.set(wavHeader, 0)
    wavView.set(new Uint8Array(buffer), wavHeader.length)

    return new NextResponse(wavBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `attachment; filename="demo-audio-${videoId}.wav"`,
        "Content-Length": wavBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("Error generating sample MP3:", error)
    return NextResponse.json({ error: "Error generating sample audio" }, { status: 500 })
  }
}

function getFrequencyFromVideoId(videoId: string): number {
  // Generate different frequencies based on video ID
  const frequencies = [440, 523, 659, 784, 880, 1047] // Musical notes
  let hash = 0
  for (let i = 0; i < videoId.length; i++) {
    hash = ((hash << 5) - hash + videoId.charCodeAt(i)) & 0xffffffff
  }
  return frequencies[Math.abs(hash) % frequencies.length]
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
