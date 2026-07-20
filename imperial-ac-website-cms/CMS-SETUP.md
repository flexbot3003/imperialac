# Imperial AC CMS setup

1. Create or open the existing Imperial AC Supabase project.
2. Back up the database before changing a live project.
3. Open **SQL Editor** and run `supabase-schema.sql`.
4. Open **Authentication > Users** and create accounts only for trusted club administrators.
5. Copy the Project URL and anon/publishable key from **Project Settings > API**.
6. Paste them into `js/cms-config.js`.
7. Open `admin.html`, sign in and test each dashboard area.
8. Confirm that public pages can read published content without signing in.

## Existing database compatibility

The redesign keeps the original content model:

- `standings`
- `fixtures`
- `news_posts`
- `gallery_items`
- `site_settings`
- public `club-media` storage bucket

Running the schema uses `create table if not exists`, so it can be used to add the fixtures table without deleting existing content. Review policy names before running against a heavily customised live project.

## Image placeholders

Static homepage and club page photography is deliberately represented by labelled image slots. Replace those blocks in the HTML with your own `<img>` elements. News and gallery images are controlled through the dashboard.


## News groups upgrade

For an existing database, run:

`news-groups-migration.sql`

This adds the `news_groups` table, adds `group_id` to `news_posts`, imports existing category names, creates the required RLS policies and seeds useful starter groups.
