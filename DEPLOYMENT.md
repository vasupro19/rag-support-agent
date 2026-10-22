# Deployment & Setup Instructions

Follow these steps to deploy and run the Autonomous Support Agent in production.

---

## 1. Setup Supabase & Seed Database

1. Create a project at [Supabase](https://supabase.com).
2. Open your Supabase project's **SQL Editor**.
3. Copy the contents of the `supabase_schema.sql` file in this repository and run the queries. This will:
   - Enable the `pgvector` extension.
   - Create the `company_policies` and `orders` tables.
   - Install the `match_policies` search RPC.
   - Seed mock order records (`ORD-1001` to `ORD-1005`).
4. To run policy similarity lookups (RAG), you will want to seed company policies into the `company_policies` table. Each entry must have its corresponding vector generated using Google's `gemini-embedding-001` (truncated to 768 dimensions). Run `node --env-file=.env.local scripts/ingest.ts` to do this automatically.
   *(Tip: You can build a script using `@supabase/supabase-js` and the `embed` helper from `ai` to automate embedding generation and insertions).*

---

## 2. Local Environment Setup

Create a `.env` or `.env.local` file at the root of the project with your API credentials:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret_service_role_key
```

Run the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to interact with the application.

---

## 3. Deploying to Vercel

### Option A: Via Vercel Git Integration (Recommended)
1. Push your code repository to a GitHub, GitLab, or Bitbucket repository.
2. Sign in to your [Vercel Dashboard](https://vercel.com).
3. Click **Add New** -> **Project**.
4. Import your repository.
5. In the **Environment Variables** section, add the following variables:
   - `GOOGLE_GENERATIVE_AI_API_KEY`: Your Google Gemini API Key.
   - `SUPABASE_URL`: Your Supabase URL (e.g. `https://xxx.supabase.co`).
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Secret Service Role Key.
6. Click **Deploy**. Vercel will automatically build the Next.js App Router project and provision serverless functions with streaming capabilities.

### Option B: Via Vercel CLI
If you prefer deploying directly from your command line:
1. Install the Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```
2. Link your workspace to Vercel:
   ```bash
   vercel link
   ```
3. Set your production environment variables in the Vercel Dashboard, or set them locally in the link step.
4. Deploy the project to production:
   ```bash
   vercel --prod
   ```
