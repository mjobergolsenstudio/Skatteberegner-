const https = require('https');
const fs = require('fs');
const path = require('path');

const TOPICS = [
  'Slik leser du skattemeldingen 2025 – komplett guide',
  'Hva er minstefradrag og hvem får det?',
  'Fradrag de fleste nordmenn glemmer',
  'Foreldrefradrag – slik får du penger tilbake',
  'BSU og skattefradrag for unge',
  'Pendlerfradrag – krav og beregning',
  'Gaver og arv – skatteregler i Norge',
  'Hjemmekontor og skattefradrag i 2025',
  'Aksjer og skatt – slik fungerer aksjonærmodellen',
  'Skatt på utleie av bolig – hva gjelder?',
  'Fagforeningsfradrag og andre arbeidsfradrag',
  'Slik klager du på skattemeldingen',
];

function getRandomTopic() {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function callAnthropic(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        resolve(parsed.content[0].text);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const topic = getRandomTopic();
  const dato = new Date().toLocaleDateString('nb-NO', { year: 'numeric', month: 'long', day: 'numeric' });
  const slug = slugify(topic);
  const filename = `${slug}.html`;
  const artiklerDir = path.join(__dirname, 'public', 'artikler');

  if (!fs.existsSync(artiklerDir)) fs.mkdirSync(artiklerDir, { recursive: true });

  console.log(`Genererer artikkel: ${topic}`);

  const innhold = await callAnthropic(`Skriv en grundig norsk artikkel om: "${topic}".
Artikkelen skal være 600-800 ord, SEO-optimalisert, og gi praktisk verdi for norske skattebetalere.
Bruk norske regler og tall. Inkluder en intro, 3-4 seksjoner med overskrifter, og en konklusjon.
Returner kun ren HTML-innhold (ikke full side) med <h2>, <p> og <ul>-tagger.`);

  const html = `<!DOCTYPE html>
<html lang="nb">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${topic} | Skatteberegner.no</title>
<meta name="description" content="Les om ${topic} – praktisk guide for norske skattebetalere.">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header><a href="/">← Skatteberegner.no</a></header>
<main class="artikkel">
<p class="dato">Publisert: ${dato}</p>
<h1>${topic}</h1>
${innhold}
<div class="cta-boks">
  <p>Vil du beregne skatten din?</p>
  <a href="/">Prøv skatteberegneren vår →</a>
</div>
</main>
</body>
</html>`;

  fs.writeFileSync(path.join(artiklerDir, filename), html);
  console.log(`Artikkel lagret: public/artikler/${filename}`);
}

main().catch(console.error);
