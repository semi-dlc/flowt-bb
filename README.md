# FLOWT – AI-Powered Freight Ridesharing

FLOWT matches unused trucking capacity with shippers that need space. The platform combines a Supabase-backed marketplace for offers and requests with an AI co-pilot that understands live supply and demand, helping logistics teams collaborate, fill empty miles, and ship more sustainably.

## Product Highlights
- B2B freight marketplace where carriers publish open capacity and shippers post their loads.
- Role-aware Supabase Auth with profile onboarding for logistics companies.
- Rich offer/request management with validation for weights, routes, pricing, and cargo types.
- Real-time AI assistant (`supabase/functions/freight-ai-agent`) that answers route questions and recommends matches using database context.
- Developer-only controls for tuning AI models, temperature, prompts, and token budgets.

## Tech Stack
- React 18 + Vite + TypeScript for the SPA.
- Tailwind CSS + shadcn/ui for the glassmorphism UI.
- Supabase (database, Auth, Row Level Security policies, Edge Functions).
- Deno Edge Function calling the Lovable AI gateway for freight-specific reasoning.

## Prerequisites
- Node.js 20+ and npm.
- Supabase account & CLI (to run the database locally or manage migrations).
- Lovable AI gateway key (used by the freight AI agent).

## Getting Started
```bash
git clone <repo>
cd flowt-bb
npm install
```

1. Create a Supabase project (or run `supabase start` locally).
2. Apply database schema:
   ```bash
   supabase db push
   ```
   This seeds enums (`shipment_status`, `cargo_type`), tables (`profiles`, `shipment_offers`, `shipment_requests`, `bookings`), indexes, and RLS policies.
3. Copy your environment variables into `.env` (or `.env.local`):
   ```bash
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-or-public-key>
   ```
4. Start the web app:
   ```bash
   npm run dev
   ```
   Visit the printed URL, create an account, and complete your company profile before posting offers or requests.

## AI Agent Configuration
The AI chat panel calls the Supabase Edge Function `freight-ai-agent`. Configure its secrets so it can reach Supabase and the Lovable AI gateway:

```bash
supabase secrets set --project-ref <ref> \
  LOVABLE_API_KEY=<lovable-api-key> \
  SUPABASE_URL=<your-supabase-url> \
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Deploy the function with:
```bash
supabase functions deploy freight-ai-agent
```

The assistant automatically pulls the latest `shipment_offers`, `shipment_requests`, and `bookings` to provide contextual recommendations.

## Project Structure
```
flowt-bb/
├─ src/pages                # Auth, dashboard, 404 routes
├─ src/components           # Offer/request lists, dialogs, AI chat UI
├─ src/integrations         # Supabase client & generated types
├─ supabase/migrations      # SQL schema, RLS policies, indexes
└─ supabase/functions       # Deno edge functions (freight AI agent)
```

## Useful Scripts
- `npm run dev` – start the local dev server.
- `npm run build` – production build.
- `npm run lint` – run ESLint checks.

## Next Steps
- Extend booking workflows so matched offers/requests transition through `matched → in_transit → completed`.
- Add analytics dashboards to surface fill rates and revenue impact.
- Integrate notifications (email/SMS) for new matches or AI recommendations.
