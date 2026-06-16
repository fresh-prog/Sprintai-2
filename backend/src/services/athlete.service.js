// Athlete domain service. Coaches own a roster; researchers can query the
// whole population (with consent flagged in athlete.notes for now — a proper
// consent table is in the v2 roadmap). Athletes themselves can manage their
// own single profile.

import { prisma } from '../config/db.js';
import { Forbidden, NotFound } from '../utils/errors.js';

function normalizeDob(input) {
  if (!input) return undefined;
  // Accept both "YYYY-MM-DD" and full ISO.
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Who may create/update/delete an athlete. RESEARCHERs are deliberately NOT
// included — their access is read-only and anonymized (see anonymizeFor).
function canManage(user, athlete) {
  if (user.role === 'ADMIN') return true;
  if (athlete.userId && athlete.userId === user.id) return true;
  if (athlete.coachId && athlete.coachId === user.id) return true;
  return false;
}

// Strip directly-identifying PII for the RESEARCHER role, which gets
// population-wide read access for analysis but must not see who's who.
function anonymizeFor(user, athlete) {
  if (!athlete || user.role !== 'RESEARCHER') return athlete;
  return {
    ...athlete,
    fullName: `Athlete ${String(athlete.id).slice(0, 8)}`,
    dateOfBirth: null,
    notes: null,
  };
}

export async function createAthlete(user, data) {
  // Researchers have read-only access; they can't create roster entries.
  if (user.role === 'RESEARCHER') throw Forbidden();
  // Coaches default coachId to themselves; athletes default userId to themselves.
  const isCoach = user.role === 'COACH' || user.role === 'ADMIN';
  return prisma.athlete.create({
    data: {
      ...data,
      dateOfBirth: normalizeDob(data.dateOfBirth),
      coachId: isCoach ? user.id : null,
      userId: data.userId ?? (user.role === 'ATHLETE' ? user.id : null),
    },
  });
}

export async function listAthletes(user, { page = 1, limit = 50 } = {}) {
  // Scope by role: COACH sees their roster, ATHLETE sees their own profile,
  // RESEARCHER/ADMIN see everyone.
  const where =
    user.role === 'ADMIN' || user.role === 'RESEARCHER'
      ? {}
      : user.role === 'COACH'
      ? { coachId: user.id }
      : { userId: user.id };

  const [data, total] = await Promise.all([
    prisma.athlete.findMany({
      where, orderBy: { fullName: 'asc' },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.athlete.count({ where }),
  ]);
  return { data: data.map((a) => anonymizeFor(user, a)), page, limit, total };
}

// Internal: fetch + authorize WITHOUT anonymizing, for write paths that need
// the real record (id, coachId, etc.). Read paths should use getAthlete.
async function loadAuthorized(user, id) {
  const athlete = await prisma.athlete.findUnique({ where: { id } });
  if (!athlete) throw NotFound('Athlete not found');
  // Owners/coaches/admin can access; researchers get read-only (handled below).
  if (!canManage(user, athlete) && user.role !== 'RESEARCHER') throw Forbidden();
  return athlete;
}

export async function getAthlete(user, id) {
  return anonymizeFor(user, await loadAuthorized(user, id));
}

export async function updateAthlete(user, id, patch) {
  const athlete = await loadAuthorized(user, id);
  if (!canManage(user, athlete)) throw Forbidden();
  return prisma.athlete.update({
    where: { id: athlete.id },
    data: { ...patch, dateOfBirth: normalizeDob(patch.dateOfBirth) },
  });
}

export async function deleteAthlete(user, id) {
  const athlete = await loadAuthorized(user, id);
  if (!canManage(user, athlete)) throw Forbidden();
  await prisma.athlete.delete({ where: { id: athlete.id } });
}

// CSV columns supported (in any order, case-insensitive):
//   full_name (required), primary_event, date_of_birth, sex,
//   height_cm, weight_kg, country, notes
const EVENT_NORMALIZE = {
  '100': 'S100M', '100m': 'S100M', 's100m': 'S100M',
  '200': 'S200M', '200m': 'S200M', 's200m': 'S200M',
  '400': 'S400M', '400m': 'S400M', 's400m': 'S400M',
  'relay': 'RELAY', 'practice': 'PRACTICE',
};

/**
 * Bulk-create athletes from a CSV string. Returns per-row {ok, error?}.
 * Coaches default coachId to themselves. Skips rows missing full_name.
 */
export async function bulkUpload(user, csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return { created: 0, results: [], reason: 'empty CSV' };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, '_'));
  const results = [];
  let created = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i]);
    const row = {};
    headers.forEach((h, j) => { row[h] = (cells[j] ?? '').trim(); });

    if (!row.full_name) {
      results.push({ line: i + 1, ok: false, error: 'missing full_name' });
      continue;
    }
    const data = {
      fullName:    row.full_name,
      primaryEvent: EVENT_NORMALIZE[row.primary_event?.toLowerCase()] ?? 'S100M',
      dateOfBirth: row.date_of_birth ? normalizeDob(row.date_of_birth) : undefined,
      sex:         row.sex || undefined,
      heightCm:    row.height_cm ? Number(row.height_cm) : undefined,
      weightKg:    row.weight_kg ? Number(row.weight_kg) : undefined,
      country:     row.country ? row.country.slice(0, 2).toUpperCase() : undefined,
      notes:       row.notes || undefined,
    };

    try {
      await createAthlete(user, data);
      created++;
      results.push({ line: i + 1, ok: true, name: data.fullName });
    } catch (e) {
      results.push({ line: i + 1, ok: false, error: e.message });
    }
  }

  return { created, total: lines.length - 1, results };
}

function parseCsvRow(row) {
  // Minimal CSV parser — handles quoted fields with commas inside.
  const out = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (inQuotes) {
      if (c === '"' && row[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"') inQuotes = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}
