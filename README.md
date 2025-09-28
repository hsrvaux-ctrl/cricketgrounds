# Cricket Grounds Map UK

This is a plain static site you can host on Netlify. Update the `data/grounds.json` file and push to GitHub to publish new maps.

## Quick start

1. Create a new empty repository on GitHub. Example name: `cricket-grounds-map`.
2. Upload the following files from this folder:
   - `index.html`
   - `ground.html`
   - `data/grounds.json`
   - `netlify.toml` (optional)
3. Go to Netlify and select New site from Git then choose your GitHub repo. No build command required. Publish directory is the repo root.
4. Netlify will give you a live URL such as `https://your-site-name.netlify.app`.
5. Edit `data/grounds.json` to add more grounds. Commit and push. Netlify auto publishes.

## Data format

Each ground object:

```
{
  "id": "G011",
  "name": "Ground name",
  "club": "Club name",
  "county": "County",
  "address": "Address",
  "lat": 51.500,
  "lon": -0.120,
  "pitch_type": "Natural grass",
  "strips": 10,
  "nets": true,
  "bar": false,
  "parking": true,
  "notes": "Any notes",
  "club_url": "https://...",
  "play_cricket_url": "https://...",
  "booking_url": "https://...",
  "what3words": "",
  "description": "Short description"
}
```

## Optional automation later

There is a template workflow to fetch new grounds from Overpass and rebuild `data/grounds.json`. To use:
- Put your repository on public or ensure the workflow can push.
- Un-comment and commit `.github/workflows/update_data.yml`.
- Run the workflow manually from the Actions tab or wait for the schedule.

