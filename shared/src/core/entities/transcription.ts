export interface TranscriptSegment {
  /** Portion of text recognized for a section of audio */
  text: string
  /** Start time in seconds from beginning of audio */
  start?: number
  /** End time in seconds from beginning of audio */
  end?: number
  /** Confidence score from the provider */
  confidence?: number
}

/**
 * Represents a transcription composed of multiple segments. This can be used
 * for both batch and real-time transcription results.
 */
export interface Transcript {
  text: string
  segments?: TranscriptSegment[]
}

export default Transcript
