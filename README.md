# DataMind AI

AI-powered data analytics SaaS built with Next.js, TypeScript, Tailwind CSS, Recharts, Prisma, PostgreSQL, and the OpenAI API.

## Features

- CSV/XLSX upload
- Automatic data profiling and quality scoring
- Missing values, duplicates, and outlier detection
- Descriptive statistics and automatic charts
- AI-generated grounded insights
- Ask DataMind natural-language analysis
- Analysis history and shareable reports
- Responsive dark-mode UI

## Local setup

```bash
npm install
cp .env.example .env.local
npx prisma generate
npx prisma db push
npm run dev
```

Required environment variables are documented in `.env.example`. Never commit real API keys or database credentials.

## Deployment

The production deployment is connected to the `main` branch. Pushes to `main` should create a fresh Vercel deployment from the latest source rather than redeploying an older deployment snapshot.
