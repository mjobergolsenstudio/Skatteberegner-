# Skatteberegner.no — Deploy-guide

## Filstruktur
```
skatteberegner/
├── api/
│   └── analyser.js     ← Claude API-kall (serverless)
├── public/
│   └── index.html      ← Hele nettsiden
├── package.json
├── vercel.json
└── DEPLOY.md
```

---

## Steg 1 — Last ned og pakk ut zip
Pakk ut `skatteberegner.zip` på PC/Mac.

---

## Steg 2 — Opprett GitHub-repo

Gå til github.com → New repository
- Navn: `skatteberegner-no`
- Privat eller public — valgfritt
- IKKE legg til README (vi har filene klare)

Åpne Terminal og kjør:
```bash
cd skatteberegner
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/mjobergolsenstudio/skatteberegner-no.git
git push -u origin main
```

---

## Steg 3 — Koble til Vercel

1. Gå til vercel.com → Add New Project
2. Import Git Repository → velg `skatteberegner-no`
3. Framework Preset: **Other**
4. Klikk **Deploy**

---

## Steg 4 — Legg til API-nøkkel (VIKTIG)

I Vercel-dashbordet:
→ Settings → Environment Variables → Add New

```
Name:  ANTHROPIC_API_KEY
Value: sk-ant-api03-din-nøkkel-her
```

Bruk nøkkelen fra amjoberg@gmail.com-kontoen (samme som Wattguiden).

Klikk **Save** → gå til **Deployments** → **Redeploy**

---

## Steg 5 — Registrer domene på Domeneshop

1. Gå til domeneshop.no
2. Søk etter `skatteberegner.no` → kjøp
3. DNS-innstillinger → A-record:
   - Host: `@`
   - Value: `216.198.79.1`
   - TTL: 3600

---

## Steg 6 — Koble domenet i Vercel

1. Vercel → ditt prosjekt → Settings → Domains
2. Legg til: `skatteberegner.no`
3. Vercel viser deg DNS-innstillinger → verifiser

---

## Klar! 🚀

Siden er live. PDF-opplasting fungerer via `/api/analyser` som kjører server-side.

---

## Neste steg: Betalingsløsning

For å aktivere 99 kr-betaling, erstatt `alert()`-kallene i index.html med:

**Stripe:** stripe.com → Create payment link → 99 NOK
**Vipps:** developer.vippsmobilepay.com

Legg til Stripe/Vipps-nøkler som miljøvariabler i Vercel.
