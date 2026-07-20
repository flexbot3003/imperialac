# Imperial AC Website, white editorial redesign

This package rebuilds the full structure of the original `imperial-ac-website-cms` project while preserving its CMS model and page names.

## Design direction

- White-first interface
- No gold accents
- Existing Imperial blue retained
- Strong condensed typography retained
- Editorial layouts inspired by modern culture and sports sites
- SaaS clarity in navigation, forms, tables and dashboard controls
- Reduced rounding, gradients and generic feature-card patterns

## Public pages

- `index.html`
- `club.html`
- `fixtures.html`
- `standings.html`
- `news.html`
- `article.html`
- `gallery.html`
- `partners.html`
- `join.html`
- `404.html`

## Dashboard

`admin.html` manages:

- League standings
- Fixtures and results
- News posts and uploads
- Gallery uploads
- Navigation and public page visibility

## Important before replacing the live repository

1. Keep a copy of the existing `js/cms-config.js` values.
2. Replace the included placeholder `assets/logo-mark.svg` with the real crest from the current repository.
3. Test the package against the current Supabase project in a staging deployment.
4. Only run `supabase-schema.sql` after backing up the live database.
5. Add your real photographs to the labelled static image slots. News and gallery media stay dashboard-controlled.


## Legal and compliance pages added

- `privacy.html`
- `terms.html`
- `cookies.html`
- `disclaimer.html`
- `media-notice.html`
- `accessibility.html`
- `data-rights.html`

The shared footer now links to the legal pages and displays:

`© 2026 Imperial Athletic Club. All rights reserved.`

The public website includes a small essential-storage notice. The private dashboard includes a Compliance tab with policy links and a launch checklist.

### Required review before launch

The legal text is a practical template, not a substitute for legal advice. Confirm the club's Information Officer details, service providers, data-retention practices, media consent process and POPIA request workflow before going live.


## Editable news groups

The dashboard now includes a complete news-group manager.

Administrators can:

- Create groups such as Signings, Birthdays, Match Reports and Player Profiles
- Rename groups and edit their descriptions
- Set their public display order
- Hide or publish a complete group
- Assign every news post to a group
- Filter the dashboard's post list by group
- Delete a group and move its stories back to Uncategorised

The public News page automatically creates filter links such as:

`news.html?group=signings`

Individual articles also link back to their group and show related stories from the same group.

### Existing Supabase project

Run `news-groups-migration.sql` once in Supabase SQL Editor before using the updated dashboard. It preserves existing news and converts existing free-text categories into reusable groups where possible.
