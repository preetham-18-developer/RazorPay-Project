# DisputeShield — Design System & Visual Specification

This document establishes the official design system, semantic color system, typography hierarchy, component guidelines, and accessibility rules for **DisputeShield** (Track 02: AI Risk Manager).

---

## 1. Design Philosophy

**Editorial + Forensic + Fintech + Investigation**

DisputeShield is designed as a sophisticated digital investigation room and case dossier ledger used by professional risk officers investigating payment disputes.

- **Editorial Luxury Layout**: Restrained composition, generous whitespace, high contrast, serif display typography.
- **Forensic Case Dossier**: Physical-feeling case file records, evidence checklist, audit trail timeline, physical verdict stamps.
- **Fintech Precision**: Crisp monospaced technical telemetry, exact numbers, hairline dividers, zero decorative clutter.
- **Bounded Autonomy**: Clear separation between AI model recommendation outputs and deterministic policy threshold checks.

---

## 2. Locked Semantic Color System

Color in DisputeShield conveys strict operational meaning. Never use color purely for decoration.

| Token | Hex Value | Semantic Meaning | Usage |
|---|---|---|---|
| `--ink` | `#15120F` | Primary Background | Deep warm black workspace background |
| `--ink-soft` | `#211C17` | Panel / Dossier Surface | Case manifest & dossier container background |
| `--ink-line` | `#3A332A` | Hairline Divider | 1px borders, separators, grid lines |
| `--paper` | `#F6F1E7` | Primary Text & Highlights | Editorial headings, body text, paper accents |
| `--ember` | `#C4432B` | Fraud Risk Signal ONLY | High fraud risk, rejection buttons, risk warnings |
| `--ember-bright` | `#E8703C` | High Risk Accent | High risk score gauge highlight |
| `--gold` | `#B98B3E` | Evidence & Confidence ONLY | Evidence strength, confidence %, focus outlines |
| `--moss` | `#4B6350` | Safe / Auto-Draft ONLY | Low risk, high evidence, auto-draft verdict stamps |
| `--moss-bright` | `#6B8A72` | Strong Safe Accent | Approved review status, safe telemetry indicators |
| `--stone` | `#8A8377` | Ambiguous / Neutral | Ambiguous signals, review verdict stamps, neutral borders |
| `--stone-light` | `#B9B2A2` | Secondary Text | Subtitles, labels, secondary metadata |

---

## 3. Typography Rules

Three distinct typography roles establish strict information hierarchy:

### Display & Headings (`Fraunces`)
- Google Font: `Fraunces` (Serif display).
- Usage: Page titles, section titles, case titles, verdict stamps, large ledger metrics.

### Body & Prose (`Inter`)
- Google Font: `Inter` (Sans-serif UI font).
- Usage: Normal text, descriptions, buttons, investigation findings, reviewer feedback.

### Technical & Telemetry (`IBM Plex Mono`)
- Google Font: `IBM Plex Mono` (Monospace font).
- Usage: Dispute IDs (`#disp_SYN0001`), payment IDs, amounts (`₹18,999.00`), percentages (`92.3%`), timestamps, telemetry parameters.

---

## 4. Core Metaphor: Case Ledger + Dossier

The workspace is organized into two primary conceptual layers:

- **Case Ledger (Left Column & Metric Strip)**: The active dispute case manifest list, search bar, reason code filters, and top metrics strip (`OPEN DISPUTES`, `HIGH RISK`, `READY TO CONTEST`, `HUMAN REVIEW`, `AVG EVIDENCE`, `PRECISION / RECALL`).
- **Case Dossier (Right Column)**: The deep investigation dossier file for the selected dispute containing the SVG Risk × Evidence quadrant, verdict stamp, model vs policy card, evidence file, investigation trail, defense draft, and telemetry accordions.

---

## 5. Signature Visual Elements

1. **Risk × Evidence SVG Quadrant**: Plotting Fraud Risk (X-axis: 0–100) vs Evidence Strength (Y-axis: 0–100) across 4 semantic zones (`AUTO DRAFT`, `PREPARE & REVIEW`, `DO NOT CONTEST / REVIEW`, `REVIEW`).
2. **Editorial Verdict Stamp**: Rotated (`-1deg` / `1deg`) bordered verdict stamp in decision color (`moss`, `gold`, `ember`, `stone`).
3. **Model vs Policy Separation**: Explicit visual distinction highlighting when the deterministic ₹5,000 safety gate overrides initial model outputs (`₹18,999 > ₹5,000`).

---

## 6. Accessibility & Keyboard Shortcuts

- **Focus Indicator**: `2px solid var(--gold)` visible focus outline on all interactive controls.
- **Keyboard Navigation**:
  - `ArrowUp` / `ArrowDown`: Move case selection in manifest.
  - `Enter`: Trigger investigation for selected case.
  - `Escape`: Collapse transient accordions or modals.
- **Reduced Motion**: Respects `prefers-reduced-motion` media queries.

---

## 7. Do-Not-Use Rules

- ❌ DO NOT use purple gradient backgrounds or SaaS dashboard sidebars.
- ❌ DO NOT use generic rounded cards with heavy drop shadows.
- ❌ DO NOT use AI chat bubbles, robot illustrations, or decorative blobs.
- ❌ DO NOT calculate ML risk scores or safety gates in React.
- ❌ DO NOT expose `ground_truth` anywhere in the UI.
