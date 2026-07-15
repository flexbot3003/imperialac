# Imperial AC Website — CMS Edition

This version is aligned to the club's current position:

- One senior MPL side only
- No public junior-team pages
- No public player pages
- No invented fixtures, results or news
- Standings begin at zero
- News and Gallery are hidden until enabled
- Private `/admin.html` dashboard for live content management

## First files to open

1. `CMS-SETUP.md` — connect the live database and admin login
2. `js/cms-config.js` — paste the Supabase URL and anon/publishable key
3. `admin.html` — private content dashboard

## Static design files

- `index.html` — homepage
- `club.html` — club story and principles
- `fixtures.html` — fixtures waiting state
- `standings.html` — live public table
- `partners.html` — sponsorship page
- `join.html` — contact page
- `css/styles.css` — visual styling

## Live content

After Supabase is connected, these can be changed without redeploying:

- Standings and team names
- News posts
- Gallery images
- Public visibility of Standings, News and Gallery

The website must still be redeployed when changing HTML, CSS, logos, permanent wording or JavaScript behaviour.
