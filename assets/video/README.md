# Video files

Everything in this folder is optional. Every video the site references has a
poster image behind it, so each section looks right whether or not the file is
there.

---

## Project films

One video per project, played on the project detail page between the story and
the gallery.

The page **probes for the file and stays silent if it is not there**, so a
project whose film has not been shot yet simply shows no film section. Nothing
breaks, and there is no placeholder to clean up later — drop the file in and
the section appears by itself.

## Filenames

The name must match the project's `slug` in `js/projects-data.js`:

| File                              | Project            |
|-----------------------------------|--------------------|
| `riverside-house.mp4`             | Riverside House    |
| `copper-loft.mp4`                 | Copper Loft        |
| `studio-north.mp4`                | Studio North       |
| `the-warehouse.mp4`               | The Warehouse      |
| `hillside-villa.mp4`              | Hillside Villa     |
| `meridian-offices.mp4`            | Meridian Offices   |
| `slate-kitchen.mp4`               | Slate Kitchen      |
| `cedar-retreat.mp4`               | Cedar Retreat      |
| `the-foundry.mp4`                 | The Foundry        |
| `harbour-penthouse.mp4`           | Harbour Penthouse  |
| `lantern-house.mp4`               | Lantern House      |
| `atrium-works.mp4`                | Atrium Works       |

The one-line caption under each film is set per project in
`js/projects-data.js`, on the `video.caption` field.

## Encoding

Web delivery, not archive masters. A 60-second film should land around 6–12 MB:

```
ffmpeg -i master.mov -c:v libx264 -profile:v high -crf 23 -preset slow \
       -vf "scale=1920:-2" -c:a aac -b:a 128k -movflags +faststart out.mp4
```

- **H.264 / AAC in MP4** — the only combination every browser plays.
- **`-movflags +faststart`** is not optional: without it the whole file must
  download before playback begins.
- **1920 wide** is plenty; the player is never larger than 1180 CSS px.
- **16:9** matches the stage. Other ratios are letterboxed rather than cropped.

No poster file is needed — the project's own cover image is used until the
first frame decodes.


---

## Site videos

These pre-date the project films and are referenced from the landing page.
None of them exist yet, so each section is currently showing its poster image.

| File                 | Where it plays                                              |
|----------------------|-------------------------------------------------------------|
| `hero.mp4`           | Background clip behind the top hero section                  |
| `construction-1.mp4` | "Your space / vision / home" pinned section — first scene    |
| `construction-2.mp4` | The same pinned section, second scene after the first scroll |

`construction-1` wants a building-in-progress clip and `construction-2` the
finished interior — they read as a before and after.

Keep these to 6–12 seconds, muted, and under about 8 MB so the loop is
seamless. The same ffmpeg settings above apply.
