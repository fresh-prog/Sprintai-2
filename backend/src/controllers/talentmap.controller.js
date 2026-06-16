// Aggregates anonymized sprint data by country for the Global Talent Map.
// Returns one row per country with participant + session counts and the mean /
// peak sprint score. Output is aggregate-only — no individual is ever exposed,
// so a per-athlete consent gate isn't required to display it.

import { prisma } from '../config/db.js';
import { env } from '../config/env.js';

export async function aggregate(_req, res) {
  // Group completed, opted-in sessions by the country they were tagged with
  // (falling back to the athlete's home country for legacy rows). Only sessions
  // with public_ranking = true are included — an explicit, per-session consent
  // captured at record/upload time — so nothing is published without consent.
  // A HAVING floor (TALENT_MAP_MIN_ATHLETES) optionally suppresses tiny cohorts
  // so a single athlete can't be de-anonymised. Output is aggregate-only.
  // The sprint score is LEFT JOINed so a freshly-recorded session lights up its
  // country immediately, even before the async biomech score lands.
  const rows = await prisma.$queryRaw`
    SELECT
      COALESCE(s.country, a.country)           AS country,
      COUNT(DISTINCT s.user_id)                AS athletes,
      COUNT(DISTINCT s.id)                     AS sessions,
      AVG(m.value)::float                      AS avg_score,
      MAX(m.value)::float                      AS max_score
    FROM session s
    LEFT JOIN athlete a ON a.id = s.athlete_id
    LEFT JOIN metric  m ON m.session_id = s.id AND m.name = 'sprint.sprint_score'
    WHERE s.status = 'COMPLETED'
      AND s.public_ranking = true
      AND COALESCE(s.country, a.country) IS NOT NULL
    GROUP BY COALESCE(s.country, a.country)
    HAVING COUNT(DISTINCT s.user_id) >= ${env.TALENT_MAP_MIN_ATHLETES}
    ORDER BY sessions DESC;
  `;
  // BigInt → Number for the COUNT() outputs.
  const data = rows.map((r) => ({
    country: r.country,
    athletes: Number(r.athletes),
    sessions: Number(r.sessions),
    avgScore: r.avg_score,
    maxScore: r.max_score,
  }));
  res.json({ data });
}
