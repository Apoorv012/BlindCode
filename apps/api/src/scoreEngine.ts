import Problem from './models/Problem'

/**
 * Recalculates a participant's total score from scratch.
 * Source of truth — used by both socket events and HTTP routes.
 *
 * Uses TOP-LEVEL counters (set via atomic $inc, immune to race conditions):
 *   totalScore = Σ(solved problem points) - (wrongSubmissions × 15) - (reveals × 5)
 *
 * Score is clamped to 0 minimum.
 */
export async function recalculateScore(participant: any): Promise<number> {
  let total = 0

  // A. Add points for each solved problem
  for (const solvedId of (participant.solvedProblemIds || [])) {
    const prob = await Problem.findById(solvedId)
    if (prob) {
      const d = String(prob.difficulty)
      const fallbackPoints = d === 'Easy' ? 100 : d === 'Medium' ? 200 : 300
      total += (prob.points || fallbackPoints)
    }
  }

  // B. Subtract penalties using TOP-LEVEL counters (atomic, race-safe)
  total -= ((participant.wrongSubmissions || 0) * 15)
  total -= ((participant.reveals || 0) * 5)

  return Math.max(0, total)
}
