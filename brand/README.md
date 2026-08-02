# SplitTrip brand assets

## Mark

A map pin split into three wedges around a center point — "pin" for trip,
"segmented pie" for split. One shape carries both halves of the product name.

- `logo-mark.svg` — standalone mark, transparent background, 24x24 viewBox.
  Mirrored as the `LogoMark` component in `apps/web/src/components/Logo.tsx`
  for in-app use (keep both in sync if the mark changes).
- `icon-square.svg` / `icon-square-1024.png` — mark on a rounded, dark
  ink-navy square tile. Source for app icons and favicons.
- `icon-maskable.svg` / `icon-maskable-1024.png` — full-bleed tile, mark
  scaled into the ~50% "safe zone" circle. Source for Android maskable
  icons, `apple-touch-icon.png`, and Expo's `icon.png`.
- `icon-foreground.svg` — mark only, transparent background, safe-zone
  scaled. Source for Expo's `adaptive-icon.png` / `splash-icon.png`, where
  the platform composites its own background color.
- `logo-lockup-light.svg` / `logo-lockup-dark.svg` — horizontal mark +
  "SplitTrip" wordmark, for use on light/dark surfaces respectively.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Primary | `#2C967C` | Largest wedge; matches the app's `--primary` CSS token (`hsl(165 55% 38%)`) |
| Primary light | `#5EC9AF` | Second wedge |
| Primary dark | `#16553B` | Smallest wedge; matches the app's `theme_color` |
| Gap / center | `#FAF8F5` | Separator lines, center dot; matches the app's cream `--background` token |
| Icon tile bg | `#0F131A` | Square/maskable icon backgrounds; matches the app's dark-mode `--background` token |

Wordmark font is Space Grotesk (the app's `font-display` family), "Split" in
ink/foreground, "Trip" in primary green.

## Regenerating rasters

All PNGs here and in `apps/web/public` / `apps/mobile/assets` are rendered
from the SVG sources with `rsvg-convert`, e.g.:

```
rsvg-convert -w 512 -h 512 brand/icon-square.svg -o out.png
```
