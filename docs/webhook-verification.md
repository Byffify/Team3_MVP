# Make waitlist integration — 2026-10-07

## Implemented

- Existing form and styles retained; third input name changed from role to extra.
- Client validation precedes request. POST uses mode no-cors and URLSearchParams with exactly name, email, extra; no custom Content-Type or JSON.
- Disabled submit/input controls and a synchronous ref guard prevent concurrent requests. The button shows sending state; rejection restores retry with existing values.
- Resolved fetch displays: ส่งคำขอแล้ว ขอบคุณ! หากไม่เห็นอีเมล กรุณาตรวจสอบ Spam
- Rejected fetch displays: ส่งไม่สำเร็จ กรุณาลองอีกครั้ง
- No response status, ok or body inspection. No automatic retry, destination logging, destination display or new local signup storage.

## Evidence and limits

- Unit tests check exact request fields/options, invalid email and rejection, using an opaque-response proxy that fails if inspected.
- Browser tests mock transport to verify all three HTML input names, payload, disabled/sending state, duplicate prevention, error/retry, exact confirmation and keyboard focus. Original app and report regression checks remain included.
- Build and 11 unit tests passed. There is no lint script in this project.
- One authorized live test using the supplied inbox was attempted. It produced a network error; a separate host reachability probe returned EACCES in this execution environment. Receipt by Make is not confirmed.
- The live marker and unverified downstream statuses are in qa/webhook-live-result.json. It contains no destination URL.
- Supplied Make and Sheets links were inaccessible to the read-only web tool. No authenticated browser or mail/Sheets connector was available. Run History, spreadsheet row and real inbox delivery are therefore unverified.
- Read-only code reviewer found no material contract bugs.

## Verify in the owner's account

1. Open the existing Make scenario. Use Run once to capture a test, or enable its intended webhook schedule. Do not create a replacement webhook.
2. Open the landing in the normal browser. Submit a unique name, a real test inbox and a test role once. The confirmation only means browser fetch resolved, not that downstream modules succeeded.
3. In Make History, find that run and inspect the webhook input: name, email, extra must be populated. Check the Google Sheets/email modules and their field mappings against those names. Resolve any module error before calling the flow successful.
4. In the supplied spreadsheet, locate the matching test row and verify all three values. In the supplied inbox, find the matching email and also check Spam. Record actual results; do not infer delivery from the form.

## Publish / Update

Not published. The checkout has a GitHub source remote, but no hosting manifest, deployment workflow or provider configuration. No matching 2Cars/Team3 project was found in the connected Sites account; no new hosting project was created.

On the user's existing static host:

```powershell
npm.cmd run build
```

Deploy the entire dist folder, including index.html, app.html, assets and images. If the host is connected to this GitHub repo, push the reviewed changes and trigger its configured deployment instead. Check the production deployment reports success and repeat the form/Make/Sheets/inbox checks from its actual URL. GitHub source alone is not evidence of a published site.
