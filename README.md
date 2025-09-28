# Polished UI + built-in fetch function (no node-fetch)
This package upgrades your site UI and replaces the Netlify function to use **built-in fetch** so you do **not** need a package.json or node-fetch.

## What to upload (repo root)
- assets/
  - styles.css
  - logo.svg
  - favicon.svg
- data/
  - ratings.json    (leave as [])
  - (DO NOT overwrite your existing data/grounds.json – keep the one the workflow produced)
- index.html
- ground.html
- netlify/
  - functions/
    - submit_rating.mjs
- netlify.toml

## Netlify configuration
Add environment variables:
- GITHUB_TOKEN   (PAT with public_repo or repo scope)
- GITHUB_REPO    (e.g. yourname/yourrepo)
- GITHUB_BRANCH  (e.g. main)

## No workflow rerun needed
This bundle doesn't touch `data/grounds.json`. Your existing file stays in place.

## Test
- Open a ground page → Rate this ground → Submit
- A commit should appear updating `data/ratings.json` in your GitHub repo
