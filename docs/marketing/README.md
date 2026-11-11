# Marketing images

`og-wordmark.png` (1200x630) is the link preview card for Streaks. It is also on
ricos.site (`public/projects/streaks-wordmark.webp`), where it was made on 2026-11-11.

The site serves it as `packages/client/src/app/opengraph-image.jpg` and
`twitter-image.jpg`, each with an `.alt.txt`. After changing the PNG, rebuild both:

```bash
for n in opengraph-image twitter-image; do
  magick docs/marketing/og-wordmark.png -strip -sampling-factor 4:4:4 -interlace JPEG -quality 88 packages/client/src/app/$n.jpg
done
```
