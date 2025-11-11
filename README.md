## Blog2Buzz

Blog2Buzz turns any long-form blog post into channel-ready newsletters, social captions, and marketing email drafts — with backlinks that send readers back to the source. Paste a URL or drop in the raw article text and Gemini 1.5 Flash handles the rest.

### ✨ MVP Features
- Fetch and clean blog content from a public URL (Readability + canonical URL detection)
- Manual text input with backlink management support
- Prompted Gemini conversions for:
  - Newsletter summaries with CTA
  - Twitter/X, LinkedIn, Instagram snippets
  - Email campaign draft with subject, preheader, CTA button
- Automatic UTM-tagged backlinks per channel
- Rich-text editing (Tiptap), copy, download, and mailto export actions
- Optional Supabase logging to keep a history of conversions

### 🧱 Stack
- **Frontend**: Next.js App Router, React, Tailwind CSS, Tiptap
- **Backend**: Next.js route handlers (Node runtime)
- **AI**: Gemini `gemini-2.0-flash` (override with `GEMINI_MODEL`) via `@google/generative-ai`
- **Storage**: Supabase (Postgres) for persisting conversion history (optional)

### ⚙️ Prerequisites
1. Node.js 18+
2. A Gemini API key with access to the Generative Language API
3. (Optional) Supabase project for storing conversion history

Create `env.local` based on `env.example`:
```bash
cp env.example .env.local
```

Update `.env.local`:
```
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.0-flash  # optional override
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 🗄️ Supabase Setup (optional)
1. Create a Supabase project and note the `Project URL` and `Service Role` key.
2. In the SQL Editor, run:
   ```sql
   create table if not exists conversions (
     id uuid primary key default gen_random_uuid(),
     created_at timestamptz not null default now(),
     source_type text not null,
     tone text not null,
     output_types text[] not null,
     social_platforms text[] not null,
     canonical_url text not null,
     article_title text,
     article_author text,
     outputs jsonb not null,
     raw_content text,
     metadata jsonb
   );

   create index if not exists conversions_canonical_url_idx
   on conversions (canonical_url);
   ```
3. Store the Supabase credentials in `.env.local` as shown above. Keep the service role key on the server only; never ship it to the browser.

### 🚀 Local Development
```bash
npm install
npm run dev
```

Visit http://localhost:3000 to use the app.

### 🧪 Testing The Flow
1. Start the dev server.
2. Paste a live blog URL or switch to “Paste blog text”.
3. Select the output formats/platforms & tone.
4. Click **Convert with Gemini**.
5. Edit in the inline Tiptap editor, then copy / download / email the content.

### 📦 Deployment
The app is ready for Vercel/Netlify. Ensure `GEMINI_API_KEY`, `GEMINI_MODEL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` (if you enable persistence) are configured in your hosting environment before deploying.
