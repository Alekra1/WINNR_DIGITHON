import { AssemblyAI } from "assemblyai";
import type { TranscriptUtterance, SentimentAnalysisResult } from "assemblyai";
import type { Utterance, Sentiment } from "@/lib/types";

/** Normalize speaker label to a single uppercase letter.
 *  AssemblyAI uses "A","B",... but defensively handles "1","2",... too.
 */
function normalizeLabel(raw: string): string {
  // If it's already a letter, return uppercase.
  if (/^[A-Za-z]$/.test(raw)) return raw.toUpperCase();
  // If it looks numeric (1-based), convert to corresponding letter.
  const n = parseInt(raw, 10);
  if (!isNaN(n) && n >= 1 && n <= 26) {
    return String.fromCharCode(64 + n); // 1→A, 2→B, ...
  }
  // Fallback: use first character uppercased.
  return raw.charAt(0).toUpperCase();
}

/** Find the dominant sentiment from sentiment results that overlap an utterance's time range. */
function pickDominantSentiment(
  utteranceStart: number,
  utteranceEnd: number,
  utteranceSpeaker: string,
  sentimentResults: SentimentAnalysisResult[]
): Sentiment | undefined {
  const overlapping = sentimentResults.filter((s) => {
    const timeOverlaps = s.start < utteranceEnd && s.end > utteranceStart;
    const speakerMatches =
      s.speaker === null || normalizeLabel(s.speaker) === utteranceSpeaker;
    return timeOverlaps && speakerMatches;
  });

  if (overlapping.length === 0) return undefined;

  // Count occurrences of each sentiment value.
  const counts: Record<Sentiment, number> = {
    POSITIVE: 0,
    NEUTRAL: 0,
    NEGATIVE: 0,
  };
  for (const s of overlapping) {
    counts[s.sentiment as Sentiment] += 1;
  }

  // Return the sentiment with the highest count (tie-breaks: POSITIVE > NEUTRAL > NEGATIVE).
  if (counts.POSITIVE >= counts.NEUTRAL && counts.POSITIVE >= counts.NEGATIVE)
    return "POSITIVE";
  if (counts.NEUTRAL >= counts.NEGATIVE) return "NEUTRAL";
  return "NEGATIVE";
}

/**
 * Transcribe an audio file using AssemblyAI with speaker diarization and
 * sentiment analysis enabled.
 *
 * @param input - Provide either a Buffer (in-memory file) or a local file path.
 * @returns Transcript text, mapped utterances, and audio duration in seconds.
 */
export async function transcribeAudio(input: {
  buffer?: Buffer;
  filePath?: string;
}): Promise<{
  transcriptText: string;
  utterances: Utterance[];
  durationSec: number;
}> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error("ASSEMBLYAI_API_KEY environment variable is not set.");
  }

  const audio = input.buffer ?? input.filePath;
  if (!audio) {
    throw new Error("transcribeAudio requires either buffer or filePath.");
  }

  const client = new AssemblyAI({ apiKey });

  const transcript = await client.transcripts.transcribe({
    audio,
    speaker_labels: true,
    sentiment_analysis: true,
  });

  if (transcript.status === "error") {
    throw new Error(
      `AssemblyAI transcription failed: ${transcript.error ?? "unknown error"}`
    );
  }

  const rawUtterances: TranscriptUtterance[] = transcript.utterances ?? [];
  const sentimentResults: SentimentAnalysisResult[] =
    transcript.sentiment_analysis_results ?? [];

  const utterances: Utterance[] = rawUtterances.map((u) => {
    const speaker = normalizeLabel(u.speaker);
    const sentiment = pickDominantSentiment(
      u.start,
      u.end,
      speaker,
      sentimentResults
    );
    const mapped: Utterance = {
      speaker,
      text: u.text,
      start: u.start,
      end: u.end,
      confidence: u.confidence,
    };
    if (sentiment !== undefined) mapped.sentiment = sentiment;
    return mapped;
  });

  const durationSec =
    typeof transcript.audio_duration === "number"
      ? transcript.audio_duration
      : utterances.length > 0
      ? Math.max(...utterances.map((u) => u.end)) / 1000
      : 0;

  return {
    transcriptText: transcript.text ?? "",
    utterances,
    durationSec,
  };
}
