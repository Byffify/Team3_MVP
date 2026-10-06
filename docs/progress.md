# Implementation ledger — docs/implementation-plan.md

Ruling: workspace is empty and not a Git repository; implement directly in the authorized directory without creating a worktree or making commits.
Ruling: user approved the full plan and requested implementation; preserve that product/stack approval instead of reopening the design interview.
Ruling: report notes use a 100-character excerpt; full notes stay in the application. Sources and filenames are visibly abbreviated on paper if needed to protect one-page layout.
Pre-flight: all screens consume the same Vehicle/InspectionItem store. File blobs remain outside serializable state.

Foundation: 7 Node tests passed; TypeScript and Vite build passed.
Ruling: outbound npm connections are denied (EACCES); copied installed React/Vite/TypeScript modules from D:/TypingPractice into this workspace, with no changes to the source project. Node's built-in test runner replaces Vitest.
Ruling: use installed Thai system fonts; do not depend on a remote Google Fonts request or redistribute Windows fonts.
Ruling: browser connector has no enabled browsers; verify with isolated headless Edge as an automated product test, not the user's browser profile.

Vehicle/checklist/summary/report: implemented. Source and filename persisted; temporary blobs kept outside store. Attachments require source attribution.
Review: independent read-only reviewer identified missing-edit route and stale success message on failed save; browser regression tests reproduced both, then fixes passed. Dialog heading now supplies accessible name.
Browser test infrastructure: exclude .cache browser profiles from Vite watcher to prevent EBUSY server shutdown. Chromium's GPU subprocess was incompatible with managed Windows execution; only isolated headless test profiles use --no-sandbox; normal app browsing unchanged.
PDF verification: one-page standard, long Thai and wide Latin reports. Report metadata, source and filenames explicitly shortened, notes at 100 Unicode code points. Test harness clears forced screen-media emulation before printToPDF; otherwise it incorrectly prints application chrome.
Task completion: 7 Node unit tests passed, TypeScript/Vite production build passed, Edge and Chrome browser integration passed. All review findings resolved; desktop/mobile/report screenshot review found no new material issues. Evidence recorded in docs/verification.md.
Human trial remains pending real dealership participants. No fabricated timing or acceptance results.

UX revision: corrected newly loaded Toyota sample to follow-up for pending original documents, with one separate completed comparison. Added guidance near status controls; existing records are not auto-reclassified.
UX revision: report preserves full plate/chassis/engine identifiers in dedicated rows, orders pending items before completed items, and labels the abbreviated summary clearly. Normal table typography increased to 8.5pt; dense fixtures use 7.5pt.
UX revision: mobile first item now starts at roughly 483px, status controls have >=44px touch targets and selected markers, duplicate status badges are hidden on mobile. Notes encourage putting the follow-up action first.
Regression evidence: new sample test and full-identifier browser assertions failed before changes, then passed. 8 unit tests, Edge flow and TypeScript/Vite build passed after changes. Long reports remain one A4 page including full 80-character identifiers.
