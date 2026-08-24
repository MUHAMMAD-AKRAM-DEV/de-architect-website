# De Architect — Website

Static website (HTML + CSS + JavaScript, with Bootstrap and Tailwind via CDN).
The landing page is finalized; the other pages are starters you can build out.

## Structure

```
de-architect/
├── index.html          ← Landing page (finalized)
├── about.html          ← Studio / about (starter)
├── services.html       ← Services (starter)
├── projects.html       ← Projects gallery (starter)
├── contact.html        ← Contact + form (starter)
├── css/
│   └── styles.css      ← All site styles (design system lives here)
├── js/
│   ├── main.js         ← Hero parallax, scroll reveals, menu, counters
│   └── include.js      ← OPTIONAL helper to share nav/footer (see below)
├── partials/
│   ├── header.html     ← Nav + menu markup (source of truth if you use include.js)
│   └── footer.html     ← Footer markup
├── assets/
│   ├── img/            ← Photos, logo (replace the Unsplash URLs over time)
│   ├── video/          ← Put hero.mp4 here for the moving background
│   └── icons/
│       └── favicon.svg
├── .gitignore
└── README.md
```

## Run it locally

Open index.html directly, OR (recommended) serve it so relative paths + fetch work:

```
# from inside the de-architect/ folder
python3 -m http.server 8000
# then open http://localhost:8000
```

VS Code users: the "Live Server" extension does the same with one click.

## The hero video

Three clips power the site's video sections (all optional — posters show until you add them):

- `assets/video/hero.mp4` — the top hero background
- `assets/video/construction-1.mp4` — first scene of the pinned "Your space / vision / home" section
- `assets/video/construction-2.mp4` — second scene (after the first scroll), the finished space

Keep each short (6-12s), muted and compressed. See `assets/video/PUT-hero.mp4-HERE.txt`.

### The pinned scroll section

The "Your space. Your vision. Your home." block is a scroll-driven pinned scene: it
locks in place while you scroll and moves through three stages — construction video,
then the video changes with a colour wash and the headline, then the services pop in
one by one. You can tune it in `css/styles.css` (`.scrolly { height: 360vh }` controls
how much scrolling it takes) and in `js/main.js` (the `0.26` / `0.58` thresholds set
when each stage begins).

## Shared nav & footer — two options

1. **Inlined (current default).** Each page contains its own copy of the nav and
   footer. Simplest, works by double-clicking the file. Downside: to change the nav
   you edit every page. To help, the same markup is kept in `partials/`.

2. **Include helper (DRY).** Serve over http, then in each page replace the nav with
   `<div data-include="partials/header.html"></div>` and the footer with
   `<div data-include="partials/footer.html"></div>`, and add
   `<script src="js/include.js"></script>` before `main.js`. Edit once in `partials/`.

## Adding a new page

Copy `about.html`, change the `<title>`, the `.page-head` text, and the `<main>`
content. The nav, footer, styles and scripts are already wired.

## Deploy

It's a static site — host it anywhere: Netlify, Vercel, GitHub Pages, Cloudflare
Pages, or any web host. Just upload the whole folder; no build step required.