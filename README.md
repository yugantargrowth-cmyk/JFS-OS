# JFS Partner Hub — PWA

Frontend-only React + Vite PWA. No backend server — talks straight to Supabase.
Password-gated (`1234`), installable on phone/tablet, built landscape-first.

## 1. One-time Supabase setup
1. Create a project at supabase.com (free tier is fine).
2. Open **SQL Editor → New query**, paste the contents of `supabase-setup.sql`, run it.
3. Go to **Project Settings → API** and copy the **Project URL** and **anon public key**.
4. Run the app, open **Settings**, paste both in, click **Save connection**.
5. (Optional) Add your **Groq API key** in the same Settings screen so June gives model-backed answers instead of workspace-only summaries.

## 2. Run locally
```
npm install
npm run dev
```

## 3. Push to GitHub (run from this folder, in order)
```
git init
git add .
git commit -m "JFS Partner Hub PWA"
git branch -M main
git remote add origin https://github.com/whitewolf251501-dot/JFS.git
git push -u origin main --force
```
> `--force` overwrites the old repo content with this rebuilt version. Drop it if you'd rather push to a fresh/new repo instead.

## 4. Deploy to Vercel
```
npm install -g vercel
vercel login
vercel --prod
```
When prompted:
- **Set up and deploy** → Yes
- **Link to existing project?** → No (unless you already made one)
- **Project name** → jfs-partner-hub (or anything you like)
- **Directory** → ./ (current folder)
- Framework is auto-detected as Vite — accept the defaults.

That's it — Vercel builds `npm run build` and serves `dist/`, `vercel.json` handles SPA routing.

## Notes
- Password is hardcoded as `1234` in `src/lib/auth.ts` — change it there if needed, it's a simple front-door gate, not real auth.
- All data (partners, referrals, visits, sales, June's chat memory, settings) lives in one Supabase table: `jfs_workspace_records`.
- The app is designed for **landscape use** — on a phone in portrait it'll prompt you to rotate.
- Installable as an app: on mobile, "Add to Home Screen" from the browser share menu.
