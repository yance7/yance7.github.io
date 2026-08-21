# Asset rights and release status

Known facts captured on 2026-08-21 from the current repository only. Ownership, license, permission, and release status remain `待确认` unless the repository contains explicit source documentation for that asset type.

| Asset type | Repository evidence | Source documentation | Ownership | License / permission | Release status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Album covers | Files under `public/assets/albums/` and `public/assets/albums/thumbs/` | `docs/album-cover-sources.md` says source documentation points to Apple Music CDN and matching Apple Music pages, retrieved 2026-08-10 | 待确认 | 待确认 | 待确认 | Do not infer reuse rights from CDN access alone. |
| Concert posters | Files under `public/assets/concerts/` and `public/assets/concerts/thumbs/` | No repository source ledger found | 待确认 | 待确认 | 待确认 | Includes poster-like concert images, but no ownership or permission record is present. |
| Concert photographs | Files under `public/assets/concerts/` may include photographs; repository does not separate them by rights record | No repository source ledger found | 待确认 | 待确认 | 待确认 | Confirm photographer, venue rules, and identifiable-person consent before release. |
| OG images | Files under `public/assets/og-*.png`, `public/assets/og-card.png`, and `public/assets/og-card.svg` | Generated assets exist; no rights statement in repo | 待确认 | 待确认 | 待确认 | Verify whether all component imagery and typography are original or appropriately licensed. |
| FreshEye case image | `public/assets/case/fresheye-og-cover.png` | No repository source ledger found | 待确认 | 待确认 | 待确认 | Confirm project/client approval and any embedded third-party marks. |
| Lyrics / song-title attribution | Lyrics and song titles appear in source and content modules | No repository rights ledger found | 待确认 | 待确认 | 待确认 | Keep attribution records separate from copyright/license confirmation. |
| Audio | No audio assets are stored under `public/assets/` in the current checkout | No repository source ledger found | 待确认 | 待确认 | 待确认 | If audio is added later, confirm performer/composer/master rights. |
| Video | No video assets are stored under `public/assets/` in the current checkout | No repository source ledger found | 待确认 | 待确认 | 待确认 | If video is added later, confirm performer/venue/platform rights. |

## Release checklist

- Review every image for EXIF and GPS metadata before publishing derived or original files.
- Check all media for visible or scannable QR codes.
- Check concert tickets, posters, and screenshots for seat numbers.
- Remove or redact private contact information, including phone numbers, email addresses, and messaging handles.
- Remove or redact home, school, workplace, and other sensitive addresses.
- Avoid publishing real-time or near-real-time location clues in media, captions, or filenames.
