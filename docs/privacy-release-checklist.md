# Privacy release checklist

This checklist records only what the repository currently shows on 2026-08-21.

## Current repository facts

- The site currently stores only `yance-theme` in local storage, based on `src/composables/useTheme.ts` and the inline theme bootstrap in `html-src/*.html`.
- No analytics or tracker integration was found in the current repository inspection.
- No analytics or tracker consent flow was found in the current repository inspection.

## Pre-release checks

- Address: confirm no home, school, dorm, workplace, or other sensitive address appears in page copy, screenshots, posters, tickets, or metadata.
- Real-time location: confirm the site does not expose live whereabouts, same-day location signals, or venue attendance before an event has passed.
- Inferred routine: check whether repeated timestamps, dates, or captions reveal patterns about residence, commute, class schedule, or travel habits.
- Private phone: remove or redact any personal phone numbers from images, tickets, QR overlays, screenshots, or linked documents.
- Unintended account exposure: review screenshots, embeds, and media for usernames, profile handles, email addresses, wallet IDs, booking references, or account dashboards not meant for publication.
- EXIF and GPS removal: strip metadata from exported photos and screenshots before release.
- Certificate identifiers: redact certificate numbers, student IDs, registration IDs, or verification codes unless disclosure is explicitly intended.
- Concert ticket QR and seat review: inspect every ticket, poster, and venue screenshot for QR codes, barcodes, seat numbers, order numbers, or gate details.
