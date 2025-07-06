export interface VideoInfo {
  id: string
  title: string
  thumbnail: string
  duration: number // in seconds
  fileSize: string
  downloadUrl: string
  quality: string
  format?: string // Add format field
  isDemo?: boolean // Flag to indicate demo content
}

export interface ConversionRequest {
  videoId: string
  url: string
}

export interface ConversionResponse {
  success: boolean
  data?: VideoInfo
  error?: string
}
