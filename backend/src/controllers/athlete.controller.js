import * as svc from '../services/athlete.service.js';

export async function create(req, res) {
  const athlete = await svc.createAthlete(req.user, req.body);
  res.status(201).json(athlete);
}

export async function list(req, res) {
  res.json(await svc.listAthletes(req.user, {
    page:  Number(req.query.page)  || undefined,
    limit: Number(req.query.limit) || undefined,
  }));
}

export async function get(req, res) {
  res.json(await svc.getAthlete(req.user, req.params.id));
}

export async function update(req, res) {
  res.json(await svc.updateAthlete(req.user, req.params.id, req.body));
}

export async function destroy(req, res) {
  await svc.deleteAthlete(req.user, req.params.id);
  res.status(204).end();
}

export async function bulkUpload(req, res) {
  const csv = req.file?.buffer?.toString('utf8');
  if (!csv) return res.status(400).json({ error: { code: 'NO_FILE', message: 'CSV file required' } });
  const result = await svc.bulkUpload(req.user, csv);
  res.status(201).json(result);
}
