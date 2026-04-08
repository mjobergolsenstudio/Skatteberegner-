// api/sjekk-tilgang.js
// Sjekker om en e-post har betalt tilgang for inneværende år

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  if (!email) return res.status(400).json({ harTilgang: false });

  const nå = new Date();
  const år = nå.getFullYear();

  const { data, error } = await supabase
    .from('tilganger')
    .select('utløper, betalt')
    .eq('email', email.toLowerCase())
    .eq('år', år)
    .single();

  if (error || !data) {
    return res.status(200).json({ harTilgang: false });
  }

  const utløpt = new Date(data.utløper) < nå;

  return res.status(200).json({
    harTilgang: data.betalt && !utløpt,
    utløper: data.utløper,
  });
};
