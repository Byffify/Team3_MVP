# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React + TypeScript + Vite + plain CSS, approved in the implementation plan.

## Users
Thai used-car dealership staff recording and reviewing vehicles before purchase.

## Product Purpose
Record vehicles, evidence sources and inspection status; reveal missing work; produce a one-page report.

## Operating Context
One shared trial computer, same browser and origin. No multi-device collaboration. PDF reports may be shared.

## Capabilities and Constraints
Eight fixed sample checks. Three statuses: checked, follow_up, not_checked. Structured data and filenames persist in localStorage. File contents are session-only. No backend, login, automated history checks, purchase recommendation or safety score.

## Evidence on Hand
User-provided short product spec, one interview as a hypothesis, three-user trial targets. All bundled vehicle data is explicitly fictional.

## Product Principles
- Show unfinished inspection work before completed work.
- Keep source attribution visible.
- Never imply verified history or vehicle safety.
- Make persistence and temporary attachments understandable.

## Accessibility & Inclusion
Thai UI, text alongside color status, keyboard focus, responsive mobile and desktop layout.
