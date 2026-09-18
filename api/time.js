export default function handler(req, res) {
  // Accès public en lecture seule, aucune donnée sensible, aucune écriture.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ serverTime: Date.now() });
}
