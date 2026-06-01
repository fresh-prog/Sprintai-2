// Aggregates anonymized sprint-score data by country for the Global Talent
// Map. Returns one row per country with N athletes + mean / max sprint score.

import { prisma } from '../config/db.js';

export async function aggregate(_req, res) {
  // Pull every athlete that has at least one completed session with a
  // sprint score, group by country, compute the aggregate.
  const rows = await prisma.$queryRaw`
    SELECT
      a.country                                AS country,
      COUNT(DISTINCT a.id)                     AS athletes,
      COUNT(s.id)                              AS sessions,
      AVG(m.value)::float                      AS avg_score,
      MAX(m.value)::float                      AS max_score
    FROM athlete a
    JOIN session s ON s.athlete_id = a.id
    JOIN metric  m ON m.session_id = s.id AND m.name = 'sprint.sprint_score'
    WHERE s.status = 'COMPLETED' AND a.country IS NOT NULL
    GROUP BY a.country
    ORDER BY athletes DESC;
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
