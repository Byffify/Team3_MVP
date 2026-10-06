---
name: ก่อนซื้อ
description: Thai dealership inspection workspace
colors:
  primary: "#143d32"
  ink: "#23332d"
  muted: "#64716a"
  background: "#f5f6f3"
  surface: "#ffffff"
  line: "#dfe5df"
  checked: "#236646"
  follow-up: "#85511b"
  unchecked: "#59665f"
typography:
  headline:
    fontFamily: "Noto Sans Thai, Leelawadee UI, Tahoma, sans-serif"
    fontSize: "29px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Noto Sans Thai, Leelawadee UI, Tahoma, sans-serif"
    fontSize: "14px"
    lineHeight: 1.65
rounded:
  control: "6px"
  surface: "9px"
spacing:
  compact: "8px"
  standard: "16px"
  page: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "9px 17px"
---

## Overview

A quiet working interface for recording facts and following up on incomplete inspection work. The visual system uses muted green surfaces and clear text statuses; it carries no safety verdict.

## Colors

Dark green for navigation and primary actions. Green means recorded checked status, amber follow-up, gray unchecked. Status words always accompany colors.

## Typography

Thai-capable locally installed fonts; no remote font requests. Headline 29px, body 14px, compact metadata 10–13px. Report table uses 8.5pt normally and 7.5pt for dense A4 summaries. Mobile status buttons use 12px labels and at least 44px height. No monospace decorative text.

## Layout

Desktop: 232px sidebar and a fluid workspace with 40px insets. At 1200px reduce sidebar/insets. At 800px replace sidebar with top navigation; at 520px forms and inspection fields become one column. A4 print: 12mm margins, 186mm report width, no application chrome.

## Elevation & Depth

Flat borders define working surfaces. Soft shadows only separate the paper preview and evidence dialog.

## Shapes

6px controls, 9px grouped surfaces, circular small state markers. Authored SVG icons use one consistent stroke.

## Components

Full-row vehicle buttons; segmented inspection status buttons with aria-pressed and a visible selected marker; text labels on every field; native modal dialog for viewing evidence. Mobile omits the duplicated status badge and uses a compact vehicle header. Tabs distinguish checklist, summary and report. Search is a horizontal icon/input group. Reports preserve full identifiers and put follow-up/unchecked items first.

## Do's and Don'ts

Keep incomplete inspection work prominent. Preserve whitespace and source attribution. Show storage failures in both alert and save indicator. Never convert counts into safety scores or hide unavailable attachments behind a working-preview affordance. Reports visibly label abbreviated text and never embed evidence files.

The 2Cars landing inherits this palette and font stack. Its hero uses a two-phrase Thai headline at 28–54px to avoid broken words, one dark-green CTA and an actual labelled sample-data app screenshot. Mobile is a single column; desktop uses a split hero and spacious alternating sections. Signup controls use 16px input text and >=48px height, and FAQs use native details/summary controls. Separate page-scoped selectors prevent changes to inspection screens.
