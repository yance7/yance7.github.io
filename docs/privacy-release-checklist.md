# Privacy release checklist

This checklist records only what the repository currently shows on 2026-11-08.

## Current repository facts

- The site currently stores only `yance-theme` in local storage, based on `src/composables/useTheme.ts` and the inline theme bootstrap in `html-src/*.html`.
- No analytics or tracker integration was found in the current repository inspection.
- No analytics or tracker consent flow was found in the current repository inspection.
- `npm run audit:assets` is a read-only release gate for raster dimensions, decodability, EXIF GPS, and sensitive metadata. The 2026-11-08 run reported 164 image files, `GPS metadata: 0`, `Sensitive metadata: 0`, and `Unreadable files: 0`. It must be run again after adding or replacing media.
- The technical audit does not inspect visible ticket faces, seat numbers, order numbers, QR codes, or other on-image privacy content; those remain manual review items.
- Security and data-collection decisions are recorded in `docs/security-privacy-decisions.md`; the site intentionally has no third-party analytics, tracker, or RUM endpoint.

## Pre-release checks

- Address: confirm no home, school, dorm, workplace, or other sensitive address appears in page copy, screenshots, posters, tickets, or metadata.
- Real-time location: confirm the site does not expose live whereabouts, same-day location signals, or venue attendance before an event has passed.
- Inferred routine: check whether repeated timestamps, dates, or captions reveal patterns about residence, commute, class schedule, or travel habits.
- Private phone: remove or redact any personal phone numbers from images, tickets, QR overlays, screenshots, or linked documents.
- Unintended account exposure: review screenshots, embeds, and media for usernames, profile handles, email addresses, wallet IDs, booking references, or account dashboards not meant for publication.
- EXIF and GPS removal: strip metadata from exported photos and screenshots before release.
- Certificate identifiers: redact certificate numbers, student IDs, registration IDs, or verification codes unless disclosure is explicitly intended.
- Concert ticket QR and seat review: inspect every ticket, poster, and venue screenshot for QR codes, barcodes, seat numbers, order numbers, or gate details.
- Explicit public-event exception: the site owner approved publishing the 15 public promotional posters listed in `docs/concert-poster-sources.md`, plus the exact date and venue for Zhou Shen (`2026-09-27`, National Stadium) and FFOREVER (`2026-10-06`, National Stadium). Keep copyright and reuse rights marked pending, and do not generalize this exception to tickets, QR codes, seats, private contact details, or real-time location.
- Home carousel memorial-ticket exception: the site owner approved on 2026-11-08 retaining photo 10 of the home carousel, which shows a memorial ticket rather than a real admission credential. Its number is system-random and contains no real seat, order, personal, or live-location data. This approval is limited to that image and its generated derivatives; every other ticket, seat, order, QR-code, and privacy check remains mandatory.
- Asset audit result: record the command date and output, and stop release on GPS metadata or unreadable files until a human reviews the affected assets.
