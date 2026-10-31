# DESIGN.md: CIT Scheduler ("Chilika")

Design system for the Chilika Institute of Technology scheduling and venue platform. Twelve screens, four roles, one job: let a judge who has never seen the app find a room, read a timetable and approve a change in under three minutes.

---

## 1. Concept

**A printed institute timetable, redrawn as a working instrument.**

The product is a grid of hours, rooms and people. The best grids in our references (Teams calendar, Intelly) win because they are dense, legible and honest about state. The best *personalities* (Poieto, India Jazz map) win because one handmade-feeling image carries the whole identity while everything else stays quiet.

So the rule is: **quiet, dense, paper-like UI everywhere, and one memorable illustrated object, the campus map.**

Grounded in the subject:

- **Chilika** is a brackish lagoon on the Odisha coast. Our ink colour is lagoon-deep teal, not black.
- **Odisha pattachitra** uses a short natural pigment set: conch white, lamp black, haritala yellow, hingula red-orange, indigo, leaf green. That is our palette. It is specific, it is regional, and it is not the cream + terracotta or black + acid-green that generated designs default to.
- **Spectra** is a fest. Events get the one warm, loud colour (haritala). Classes stay cool. At a glance you can see "fest on top of the regular week", which is the whole Week 7 story.

Tone of voice: plain, exact, sentence case. The interface states facts and reasons. It never sells.

---

## 2. Why the reference images win (and what we take)

| Reference | Why it wins as a design | What we take | What we refuse |
|---|---|---|---|
| **Poieto login** | One painted image carries the brand. A big serif headline against a quiet form. Off-white surface, never pure white. Muted ochre and green. | Generative stipple landscape of Chilika on the login card. Serif headline at large size. Form stays small and calm. | The blurred full-bleed background and large uniform corner radius. |
| **Microsoft Teams calendar** | Real product, real density. State is encoded in the *border and fill*, not extra labels: dashed = tentative, hatched = invited, outlined = declined, strikethrough = cancelled. A live "now" line. | State-by-stroke system for sessions. Now-line. Compact 11 to 12px card text. Sticky day header. | Pastel blue and pink fills. Left colour stripes on cards. |
| **SkillSet dashboard** | Clear hierarchy: one hero banner, one main content zone, one narrow right rail. | The banner + main + rail skeleton for the dashboard. | Glossy 3D art, purple gradient washes, soft pastel everything. |
| **India Jazz venue map** | An illustrated isometric line map that is also a legend and a wayfinder. Black label tags pinned to objects. Warm gradient ground that frames the drawing. | Our signature: an isometric line-art CIT campus map for Venue Explorer, the dashboard banner and the Spectra view. Ink label tags pinned to venues. A boxed legend. | Rainbow gradient ground. We use flat paper with one soft lagoon-to-paper fade at most. |
| **Intelly schedule** | Warm neutral canvas, one dark rail as anchor, colour used only as category. Today's column header is a solid black pill. Dashed now-line. Cards carry real content (avatars, files). | Dark lagoon rail. Today pill. Cards that hold faculty, room and group chips. Neutral cards with a single tinted category. | Rounded-everything and emoji-like avatars. |
| **TimeFrame** | A strong two-colour pairing (violet + lime) and a visible Dark / Light switch. Big readable day numbers. | The idea of one warm accent against one cool field. Dark/Light toggle in the header. Large day numerals in the week header. | The purple field and neon lime. Haritala on lagoon gives the same contrast with a real reason behind it. |

**Shared reason they win:** each commits to *one* idea (a painting, a map, a dark rail, a now-line), uses colour as information, and keeps everything else restrained. Generic designs spread decoration evenly. We concentrate it.

---

## 3. Anti-AI rules mapped to decisions

| # | Rule | Our decision |
|---|---|---|
| 1 | No harsh gradients | None in UI. One 6% lagoon-to-paper fade behind the map illustration only. |
| 2 | Few Lucide icons | Icons only in the rail, status marks and the accessibility glyph. Set is a single 1.5px stroke family (Phosphor Light), never mixed. Text labels carry the rest. |
| 3 | No pure white | Page `#E8E6DD`, surface `#F3F1E9`, raised `#F9F8F3`. `#FFFFFF` is banned. |
| 4 | No rainbow | Six semantic colours, each with one meaning (section 4). Heatmap is a single-hue ramp. |
| 5 | No excess shadow | Zero shadows on cards. Borders do the work. One shadow exists: the right drawer and command palette. |
| 6 | No 3-card row | Dashboard uses one wide metric strip separated by hairlines, not three cards. |
| 7 | No emojis | None. |
| 8 | No liquid glass | None. Surfaces are opaque paper. |
| 9 | No em-dash styling | No em dashes in UI copy. Use a full stop or a colon. |
| 10 | No Inter by default | See note below. Inter is a **decision** here: tabular figures for 189 sessions and period numbers. It is set with tnum on, tight at small sizes, and always paired against Instrument Serif so it reads as the quiet partner, not the default. |
| 11 | No coloured left stripes | Session cards use full tint fill. Type is shown by fill + a small corner tag. |
| 12 | No fake testimonials | None. Judge proof screen shows real validator output. |
| 13 | No generic bento | Layouts are grids of the actual data: timetable, matrix, ledger. |
| 14 | No terminal aesthetic | The validator output is a typeset report, not a black console. |
| 15 | No "It's not X, it's Y" copy | Copy states what a thing is or does. |
| 16 | No checkmark bullets | Plain lists. Status uses a typed chip ("Approved"), not ticks. |
| 17 | No 3-tier pricing | Not applicable. |
| 18 | Real product demo | All screens are seeded with the real dataset: CS101, CR-01, Dr. Raman, PHY-L2, Spectra requests. No lorem ipsum. |
| 19 | No excess radius | Hierarchical: grid cells 2px, session cards 4px, panels 8px, chips full pill. Never one radius everywhere. |
| 20 | No purple + black | Lagoon teal ink + paper + haritala. |
| 21 | Skeleton loaders | Mandatory. Skeletons are shaped like the grid they replace. |
| 22 | No radial orbs | None. |
| 23 | No dot-grid backgrounds | None on the UI. Dots appear only in the login stipple painting, where they are the artwork. |
| 24 | No sparkle icons | AI features are marked with the text "Drafted by AI" and a small kernel stamp, never a sparkle. |
| 25 | No animated arrows | None. |
| 26/27 | ToS and privacy | Footer links on login to short static pages. Seed them. |
| 28 | Few hover animations | Hover = a 1px border darken. No lift, no scale. |
| 29 | No neon | Haritala is a turmeric yellow with a reason: it means "event". |
| 30 | No pastel palette | Tints exist only as 18% mixes of the semantic hues and always sit next to full-strength ink. |

Additional tells from the frontend-design skill we also avoid: tracked all-caps eyebrow labels above headings, middle-dot meta strings ("A · B · C"), "WORD: fragment" labels, `→` on every button, monospace for small labels, and single-word accenting in headlines. Section headings are plain sentence case.

---

## 4. Colour

### Light (default)

| Token | Name | Hex | Use |
|---|---|---|---|
| `--paper` | Shell | `#E8E6DD` | App background |
| `--surface` | Conch | `#F3F1E9` | Panels, grid cells |
| `--raised` | Conch high | `#F9F8F3` | Drawer, palette, inputs |
| `--line` | Silt | `#CFCCBF` | 1px borders |
| `--line-strong` | Silt dark | `#A9A89B` | Grid hour lines, input hover |
| `--ink` | Lagoon ink | `#12292B` | Text, rail, today pill |
| `--ink-2` | Lagoon mid | `#4A5F60` | Secondary text |
| `--lecture` | Indigo | `#3B4F8C` | Lecture sessions |
| `--tutorial` | Lagoon | `#2F7A78` | Tutorial sessions |
| `--lab` | Kendu | `#8A6A1E` | Lab text on lab tint (the tint is haritala-light) |
| `--event` | Haritala | `#E3A72F` | Events, Spectra, anything "on top of the week" |
| `--bad` | Hingula | `#B93A26` | Hard violation, rejection, overcapacity, conflict |
| `--good` | Leaf | `#4F7F4C` | Valid drop, approved, optimal utilisation |

### Tints (derived, never invented)

Each tint is the hue mixed at 18% into `--surface`. Session fills:

- Lecture `#D9DEEE`
- Tutorial `#D1E1DD`
- Lab `#F1DFAE`
- Event `#E3A72F` (solid, full strength, the only solid fill on the grid)
- Bad wash `#EFD3CC`
- Good wash `#D7E4D2`

### Dark

| Token | Hex |
|---|---|
| `--paper` | `#0E1F21` |
| `--surface` | `#152C2E` |
| `--raised` | `#1C3739` |
| `--line` | `#2B4547` |
| `--ink` (text) | `#EDEBE0` |
| `--ink-2` | `#9DB0AE` |
| `--lecture` | `#8FA3E0` |
| `--tutorial` | `#6FC0BC` |
| `--event` | `#F0B83F` |
| `--bad` | `#E56A55` |
| `--good` | `#86B57F` |

Dark mode tints use 22% mixes into `--surface`. The rail stays `#0A1718` in dark.

### Colour rules

1. Cool = the regular week (classes). Warm = things added on top (events, bookings). Red = something is wrong. Green = something is legal.
2. Never use a semantic colour decoratively.
3. Text on haritala is always `--ink`. Text on hingula is paper.
4. Colour is never the only signal. Every colour state also has a stroke, hatch or word (section 7).

---

## 5. Typography

- **Display:** Instrument Serif (Regular + Italic only; it has no bold, so do not fake one).
- **UI:** Inter, `font-feature-settings: "tnum" 1, "cv11" 1, "ss03" 1;`
- No monospace anywhere. Rule codes (H9, S5) and IDs are set in Inter tabular inside a bordered chip.

### Scale (rem at 16px base)

| Role | Font | Size / line | Weight | Notes |
|---|---|---|---|---|
| Hero | Instrument Serif | 64 / 64 | 400 | Login and judge proof only. Tracking -0.02em |
| Page title | Instrument Serif | 40 / 44 | 400 | One per screen |
| Section title | Instrument Serif | 26 / 30 | 400 | Panels |
| Big number | Instrument Serif | 56 / 56 | 400 | Metric strip values |
| Italic aside | Instrument Serif Italic | 18 / 24 | 400 | Used for reasons and the "why" lines only, so italic always means *explanation* |
| Body | Inter | 14 / 22 | 400 | |
| UI label | Inter | 13 / 18 | 500 | Buttons, tabs |
| Grid card | Inter | 12 / 15 | 500 title, 400 meta | |
| Micro | Inter | 11 / 14 | 500 | Period numbers, chips |

Rules:

- Sentence case everywhere. No all-caps labels. No letter-spaced eyebrows.
- Headlines are one weight, one colour. No single highlighted word.
- Serif body copy (explanations in the Why Here drawer) uses line-height 1.55 and max 62ch. Sans body max 72ch.
- Numbers in tables and grids are always tabular.

---

## 6. Layout system

- **Shell (desktop ≥1024):** lagoon-ink rail 232px on the left, content area on `--paper`, sticky header 56px.
- **Tablet (640 to 1023):** rail collapses to a 64px icon + initial rail.
- **Phone (<640):** rail becomes a 5-item bottom bar (Dashboard, Timetable, Rooms, Bookings, More). Timetable grid becomes a day-by-day agenda list.
- **Grid unit:** 4px. Spacing steps 4, 8, 12, 16, 24, 32, 48.
- **Page gutter:** 32px desktop, 16px phone. Content max width 1440.
- **Alignment:** left-aligned everywhere except the login hero and empty states (centred).
- **Panels:** `--surface`, 1px `--line`, radius 8. Panel title in Instrument Serif 26. No icon next to panel titles.

```
Desktop shell
+------+---------------------------------------------------------+
| RAIL | Header: week 7 pill · search (Ctrl K) · role · dark/light |
|      +---------------------------------------------------------+
| nav  |  Page title (serif 40)                    [primary action]|
|      |  -----------------------------------------------------   |
|      |  content                                                 |
+------+---------------------------------------------------------+
```

### Rail

- Ink background. Logo: a small mark (two stacked waves forming a "C") with "CIT Scheduler" in Instrument Serif 20.
- Nav in Inter 13/500, paper at 70% opacity; active item is paper at 100% with a 2px paper underline under the text, not a filled pill.
- Items are role-aware (admin sees Disruption, Proof, Priority; club rep sees Bookings only).
- Bottom: current user, role chip, "Sign out".

### Header

- Left: "Week 7" in a solid ink pill (same device as Intelly's today column), then "Mon 2 Nov" in ink-2.
- Centre: search field that opens the command palette. Shows "Ctrl K".
- Right: role switcher (avatar initials + role), dark/light switch as a two-segment control labelled "Light | Dark" (as in TimeFrame).

---

## 7. Components

### Session card (the most important component)

Content, in order: course code (500), short title (400, truncates), faculty surname, room ID. Size 12/15.

| Type | Fill | Border | Corner tag |
|---|---|---|---|
| Lecture | `--lecture` tint | 1px `--lecture` | "L" |
| Tutorial | `--tutorial` tint | 1px `--tutorial` | "T" |
| Lab (3h) | `--lab` tint, spans 3 rows | 1px `--lab`, a notch cut at each end showing it is one block | "Lab 3h" |
| Elective basket | type fill | **dashed** 1.25px (as Teams "tentative") | basket name, e.g. "Basket B" |
| Combined lecture | type fill | **double edge**: second outline offset 3px behind, showing it covers several groups | "x3 groups" |
| Fixed slot | type fill | 1px + small pin glyph | pin |
| Event | `--event` solid | none | "Event" |
| Maintenance / closed | hatched `--line-strong` 45deg | 1px | "Closed" |
| Moved (diff) | `--event` tint | 1.5px `--event` | "Moved" |
| Removed (diff old slot) | transparent | dashed `--bad` | text strikethrough |
| Violation | `--bad` wash | 1.5px `--bad` | rule code chip |

- Radius 4. No shadow. Padding 6/8.
- Wheelchair glyph (16px, ink) bottom-right when the room is accessible.
- Hover: border goes `--ink`. Click: opens the Why Here drawer.
- Dragging: card lifts to a 1px ink outline with a 2px translucent offset ghost at origin. No scale.

### Timetable grid

- Columns: Mon to Fri, equal width, 56px period label column.
- Header: day name + large numeral (Instrument Serif 28). **Today** gets an ink pill with paper text.
- Rows: P1 to P9 at 72px each. Period label shows "P1" and "08:00" stacked, tabular.
- **Lunch band:** between P5 and P6, 28px high, diagonal hatch in `--line`, centred text "Lunch 13:00 to 14:00". Not a card.
- **Evening strip (P10 to P13):** below the grid, separated by a 24px gap, on a **lagoon-ink background** (day turns to evening). Cells use `--ink` surface; events render in solid haritala. This is where Spectra lives visually.
- **Now line:** 1px dashed ink across the grid with a filled dot on the period axis (as in Teams / Intelly).
- **Drop legality:** while dragging, every cell takes a wash. Legal cells `--good` wash + 1px good outline. Illegal cells `--bad` wash with diagonal hatch; hovering shows a tooltip in ink: rule code chip + one sentence ("H2: Dr. Sharma teaches CS201 here.").
- Hour lines: 1px `--line`. Column separators: 1px `--line`. No zebra.

### Metric strip (Dashboard)

One panel, four cells divided by hairlines. Each cell: value in Instrument Serif 56, label in Inter 13 ink-2, and one detail line in Inter 12. Not four cards. Cell 2 (Hard violations 0) shows a typed chip "Valid" in leaf wash.

### Chips

Full pill, 24px, Inter 11/500, 1px border, tinted fill. Status chips use words: Approved, Rejected, Pending, Cancelled, Moved, Valid, Failed. Rule codes (H9, S5) are square-cornered (2px) to distinguish them from status.

### Priority rank mark

Six small bars side by side, N filled in ink, rest in `--line`. Next to it, the plain name ("Institute event"). Rank 1 is Exams.

### Buttons

- **Primary:** ink fill, paper text, radius 6, 36px high. One per screen region.
- **Secondary:** transparent, 1px ink border.
- **Destructive:** hingula fill, paper text; only for Reject, Reset demo, Overrule.
- Button labels are verbs with the object: "Approve and commit", "Run official validator", "Book auditorium". No arrows.
- Focus: 2px `--ink` outline with 2px paper gap. Always visible.

### Inputs

`--raised` fill, 1px `--line-strong`, radius 6, 40px. Label above in Inter 13/500. Field-level errors in hingula under the field, with the fix stated.

### Drawer and modal

Right drawer 480px for Why Here. The only elevated surface: `box-shadow: -1px 0 0 var(--line-strong), -24px 0 48px rgba(18,41,43,.12)`. Scrim is ink at 30%.

### Provenance annotation (AI booking)

Under each drafted field, an italic serif line, 14px, ink-2: *Periods P10 to P12 inferred from "shaam 6 baje se 9 baje tak".* Fields the AI guessed get a dashed bottom border until the user confirms them.

### Kernel stamp

A small bordered label with a hingula double rule: "Checked by kernel". Appears on every AI-drafted booking, every proposed reschedule and every proof result. It is the one recurring brand motif. It signals the hackathon rule: the LLM drafts, code decides.

### Empty, loading, error

- **Loading:** skeleton shaped like the final layout (a ghost grid for timetable, ghost rows for bookings). Shimmer is a slow 1.6s opacity pulse, no gradient sweep. Respect `prefers-reduced-motion`.
- **Empty:** centred small line illustration (from the map vocabulary) + one sentence + one action. Example: "No requests match this filter. Clear filters."
- **Error:** states what failed and what to do. "The solver did not respond within 30 s. The timetable was not changed. Try again or use the manual form." No apologies, no "Oops".

---

## 8. The signature: the CIT campus map

An **isometric line-art map of the campus**, drawn in 1.25px ink strokes on paper, in the manner of the India Jazz venue map. Built as one SVG with named groups per venue so each is interactive and can be coloured by data.

Contains the 27 venues: classroom blocks, lecture halls, auditorium (largest, with stage), seminar halls, open-air theatre (curved tiers), and the 7 labs, plus trees and the lagoon edge for place.

Uses:

1. **Venue Explorer:** the map is the room finder. Select a day and period, and free venues light up in leaf wash, busy ones stay line-only, closed ones take hatch. Ink label tags (black rectangles with paper text, as in the reference) pin to hovered or selected venues.
2. **Dashboard banner:** a cropped corner showing the auditorium, seminar halls and open-air theatre, with haritala tags for the Spectra bookings.
3. **Spectra bookings:** same crop, tags numbered by priority rank.
4. **Login:** replaced by the stipple painting (section 9).
5. **Empty states:** a single venue from the map.

A boxed legend sits bottom-right, as in the reference (Free, Booked, Event, Closed, Accessible).

Build notes: one hand-tuned SVG, not generated by an icon library. Stroke only, no fills, except wash fills applied by state. If time is short, ship a simplified plan-view version with the same tag and legend system; the idea survives.

---

## 9. Motion

Spend motion in three places only.

1. **Login painting (once):** the stipple dots settle over 1.2s on first load. Not looping.
2. **Disruption diff:** moved sessions pulse **twice** in haritala, then rest. The old slot is already struck through. This is the one animation that matters, because it shows *what changed*.
3. **Drawer open:** 180ms slide with ease-out.

Everything else is instant or a 120ms colour change. No section fade-ins, no hover lift, no staggered entrances, no looping decoration. `prefers-reduced-motion` removes the pulse and the settle.

---

## 10. Copy and voice

- Sentence case. Active voice. One term per concept: **session**, **booking**, **disruption**. Use **room** in timetable, rooms and exam screens, and **venue** only in booking screens, and never mix the two on one screen.
- Buttons name the result. The button "Approve and commit" produces the toast "Committed. 3 sessions moved."
- Reasons are specific and finish with the fix:
  - Rejected: "Clashes with CS201 (CSE Year 2, Wed P3). The auditorium is free Thu P3."
  - Infeasible: "No valid schedule. Dr. Raman is on leave Wed, Physics Lab is closed Wed and a 3-hour lab needs P2 to P4 or P6 to P8. PHY-L2 has no legal slot."
- No marketing lines inside the product. The login page has one headline and one sentence.
- Real names from the dataset in every sample string.

Login headline: **Every session in its place.** (Instrument Serif 64)
Judge fast-track: "Demo accounts are seeded. Pick a role to enter."

---

## 11. Screen specifications

All screens inherit the shell. Each lists the memorable move, the structure and the states.

### 1. Login (`/login`)

- Centred two-part card, 1040 x 600, radius 8, on `--paper`. Left half: the **stipple painting** of Chilika (SVG/canvas, seeded dots, 6 palette colours: lagoon, leaf, haritala, indigo, hingula, conch; flamingos as small clustered pink-red dot groups, a low sun, water bands). Right half: form.
- Right half order: small logo, "Sign in to" + hero serif headline, **role chips** as a vertical list of four rows (Admin, Dean's office / Department coordinator / Faculty member / Club representative). Each row shows role name and email in ink-2. Click fills the form and signs in. Below: email, password, "Sign in" primary.
- Health badge, bottom of the form: "API online. Database connected." with a small leaf dot (dot is a status mark here, not decoration). On failure: hingula, "API unreachable. Manual forms still work after sign-in."
- Footer: Terms, Privacy.
- Phone: painting becomes a 160px band on top.

### 2. Dashboard (`/dashboard`)

- **Banner** (SkillSet idea, our content): left, serif title "Week 7 is the busiest week of the semester." and one sentence: "25 Spectra bookings, regular classes and midsem preparation overlap." Right, the cropped campus map with haritala tags. Ink-on-surface, no gradient.
- **Metric strip** (4 cells): Sessions scheduled 189 / Hard violations 0 / Soft penalty (live) / Pending approvals. A fifth line below the strip: Campus room utilisation as a thin single-hue bar with the percentage.
- **Role action deck:** a horizontal list of 2 to 3 actions as large text rows with a one-line description each, not cards with icons. Admin: Generate timetable, Simulate disruption, Run validator audit.
- **Today's schedule:** vertical timeline, period labels left, session chips right, a now-line.
- **Conflict radar:** a single sentence panel. "0 active conflicts." with a "Valid" chip. When conflicts exist, list each with its rule code, linking to the session.
- Layout: banner full width; below, 8/4 columns (strip + deck on the left; today + radar in the right rail).

### 3. Timetable (`/timetable`)

- Page title "Timetable". Lens tabs: **Student group / Faculty / Room**, underlined style. The dropdown for the chosen lens sits to the right of the tabs.
- Faculty lens adds a load meter by day in each column header: 4 small segments, filled up to hours taught (3 of 4).
- Room lens adds type and accessibility chips beside the dropdown.
- Grid and evening strip as in section 7.
- Phone: day selector as a 5-segment control; agenda list of session rows with period and time on the left.
- Legend row under the title: lecture, tutorial, lab, basket (dashed), combined (double edge), event. This is the key to the stroke language.

### 4. Exams (`/exams`)

- Grid: Mon to Sat columns; two rows AM 09:00 to 12:00, PM 14:00 to 17:00. Larger cells than the timetable.
- Exam cards show course code, group(s), room, and **seated of capacity**: e.g. "58 of 60", with a thin bar. The room chip reads "CR-01: 120 normal, 60 exam" so the halving is explicit.
- Clash validator: a panel on the right rail, a short list of checks ("No group has two exams at once") with Valid / Failed chips.
- Filters: branch, year, course code as a single row of selects. Export: "Export JSON" and "Export CSV" secondary buttons.

### 5. New booking (`/bookings/new`)

- Two tabs: **Describe it** and **Fill the form**. Fill the form is always reachable and never disabled.
- Describe it: large textarea (serif italic placeholder: *Auditorium chahiye kal shaam 6 baje se 9 baje tak, 200 logon ke liye*). Under it, sample prompts as plain text links in two columns, not pills.
- On submit, the draft appears beside the textarea: structured fields (venue, date, periods P1 to P13 as a segmented selector, title, category, attendees, wheelchair access), each editable, each with its italic provenance line.
- Kernel stamp above the draft: "Checked by kernel. This check does not use an AI model."
- Validation results list under the form: each rule, result, reason. If the venue is busy, an "Alternatives" list shows nearest valid options with a "Use this" button.
- Submit button: "Submit request". Disabled with the reason when invalid, never silent.

### 6. Bookings (`/bookings`)

- Filter tabs: All 25, Approved, Rejected, Pending, Cancelled.
- A dense table (not kanban cards): ID, Event, Requester, Venue, When, Attendees, Priority rank mark, Status chip. Row click expands in place into the **decision panel**: the reason sentence in serif, the reason code chip (CLASH_WITH_REGULAR_CLASS), and **Alternatives**: three small rows (same time in another room, adjacent period, another day) each with "Use this".
- Role actions in the panel footer: Approve, Reject, Overrule (opens a required reason field). Club rep sees "Cancel request" only.
- Cancelling shows an inline note: "BR-04 re-evaluated 2 blocked requests. 1 now approved."

### 7. Disruption (`/disruption`)

- Left column: input panel. "Load sample disruption" secondary button on top, then fields: faculty + leave dates, room + closure window, emergency session. Primary button: "Calculate minimal-move schedule".
- Right: result. Header sentence in serif: "3 sessions moved. This is the minimum possible." with the kernel stamp reading "Proven minimal by CP-SAT" when the solver reports optimal.
- **Before / after**: two stacked mini grids (or toggled), moved sessions in haritala tint, old slot dashed hingula with strikethrough, a thin ink line connecting old to new. Pulse twice.
- Below: change list (table: session, from, to, reason).
- **Infeasible state:** panel in hingula wash. Title "No valid schedule exists." List the conflicting constraints as bordered rows with rule codes. The only action offered is "Edit the disruption".
- Bottom sticky bar (admin only): "Reject proposal" secondary, "Approve and commit" primary. Non-admins see "Waiting for admin approval".

### 8. Why here (drawer)

- Opens from a session or a rejected booking. Title: course code + "in CR-01, Monday P1".
- **Ledger layout**: a list of rows, one per alternative period. Each row: period label, a status chip (Blocked) and one sentence with rule code. The chosen row at the top, in leaf wash, labelled "Placed here".
- Section "Why this room": a short sentence in serif italic.
- Footer toggle: "Rule trace" (default, deterministic) and "Plain language" (optional AI paraphrase, marked "Paraphrase by AI. The trace above is the source of truth.").

### 9. Rooms (`/rooms`)

- **Top: finder.** Day, period, minimum capacity, type as one inline row. Result list on the left, **campus map** on the right with matches highlighted.
- **Bottom: utilisation heatmap**, 27 rooms by 9 periods. Single-hue lagoon ramp for 0 to 90%; over 90% shifts to hingula; maintenance hatched grey; under 40% filled sessions get a dotted texture and a count in the legend ("14 sessions under 40%"). Cell size 28px; room labels left in Inter 12. Never red-yellow-green.
- Room table below: capacity, type, features, accessibility.

### 10. Proof (`/admin/proof`)

- Page title in the hero serif. This is the judge's page, so it is the most typographic one.
- "Run official validator" primary. Output is a **typeset report**: hard violations 0 (large serif number + "Valid" chip), soft penalty broken down S1 to S6 as a small table with horizontal bars, booking score with its formula.
- Tabs: Validator / Differential fuzzing / Red team. Fuzzing shows "10,000 mutations, 0 mismatches" and the last 5 runs. Red team shows 80+ vectors as a table: category (injection, role spoofing, Hinglish slang, contradiction), prompt excerpt, result (Blocked in code), rule that blocked it.
- Exports: "Download schedule.json", "Download schedule_after.json".
- Bottom-left, separated by a hairline and 48px: destructive "Reset demo to clean state". Confirmation dialog states exactly what is cleared.

### 11. Priority (`/admin/priority`)

- A vertical ladder of six rows, drag handle on the left, rank on the right, using the priority rank mark. Exams are rank 1 and rows can be reordered.
- Right rail: **Impact preview**. After a reorder, "4 of 25 Spectra bookings change outcome" and a list of those with before/after chips.
- "Save order" primary; below, the audit log as a plain table (time, admin, change).

### 12. Judge tour and command palette (overlay)

- **Tour:** three coach marks, ink tooltips with paper text, radius 6, pointing at the real element. Text names the task: "Find a free room at Thursday P6". "Skip tour" always visible bottom-left of each mark. Progress is "1 of 3" in plain text.
- **Palette (Ctrl+K):** centred 640px raised panel, input at top, grouped results: Rooms, Faculty, Groups, Actions. Natural-language queries ("Why is PHY-L2 at 8 AM?") run the explain path and open the drawer.

---

## 12. Accessibility and quality floor

- Text contrast at least 4.5:1 on all tokens (checked against `--surface` and `--paper`).
- Every state conveyed by colour also has a stroke, hatch, word or icon (dashed, hatched, struck, chip text).
- Visible focus ring everywhere. Drag and drop has a keyboard path: select a session, press M, choose a legal target from a list.
- Targets at least 40px on touch.
- Respect `prefers-reduced-motion` and `prefers-color-scheme` (default follows system, toggle overrides).
- Tested at 360, 768 and 1440 widths.

---

## 13. CSS tokens

```css
:root {
  --paper:#E8E6DD; --surface:#F3F1E9; --raised:#F9F8F3;
  --line:#CFCCBF; --line-strong:#A9A89B;
  --ink:#12292B; --ink-2:#4A5F60;
  --lecture:#3B4F8C; --tutorial:#2F7A78; --lab:#8A6A1E;
  --event:#E3A72F; --bad:#B93A26; --good:#4F7F4C;
  --t-lecture:#D9DEEE; --t-tutorial:#D1E1DD; --t-lab:#F1DFAE;
  --t-bad:#EFD3CC; --t-good:#D7E4D2;
  --r-cell:2px; --r-card:4px; --r-panel:8px; --r-pill:999px;
  --font-display:"Instrument Serif", Georgia, serif;
  --font-ui:"Inter", system-ui, sans-serif;
}
[data-theme="dark"] {
  --paper:#0E1F21; --surface:#152C2E; --raised:#1C3739;
  --line:#2B4547; --line-strong:#3E5E60;
  --ink:#EDEBE0; --ink-2:#9DB0AE;
  --lecture:#8FA3E0; --tutorial:#6FC0BC; --lab:#D8B35A;
  --event:#F0B83F; --bad:#E56A55; --good:#86B57F;
  --t-lecture:#25355F; --t-tutorial:#1B4A49; --t-lab:#4A3F1C;
  --t-bad:#4A2620; --t-good:#233F25;
}
body { font-family:var(--font-ui); font-feature-settings:"tnum" 1,"cv11" 1,"ss03" 1; background:var(--paper); color:var(--ink); }
h1,h2,.display { font-family:var(--font-display); font-weight:400; }
.hatch { background-image:repeating-linear-gradient(45deg,var(--line-strong) 0 1px,transparent 1px 6px); }
```

---

## 14. Self-review before shipping a screen

Ask of every screen:

1. Is the colour carrying a *meaning*, or just filling space? Remove it if the latter.
2. Could this screen belong to any other SaaS product? If yes, put a real dataset item on it.
3. Is there more than one decorative idea? Keep the map or the stamp, not both loud.
4. Does every rejection, block and AI output show its reason and the kernel stamp?
5. Do loading, empty and error states exist and match the final layout?
6. At 360px, can a judge still read a timetable and approve a change?
7. Remove one accessory.
