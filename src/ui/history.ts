/**
 * Recent results, kept in this browser only (localStorage), so several runs
 * can be combined: one short test moves by several percent from run to run,
 * and the average of a few is steadier than any single one.
 */
import { z } from 'zod'
import type { Range } from '../core/search'

export const HISTORY_KEY = 'aimtune:history'
export const MAX_HISTORY = 10
/** Runs older than this are not combined: form and setup change over weeks. */
export const COMBINE_WINDOW_DAYS = 14
/** At most this many recent runs are combined. */
export const COMBINE_MAX_RUNS = 3
/** Runs further apart than this (largest pair, ratio) count as disagreeing. */
export const DISAGREE_RATIO = 1.15
/** The combined range is never narrower than ±this. */
const MIN_HALF_WIDTH = 0.04

const Positive = z.number().positive().max(500)

const Entry = z.object({
  /** ISO timestamp. */
  at: z.string().max(40),
  kind: z.enum(['flick', 'tracking', 'full']),
  lo: Positive,
  hi: Positive,
  center: Positive,
})
export type HistoryEntry = z.infer<typeof Entry>

const History = z.array(Entry).max(100)

export function loadHistory(storage: Pick<Storage, 'getItem'> | undefined): HistoryEntry[] {
  try {
    const raw = storage?.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = History.safeParse(JSON.parse(raw))
    if (!parsed.success) return []
    return parsed.data.filter((e) => e.lo < e.hi && !Number.isNaN(Date.parse(e.at))).slice(0, MAX_HISTORY)
  } catch {
    return []
  }
}

/** Adds a run at the front and returns the new list (newest first). */
export function addToHistory(
  storage: (Pick<Storage, 'getItem'> & Pick<Storage, 'setItem'>) | undefined,
  entry: HistoryEntry,
): HistoryEntry[] {
  const next = [entry, ...loadHistory(storage)].slice(0, MAX_HISTORY)
  try {
    storage?.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    // Not remembered; still shown for this visit.
  }
  return next
}

export function clearHistory(storage: Pick<Storage, 'removeItem'> | undefined): void {
  try {
    storage?.removeItem(HISTORY_KEY)
  } catch {
    // Nothing to do.
  }
}

/** Flick-based runs (flick or full test) are comparable; tracking-only runs only with each other. */
const group = (kind: HistoryEntry['kind']) => (kind === 'tracking' ? 'tracking' : 'flick')

export interface CombinedRuns {
  /** The runs used, newest first. */
  runs: HistoryEntry[]
  center: number
  range: Range
  /** Largest ratio between two runs' centres, ≥ 1. */
  spread: number
  agreement: 'agree' | 'disagree'
}

/**
 * Combines the newest run with up to two earlier comparable runs from the last
 * two weeks: geometric mean of the centres, with a range that reflects both
 * how far the runs disagree and how wide each one was. Null with fewer than
 * two comparable runs.
 */
export function combineRecent(history: readonly HistoryEntry[], now = Date.now()): CombinedRuns | null {
  const newest = history[0]
  if (!newest) return null
  const cutoff = now - COMBINE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const runs = history
    .filter((e) => group(e.kind) === group(newest.kind) && Date.parse(e.at) >= cutoff)
    .slice(0, COMBINE_MAX_RUNS)
  if (runs.length < 2) return null

  const logs = runs.map((r) => Math.log(r.center))
  const mean = logs.reduce((a, b) => a + b, 0) / logs.length
  const spreadLog = Math.max(...logs) - Math.min(...logs)
  // Typical distance of a run from the mean, and each run's own half-width averaged down by √n.
  const sd = Math.sqrt(logs.reduce((a, x) => a + (x - mean) ** 2, 0) / (logs.length - 1))
  const ownHalf = runs.reduce((a, r) => a + Math.log(r.hi / r.lo) / 2, 0) / runs.length / Math.sqrt(runs.length)
  const half = Math.max(Math.log(1 + MIN_HALF_WIDTH), Math.hypot(sd, ownHalf))

  return {
    runs,
    center: Math.exp(mean),
    range: { lo: Math.exp(mean - half), hi: Math.exp(mean + half) },
    spread: Math.exp(spreadLog),
    agreement: Math.exp(spreadLog) > DISAGREE_RATIO ? 'disagree' : 'agree',
  }
}
