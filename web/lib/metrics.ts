/**
 * Pure participation metrics — no external calls, no side effects.
 *
 * Worked example (2 speakers, A and B):
 *
 * utterances = [
 *   { speaker: "A", text: "Hello there",  start: 0,    end: 2000, sentiment: "POSITIVE" },
 *   { speaker: "B", text: "How are you",  start: 2500, end: 5500, sentiment: "NEUTRAL"  },
 *   { speaker: "A", text: "I am fine",    start: 6000, end: 7000, sentiment: "NEUTRAL"  },
 * ]
 * speakerMap = { A: "Alice" }
 *
 * Speaker A: talkTimeSec = (2000 + 1000) / 1000 = 3.0
 *            words       = 2 + 3 = 5
 *            turns       = 2
 *            avgSentiment= (1 + 0) / 2 = 0.5
 * Speaker B: talkTimeSec = 3000 / 1000 = 3.0
 *            words       = 3
 *            turns       = 1
 *            avgSentiment= 0 / 1 = 0.0
 * totalTalkTime = 6.0
 *
 * Expected output (sorted by talkTimeSec desc — tie: original insertion order):
 * [
 *   { speaker: "A", employeeName: "Alice",     talkTimeSec: 3.0, talkPct: 50, turns: 2, words: 5, avgSentimentScore: 0.50 },
 *   { speaker: "B", employeeName: "Speaker B", talkTimeSec: 3.0, talkPct: 50, turns: 1, words: 3, avgSentimentScore: 0.00 },
 * ]
 */

import type { Utterance, SpeakerMap, Participation } from "@/lib/types";

const SENTIMENT_SCORE = { POSITIVE: 1, NEUTRAL: 0, NEGATIVE: -1 } as const;

/**
 * Resolve a diarization label to a human-readable name.
 * Falls back to "Speaker <label>" if not found in the map.
 */
export function resolveName(label: string, speakerMap: SpeakerMap): string {
  return speakerMap[label] ?? `Speaker ${label}`;
}

/**
 * Compute per-speaker participation metrics from a list of utterances.
 * Returns results sorted by talkTimeSec descending.
 */
export function computeParticipation(
  utterances: Utterance[],
  speakerMap: SpeakerMap
): Participation[] {
  // Group utterances by speaker label, preserving first-seen order.
  const order: string[] = [];
  const groups = new Map<string, Utterance[]>();

  for (const u of utterances) {
    if (!groups.has(u.speaker)) {
      groups.set(u.speaker, []);
      order.push(u.speaker);
    }
    groups.get(u.speaker)!.push(u);
  }

  // Compute raw talk time per speaker.
  const talkTimes = new Map<string, number>();
  for (const [speaker, turns] of groups) {
    const ms = turns.reduce((sum, u) => sum + (u.end - u.start), 0);
    talkTimes.set(speaker, ms);
  }

  const totalMs = [...talkTimes.values()].reduce((a, b) => a + b, 0);

  const results: Participation[] = order.map((speaker) => {
    const turns = groups.get(speaker)!;
    const speakerMs = talkTimes.get(speaker)!;

    const talkTimeSec = Math.round((speakerMs / 1000) * 10) / 10;
    const talkPct =
      totalMs === 0
        ? 0
        : Math.round((speakerMs / totalMs) * 100);

    const words = turns.reduce(
      (sum, u) => sum + u.text.trim().split(/\s+/).filter(Boolean).length,
      0
    );

    const sentimentedTurns = turns.filter((u) => u.sentiment !== undefined);
    const avgSentimentScore =
      sentimentedTurns.length === 0
        ? 0
        : Math.round(
            (sentimentedTurns.reduce(
              (sum, u) => sum + SENTIMENT_SCORE[u.sentiment!],
              0
            ) /
              sentimentedTurns.length) *
              100
          ) / 100;

    return {
      speaker,
      employeeName: resolveName(speaker, speakerMap),
      talkTimeSec,
      talkPct,
      turns: turns.length,
      words,
      avgSentimentScore,
    };
  });

  // Sort by talkTimeSec descending; stable sort preserves insertion order on ties.
  results.sort((a, b) => b.talkTimeSec - a.talkTimeSec);

  return results;
}
