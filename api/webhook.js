// api/webhook.js
// Stripe webhook — kjøres når noen betaler 99 kr
// Lagrer e-post + tilgang til Supabase

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

module.exports.config = {
  api: {
    bodyParser: false, // Stripe krever raw body for signaturverifisering
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Hjelpefunksjon: les raw body
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature feil:', err.message);
    return res.status(400).json({ error: `Webhook feil: ${err.message}` });
  }

  // Kun håndter vellykkede betalinger
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email;

    if (!email) {
      console.error('Ingen e-post i session');
      return res.status(200).json({ received: true });
    }

    // Utløpsdato: 31. desember inneværende år kl 23:59
    const now = new Date();
    const expiry = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();

    // Lagre i Supabase (upsert — oppdater hvis e-post finnes fra før)
    const { error } = await supabase
      .from('tilganger')
      .upsert({
        email: email.toLowerCase(),
        år: now.getFullYear(),
        utløper: expiry,
        betalt: true,
        stripe_session: session.id,
        opprettet: new Date().toISOString(),
      }, {
        onConflict: 'email,år'
      });

    if (error) {
      console.error('Supabase feil:', error);
      return res.status(500).json({ error: 'Kunne ikke lagre tilgang' });
    }

    console.log(`✅ Tilgang gitt til ${email} til ${expiry}`);
  }

  return res.status(200).json({ received: true });
};
