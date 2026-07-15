# Imperial AC Live Content Setup

The public website is static, but Standings, News, Gallery and page visibility are connected to Supabase. This lets an authorised club administrator edit content at `/admin.html` without redeploying the website.

## 1. Create a Supabase project

Create a free Supabase project and wait for it to finish setting up.

## 2. Create the database tables and security rules

1. Open **SQL Editor** in Supabase.
2. Open `supabase-schema.sql` from this website folder.
3. Copy the whole file into the SQL Editor.
4. Run it once.

This creates:

- `standings`
- `news_posts`
- `gallery_items`
- `site_settings`
- a public image bucket named `club-media`
- Row Level Security policies

## 3. Create the dashboard login

1. Open **Authentication → Users**.
2. Create one user for the trusted club administrator.
3. Use a strong password that is not shared publicly.

The website does not contain the password.

## 4. Connect the website

Open `js/cms-config.js` and paste your project details:

```js
window.IMPERIAL_CMS = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR-PUBLISHABLE-OR-ANON-KEY",
  storageBucket: "club-media"
};
```

Find these values in **Project Settings → API**.

Do not paste a `service_role` key into the website. Only use the browser-safe publishable/anon key.

## 5. Deploy this updated folder once

Upload the new ZIP to the existing Vercel project, or connect the folder through GitHub or the Vercel CLI.

After that initial deployment, normal content updates do not require another deployment.

## 6. Open the private dashboard

Go to:

```text
https://YOUR-DOMAIN.vercel.app/admin.html
```

Sign in with the Supabase administrator account.

From the dashboard you can:

- Add, rename and delete teams
- Update standings live
- Create draft or published news
- Upload gallery images
- Show or hide News, Gallery and Standings in the public navigation

## Default public state

- Senior MPL side only
- No junior-team or player pages
- Standings visible with Imperial AC on zero
- News hidden from navigation
- Gallery hidden from navigation
- Fixtures show “awaiting confirmation”

## Social details already added

- Email: `06imperialfc@gmail.com`
- Facebook, Instagram and WhatsApp Channel links are included in the footer and contact page.
