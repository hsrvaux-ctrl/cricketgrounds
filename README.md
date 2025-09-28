# Cricket Grounds Pro — no-Airtable build

This package upgrades your static GitHub + Netlify site with:
- Modern UI, clustering, Nearby Me
- "Ground of the Day"
- Ratings (5 categories) with a Netlify Function that commits to your GitHub repo
- Share buttons, SEO metadata, OpenGraph and Schema.org

## 1) Add files to your repo
Place these at the repository root:
- index.html
- ground.html
- netlify.toml
- data/grounds.json            (your existing file from Overpass workflow)
- data/ratings.json            (start as [])
- netlify/functions/submit_rating.mjs

## 2) Configure Netlify Function
In Netlify UI → Site settings → Environment variables, set:
- GITHUB_TOKEN  : a GitHub Personal Access Token (classic) with `repo` (private) or `public_repo` (public) scope
- GITHUB_REPO   : owner/repo  (e.g. `hugo-vaux/cricket-grounds-map`)
- GITHUB_BRANCH : main        (or your default branch)

Deploy again. Netlify will host the function at:
`/.netlify/functions/submit_rating`

## 3) Try a rating
- Visit any ground page (e.g., `ground.html?id=G001`)
- Click "Rate this ground"
- Submit
- A new commit will appear in GitHub updating `data/ratings.json`
- Refresh the page — the average and count will update (client-side)

## 4) Ground of the Day
- The homepage picks a random ground that has a hero image + description
- Click the "Ground of the Day" button to reshuffle client-side

## 5) SEO
- Ground pages fill dynamic meta and Schema.org JSON-LD
- For best SEO on a static SPA, consider Netlify’s prerendering add-on later

## 6) Share
- "Share" uses the Web Share API where supported, falls back to Twitter intent
- "Copy link" puts the URL on clipboard

## 7) Clustering & Nearby
- Marker clustering reduces map clutter
- Nearby me recenters map to your GPS location

## Notes
- Ratings are stored in your GitHub repo via the function, so no database is needed.
- You can later add moderation by reviewing `data/ratings.json` in PRs before merging.

