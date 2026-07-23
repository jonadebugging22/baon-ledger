# Baon Ledger

Simpleng ledger app para i-track ang baon/allowance mo. Nag-lo-log ka ng gastos
kada araw laban sa weekly/monthly allowance mo, at makikita mo agad kung magkano
ang natitira at saan napunta.

## 1. I-set up ang Supabase

1. Gumawa ng account/project sa https://supabase.com
2. Sa loob ng project, pumunta sa **SQL Editor** at i-paste + i-run ang buong
   laman ng `supabase-schema.sql` (kasama sa folder na ito). Gagawa ito ng
   `transactions` at `budget_settings` tables, plus Row Level Security para
   ikaw lang makakakita ng sarili mong data.
3. Pumunta sa **Authentication > Providers**, siguraduhing naka-enable ang
   **Email** provider (default na ito, on by default).
4. Optional pero recommended: sa **Authentication > Settings**, i-off muna ang
   "Confirm email" habang tinetest mo, para makapag-sign in agad after signup.
   Puwede mo itong i-on ulit later kung gusto mo ng email verification.
5. Kunin ang credentials mo sa **Project Settings > API**:
   - `Project URL`
   - `anon public` key

## 2. I-configure ang app

1. I-rename ang `.env.local.example` to `.env.local`
2. Ilagay ang Supabase URL at anon key mo doon:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
   ```

## 3. Patakbuhin locally (optional, para ma-test bago i-deploy)

```bash
npm install
npm run dev
```

Buksan ang http://localhost:3000

## 4. I-deploy sa Vercel

1. I-push ang folder na ito sa isang GitHub repo
2. Pumunta sa https://vercel.com > **Add New Project** > i-import yung repo
3. Sa **Environment Variables** ng Vercel project, idagdag ang parehong
   `NEXT_PUBLIC_SUPABASE_URL` at `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. I-deploy. Tapos na — live na ang app mo.

## Paano gamitin

1. Mag-sign up gamit ang email at password
2. Itakda ang allowance mo (halaga + weekly o monthly)
3. Every gastos, pindutin ang "+ Idagdag ang gastos" — pili ng kategorya,
   ilagay ang halaga, optional na note
4. Makikita agad sa itaas kung magkano ang natitira sa period mo, at may
   breakdown per category sa ibaba
5. Kung may extra pera ka (dagdag na baon, allowance top-up), gamitin ang
   "dagdag na pera" na option

## PWA — pag-install sa phone

Installable na ang app bilang PWA (may icon, homescreen shortcut, at basic
offline fallback page). Pagkatapos i-deploy sa Vercel (kailangan ng HTTPS,
kaya hindi gagana sa plain `localhost` na http sa ibang device):

- **Android (Chrome):** buksan ang deployed URL > tatlong tuldok sa taas >
  "Add to Home screen" / "Install app"
- **iPhone (Safari):** buksan ang deployed URL > Share button > "Add to Home
  Screen"

Pag na-install, magbubukas ito na parang native app — walang address bar, may
sariling icon, at may offline page kapag nawalan ng internet connection.

## Tungkol sa disenyo

Ginawa itong parang tunay na ledger/notebook — may paper texture, ruled lines,
at monospace na font para sa mga numero (parang totoong tinatala mo sa kwaderno)
sa halip na generic na dashboard look.
