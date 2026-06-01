import * as svc from '../services/consent.service.js';

export async function list(req, res) {
  res.json({ data: await svc.list(req.user, req.params.id) });
}

export async function grant(req, res) {
  res.status(201).json(await svc.grant(req.user, req.params.id, req.body));
}

export async function revoke(req, res) {
  const { scope, formVersion } = req.body;
  res.json(await svc.revoke(req.user, req.params.id, scope, formVersion));
}
