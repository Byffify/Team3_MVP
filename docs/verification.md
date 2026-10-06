# Verification — 2026-10-06

## Results

- `npm.cmd test`: **8 passed**, 0 failed (Node 24.19.0).
- `npm.cmd run build`: **passed**, TypeScript and Vite 8.3.0 production bundle generated in `dist/`.
- `npm.cmd run test:e2e`: **passed** with isolated headless Edge 154.
- Same browser suite with `BROWSER_EXECUTABLE` pointing to Chrome 154: **passed**.
- Independent read-only code review: two important findings and one accessibility finding fixed; reviewer confirmed resolution. Desktop/mobile/report screenshots had no new material clipping or overlap findings.
- UI mechanical detector returned an empty findings array on App.tsx/styles.css.

## Browser scenarios exercised

The single integration test runs the entire connected workflow and asserts each stage:

1. Create vehicle with unknown chassis/engine numbers; exactly eight items appear.
2. Change status, note and source; attach PNG; open and close the native evidence dialog.
3. Reload; vehicle, status, note, source and filename persist; file contents are unavailable and reattachment notice appears.
4. Summary correctly shows one follow-up item and six unchecked items.
5. Generate report with disclaimer; actual PDF page count is one.
6. Eight long Thai notes/sources/filenames and long vehicle metadata: actual PDF page count is one.
7. Wide unbroken Latin text, 2,000-character notes and maximum-length metadata: actual PDF page count is one. Notes remain 100-character excerpts and every abbreviation has a marker.
8. Two fictional cars keep separate notes.
9. Checklist, summary and add-car flow at 390×844 have no horizontal overflow.
10. Unsupported attachment is rejected without changing status.
11. Quota exception shows a visible failure, changes the persistent save indicator, and does not change the saved inspection state.
12. Unknown vehicle edit URL cannot create a vehicle.
13. Corrupt JSON is retained; writing controls are disabled with a visible explanation.

## UX revision checks

- Newly loaded fictional Toyota record correctly puts the request for original documents in follow-up, with a separate completed comparison.
- Report includes the entire 80-character chassis and engine identifiers, not excerpts; plate identifiers also render in full.
- Reports order follow-up and unchecked items before completed items. Dense test records no longer pair checked status with instructions to perform further checks.
- Mobile first inspection starts before 520px (approximately 483px in the 390×844 capture); status button height is at least 44px; the duplicated badge is hidden.
- Report text increased to 8.5pt for ordinary records; dense fixtures use 7.5pt. Long Thai and wide Latin fixtures remain one A4 page with full identifiers.

Unit tests additionally cover the 10 MB boundary, oversized files, unsupported file types, schema incompatibility, storage access denial, counts and paper-note truncation.

## Artifacts

- `example-report.pdf`: one-page report from an explicitly fictional Toyota sample.
- `qa/desktop.png`, `qa/mobile.png`: browser screenshots of the working app.
- `qa/report.png`, `qa/long-report.pdf`, `qa/wide-report.png`, `qa/wide-report.pdf`: dense report fixtures.

## Limits

Human testing with three dealership staff has **not** happened. No claim is made about 5-minute completion, user comprehension, willingness to use on real cars, or market acceptance. Use trial-guide.md and record actual observations in trial-results.csv. Report text is compact; check printed readability with those participants.

Browser tests use a separate disposable profile inside `.cache/` and a local debugging connection. Chromium sandbox disabling is restricted to this headless test process to accommodate the managed Windows execution environment; the application does not change the user's normal browser settings.

Packages were copied from an existing local installation because outbound npm access was denied. A package-lock.json was generated offline for the selected dependencies. A fresh machine needs normal npm registry access for `npm ci`.
