// api/analyser.js
// Vercel Serverless Function
// Tar imot PDF eller bilde, sender til Claude API, returnerer JSON med skattedata

import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { base64, mediaType, label } = req.body;

    if (!base64 || !mediaType) {
      return res.status(400).json({ error: 'Mangler fildata' });
    }

    const isPDF = mediaType === 'application/pdf';

    const prompt = `Du er en norsk skatteekspert. Les dette dokumentet — det er en norsk skattemelding for inntektsåret 2025${label ? ` (${label})` : ''}.

Trekk ut ALLE relevante tall nøyaktig som de står i dokumentet.
Svar KUN med et gyldig JSON-objekt. Ingen tekst utenfor JSON. Ingen markdown.

{
  "lønnsinntekt": 0,
  "naturalytelser": 0,
  "pensjonsinntekt": 0,
  "næringsinntekt": 0,
  "kapitalinntekt": 0,
  "renteinntekter": 0,
  "aksjeutbytte": 0,
  "kundeutbytte": 0,
  "dagpenger": 0,
  "arbeidsavklaringspenger": 0,
  "uføretrygd": 0,
  "leieinntekter": 0,
  "andreinntekter": 0,
  "minstefradrag": 0,
  "gjeldsrenter": 0,
  "foreldrefradrag": 0,
  "fagforeningskontingent": 0,
  "bsuInnskudd": 0,
  "gaverFrivillige": 0,
  "ipsPensjonssparing": 0,
  "reisefradrag": 0,
  "saerfradrag": 0,
  "forvaltningskostnader": 0,
  "andreFradrag": 0,
  "totalGjeld": 0,
  "primærboligFormuesverdi": 0,
  "primærboligMarkedsverdi": 0,
  "primærboligEierandel": 100,
  "sekundærboligVerdi": 0,
  "bankinnskudd": 0,
  "aksjesparekonto": 0,
  "kjøretøyFormue": 0,
  "andreFormuesverdier": 0,
  "forskuddstrekk": 0,
  "alminneligInntekt": 0,
  "beregnetSkatt": 0,
  "tilGode": 0,
  "restskatt": 0,
  "antallBarnUnder12": 0,
  "notater": "Kort oppsummering av hva som ble funnet"
}

Viktige regler:
- Bruk tall direkte fra dokumentet der de finnes
- minstefradrag: bruk beløpet oppgitt i dokumentet (ikke beregn)
- gjeldsrenter: summer ALLE renter på alle lån
- totalGjeld: summer ALLE lånesaldi (din andel)
- primærboligEierandel: prosent (f.eks. 50 hvis du eier halvparten)
- forskuddstrekk: det som allerede er trukket i lønn
- Hvis dokumentet viser "til gode" beløp, sett tilGode til det beløpet
- antallBarnUnder12: tell barn med fødselsdato etter 2013
- Bruk 0 for felt som ikke finnes i dokumentet`;

    const contentBlocks = isPDF
      ? [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: prompt },
        ]
      : [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt },
        ];

    const response = await client.messages.create({
      model: 'claude-opus-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const rawText = response.content?.find(b => b.type === 'text')?.text || '';

    let jsonStr = rawText.trim();
    const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1].trim();
    else {
      const a = jsonStr.indexOf('{'), b = jsonStr.lastIndexOf('}');
      if (a !== -1 && b !== -1) jsonStr = jsonStr.slice(a, b + 1);
    }

    const data = JSON.parse(jsonStr);
    return res.status(200).json({ ok: true, data });

  } catch (err) {
    console.error('Analyser error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Intern serverfeil' });
  }
}
