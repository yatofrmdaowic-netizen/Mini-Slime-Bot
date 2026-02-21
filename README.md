# Mini-Slime-Bot

Mini MD Bot full-stack demo for WhatsApp MD workflows.

## Included features
- WhatsApp MD session fields + pair code generator
- Group management features with protection and admin control actions
- Instagram, TikTok, Facebook, social-media, and song download APIs
- Stalker features: general stalker + social stalker
- ML stalk features, NPM stalk features, and GitHub stalk features
- Fun features for private and group modes
- Games features with play + score tracking
- Sticker features, tools/image generation, AI mock assistant
- Owner settings + menu/allmenu APIs
- Local autosave in browser + API save for sessions

## Run

```bash
npm start
```

Open `http://localhost:8000`.


## Deploy to Vercel

```bash
npm i -g vercel
vercel
vercel --prod
```

This repo includes `vercel.json` plus `api/index.js` (Vercel function wrapper) and a reusable `index.js` handler, so both frontend and API routes are served by Vercel.
