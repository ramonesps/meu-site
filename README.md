This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Agenda GPT Automation

This project includes automation for `app/agenda-gpt`:

1. Fetch latest public Instagram posts from Apify (up to 5 per venue).
2. Send caption + flyer image to Gemini for structured extraction.
3. Build `content/agenda.json` for the weekly table.

### Local run

Copy `.env.example` to `.env.local` and set:

- `APIFY_API_TOKEN`
- `GEMINI_API_KEY`
- `APIFY_ACTOR_ID` (`apify/instagram-api-scraper` by default)
- `GEMINI_MODEL` (`gemini-2.5-flash` by default)

Then run:

```bash
npm run agenda:refresh
```

### Compare OCR providers

Run the benchmark (same input images for each provider):

```bash
npm run ocr:bench
```

Results are saved to:

- `content/ocr-benchmark-results.json`

Providers tested are configured by:

- `OCR_BENCH_PROVIDERS=ocr-space,tesseract-js`

### Daily run at 06:00 (BRT)

The workflow `.github/workflows/agenda-daily.yml` runs every day at `09:00 UTC` (06:00 BRT) and commits:

- `content/agenda-source.json`
- `content/agenda.json`

Required GitHub secrets:

- `APIFY_API_TOKEN`
- `GEMINI_API_KEY`

### Provider notes

- Current implementation:
  - Instagram scraping: Apify Actor (`apify/instagram-api-scraper`)
  - Multimodal extraction: Gemini (`gemini-2.5-flash`)
  - Fallback/local experimentation: Playwright + `tesseract-js`
- OCR abstraction lives in `scripts/lib/ocr-providers.js`.
- Latest benchmark output in `content/ocr-benchmark-results.json` currently recommends `tesseract-js`.
