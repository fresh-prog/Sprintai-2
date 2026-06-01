import { z } from 'zod';

const SPRINT_EVENTS = ['S100M', 'S200M', 'S400M', 'RELAY', 'PRACTICE'];

export const createAthleteSchema = z.object({
  fullName:     z.string().min(1).max(120),
  dateOfBirth:  z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  sex:          z.enum(['M', 'F', 'X']).optional(),
  heightCm:     z.number().min(50).max(260).optional(),
  weightKg:     z.number().min(15).max(300).optional(),
  country:      z.string().length(2).optional(),
  primaryEvent: z.enum(SPRINT_EVENTS).default('S100M'),
  notes:        z.string().max(2000).optional(),
  // Optional link to an existing user (e.g. when a coach adds their own
  // athlete who is also a user account).
  userId:       z.string().uuid().optional(),
});

export const updateAthleteSchema = createAthleteSchema.partial();

export const athleteIdParam = z.object({ id: z.string().uuid() });
