# Savora Design System

A warm, editorial food marketplace: paper-like surfaces, deep olive ink, terracotta actions and a serif voice. The system is intentionally closer to a independent food magazine than to a utility delivery app.

**Brand line:** Discover. Order. Enjoy.

---

## 1. Design principles

1. **Food is the colour.** Photography carries saturation; chrome stays quiet. Large areas of ivory and cream let dishes and dining rooms do the work.
2. **Editorial, not corporate.** A display serif for headlines and italic emphasis; Inter for everything that must be scanned quickly.
3. **Warm contrast.** Deep olive replaces black. Terracotta is reserved for action and emphasis, never decoration at scale.
4. **Generous negative space.** Sections breathe. Cards use image aspect ratios and rules rather than heavy borders.
5. **Honest surfaces.** Demo boundaries, illustrative maps and sample data are labelled in the interface, not hidden in footnotes.
6. **Motion with manners.** Reveals and hero animation support hierarchy; `prefers-reduced-motion` removes them.

---

## 2. Colour

All tokens are declared in `tailwind.config.ts`. Use the semantic token, not a raw hex value.

| Token | Hex | Usage |
| --- | --- | --- |
| `ivory` | `#F5F0E7` | Page canvas |
| `ivory-50` / `cream` | `#FBF8F1` | Raised cards, form fields, light panels |
| `ivory-200` | `#EDE5D7` | Image placeholders, quiet dividers |
| `olive-900` | `#1E2A21` | Primary headings |
| `olive-700` / `olive` | `#354638` | Body emphasis, dark panels, secondary buttons |
| `olive-600` | `#45543F` | Strong supporting copy |
| `olive-500` | `#5C6B52` | Secondary copy, metadata, captions |
| `olive-400` | `#87917B` | Decorative icons and large, non-essential marks only |
| `terracotta` | `#C65D3B` | Accent italics, rules, decorative marks |
| `terracotta-600` | `#A94B2D` | Text-bearing actions and links |
| `terracotta-700` | `#893B23` | Action hover, emphasis text |
| `gold-300` | `#D6AA70` | Warm highlight, dark-panel accent |
| `gold-100` | `#F3E5D0` | Soft offer surfaces |
| `brown-700` | `#49382E` | Warm secondary ink where olive is too cool |
| `success` | `#3F7A52` | Delivered / confirmed states |
| `warning` | `#B3813F` | Busy / attention states |
| `danger` | `#B3452F` | Destructive actions and errors |

### Contrast rules

Measured against the cream/ivory surfaces used in the product:

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `olive-700` on `ivory` | 8.88:1 | AAA |
| `olive-500` on `ivory` | 5.03:1 | AA normal text |
| `terracotta-600` on `cream` | 5.31:1 | AA normal text |
| `terracotta-700` on `cream` | 7.30:1 | AAA |
| `cream` on `olive-700` | 9.50:1 | AAA |
| `gold-300` on `olive-700` | 4.72:1 | AA normal text |
| `terracotta` on `cream` | 3.94:1 | Large text and graphics only |
| `olive-400` on `ivory` | 2.91:1 | Decorative only — never body copy |

**Rule:** small UI text uses `olive-500` or darker. `terracotta` may be used for display type ≥24 px, italic emphasis inside a display heading, icons and rules — not for 10–14 px copy. Primary buttons use `terracotta-600` with cream text.

---

## 3. Typography

### Families

| Role | Family | Fallback |
| --- | --- | --- |
| Display / editorial | DM Serif Display | Georgia, serif |
| UI / body | Inter | system-ui, sans-serif |

Both are self-hosted WOFF2 subsets in `public/fonts`, preloaded in `index.html`, and declared with `font-display: swap` in `src/styles/fonts.css`. No third-party font requests are made at runtime.

### Scale

| Token | Size | Use |
| --- | --- | --- |
| `text-display-xl` | `clamp(3.25rem, 6vw, 5.5rem)` / 0.98 | Homepage hero |
| `text-display-lg` | `clamp(2.5rem, 4.4vw, 4rem)` / 1.02 | Page heroes |
| `text-display-md` | `clamp(2rem, 3.2vw, 3rem)` / 1.06 | Section headlines |
| `text-2xs` | `0.6875rem` / 1.1, `0.08em` | Eyebrows and small caps |
| Body | `0.9375rem`–`1rem` / 1.6–1.75 | Paragraphs |
| UI small | `0.75rem`–`0.8125rem` | Metadata, helper text |
| Micro | `0.625rem` | Badges and labels only |

Rules:

- Headings use `font-display` and `font-normal`; never bold the serif.
- Italic serif is an accent. Use it on one phrase per heading, coloured `text-terracotta` (large text only).
- Body copy is never wider than ~68 characters (`max-w-lg` / `max-w-prose`).
- Eyebrows are uppercase, 600 weight, `0.18em` tracking, with a short leading rule.
- `text-wrap: balance` for headings and `pretty` for paragraphs is set globally.

---

## 4. Layout and spacing

| Token | Value | Use |
| --- | --- | --- |
| `max-w-shell` | `82rem` (1312 px) | Main content shell |
| `.shell` | max width + `px-5` / `sm:px-8` / `lg:px-10` | Every page section |
| `spacing.section` | `clamp(4.5rem, 8vw, 8rem)` | Vertical section rhythm |
| `spacing.gutter` | `clamp(1.25rem, 4vw, 3rem)` | Editorial gutters |
| Header height | `4.75rem` (`--savora-header-height`) | Sticky nav offset |
| Scroll padding | `5.5rem` | Hash-link landing |

Breakpoints follow Tailwind defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536. The reference viewport is **1440 px**; mobile review is **390 px**; tablet is **768 px**.

Grid patterns:

- Restaurant cards: 1 / 2 / 3 columns with `gap-x-6 gap-y-11`.
- Category rail: horizontal scroll on mobile, 8-up on desktop.
- Home hero: 12-column editorial split with an arched image.
- Auth: split panel — form left, photographic story right; collapses to a single column below `lg`.
- Profile/tracking: 8/4 or 7/5 content/sidebar split, stacking below `lg`.

---

## 5. Shape, elevation and texture

| Token | Value | Use |
| --- | --- | --- |
| `rounded-card` | `1.125rem` | Standard cards |
| `rounded-panel` | `1.5rem` | Large panels, map shell |
| `rounded-pill` | `999px` | Buttons, chips, badges |
| `rounded-arch` | `14rem 14rem 1.25rem 1.25rem` | Category imagery, hero arch |
| `shadow-soft` | `0 18px 40px -28px rgba(73,56,46,.45)` | Resting cards and buttons |
| `shadow-lift` | `0 32px 60px -32px rgba(73,56,46,.5)` | Hover elevation |
| `shadow-card` | subtle 2-layer | Dense surfaces |
| `.surface-grain` | 3.5% SVG noise overlay | Large photographic panels only |

Borders are warm and low-contrast: `border-olive-900/8` to `/15`. Avoid pure grey or pure black. Dark panels use `bg-olive-700`/`olive-800` with `text-cream` and gold accents.

---

## 6. Components

### Primitives — `src/components/ui`

| Component | Purpose / variants |
| --- | --- |
| `Button`, `ButtonLink` | `primary` (terracotta-600), `secondary` (olive), `outline`, `ghost`, `light`, `gold`, `danger`; sizes `sm`/`md`/`lg`/`icon`; loading state |
| `Input`, `Textarea`, `Select` | Label, hint, error, leading icon, 48 px field height |
| `Checkbox` | Native input with styled control and label |
| `Badge` | `olive`, `gold`, `terracotta`, `cream`, `outline`, `success` |
| `Avatar` | Initials fallback, image key, sizes, optional ring |
| `Rating` | Star row with numeric value and review count |
| `Image` | Manifest-backed `srcset`, intrinsic size, lazy load, fallback |
| `Skeleton` / `PageLoader` | Query loading and route fallback |
| `StatePanel` | `EmptyState` and `ErrorState` with optional action |
| `QuantityStepper` | Accessible −/+ control |
| `Reveal` | GSAP scroll reveal wrapper |
| `SectionHeading` | Eyebrow, title, description, optional action |
| `FormAlert` | Form-level error/success message |
| `Toaster` | Bottom/top toast stack from `toast-store` |
| `Logo` | Inline sun-over-plate mark and wordmark |

### Shared chrome — `src/components/shared`

`Navbar`, `AnnouncementBar`, `LocationMenu`, `SearchBar`, `AccountMenu`, `CartButton`, `MobileMenu`, `Footer`.

### Page-level patterns

- **Home:** hero with arch image and GSAP entrance, category rail, restaurant grid, dish cards, offer cards, delivery story, three-step explainer, closing CTA.
- **Auth:** split layout with a photographic panel, demo disclosure, inline validation, password visibility control.
- **Profile:** sticky section rail, editable personal form, address cards/dialog, preference switches, read-only payment methods, sign-out.
- **Tracking:** status hero, demo map, vertical timeline, driver card, order receipt sidebar.

---

## 7. Interaction and motion

| Pattern | Behaviour |
| --- | --- |
| Route change | Scroll to top; hash links scroll to section after render |
| Hero | GSAP timeline, staggered fade/slide, respects reduced motion |
| Section reveal | `Reveal` fades/translates once at 12–18% viewport |
| Hover | 300 ms colour/shadow transitions; images scale 1.05 over 700 ms |
| Focus | 2 px terracotta outline, 3–4 px offset, always visible |
| Loading | Skeletons for content, spinner inside buttons, `aria-busy` |
| Toasts | Auto-dismiss, dismiss button, polite live region |
| Reduced motion | Global animation/transition durations reduced to 0.001 ms |

Never animate layout properties. Prefer `transform`, `opacity`, colour and shadow. Do not hide essential content behind animation.

---

## 8. Accessibility standards

- One `<main>` per page; header/nav/footer landmarks; skip link first in tab order.
- All form fields have a persistent label, not placeholder-only labelling.
- Errors are programmatically associated and announced; form-level errors use a live region.
- Icon-only buttons have `aria-label`; decorative icons use `aria-hidden`.
- Menus close on Escape and return focus to their trigger.
- Dialog focus is trapped and restored; background scroll is locked.
- Status is never conveyed by colour alone — labels and icons accompany it.
- Interactive targets aim for 44 × 44 px; icon buttons are 36–40 px with generous padding.
- Images have descriptive alt text from the manifest; decorative images use `alt=""`.
- Text meets WCAG AA at the sizes used; decorative olive-400 is never body copy.
- Motion respects `prefers-reduced-motion`.
- The demo map and demo auth state are explicitly labelled in visible text.

---

## 9. Imagery direction

- Real photography only; no illustrations standing in for food.
- Warm, natural light; shallow depth of field; honest, generous portions.
- Restaurant images show the room or counter, not generic stock interiors.
- Ratios: **4:5** for hero/editorial portraits, **3:2** for story images, **16:10** for restaurant cards, **16:9** for offers and category tiles.
- Crop with the subject off-centre; leave calm space for badges and gradients.
- Avoid text, logos, hands holding phones and obvious stock-photo styling.
- Every image is registered in `src/config/image-manifest.json` with key, folder, ratio, widths, intrinsic size, alt text and credit.
- Use the `Image` component; never hardcode a path.

Source and licence: Unsplash License. See the README and `scripts/build-assets.mjs`.

---

## 10. Writing style

- Warm, direct, specific. “Dinner is on its way.” not “Your order has been successfully dispatched.”
- Sentence case for headings and buttons. Uppercase only for eyebrows and micro-labels.
- Numbers and prices use tabular formatting through `src/lib/format.ts`.
- Demo copy says **demo**. Tracking says **demo map** and **not live GPS**. Auth says it is not secure authentication.
- Never invent urgency, scarcity or live status that the data cannot support.

---

## 11. Do and don't

**Do**

- Start with ivory/cream and one strong photograph.
- Use olive for structure and terracotta for one clear action per view.
- Keep the serif for headlines; use Inter for controls and dense data.
- Label demo boundaries in the interface.
- Test at 390, 768 and 1440 px with keyboard-only navigation.

**Don't**

- Put terracotta body copy on cream or cream text on terracotta at small sizes.
- Use olive-400 for captions, metadata or placeholder text.
- Add gradients, glassmorphism or neon accents outside the palette.
- Use more than one primary button in a single action group.
- Reuse a design-reference screenshot as an app image.
- Add placeholder pages for teammate-owned routes.

---

## 12. Implementation map

| Concern | File |
| --- | --- |
| Colour, type, spacing, shadows, motion tokens | `tailwind.config.ts` |
| Base element styles, shell, grain, focus, reduced motion | `src/styles/index.css` |
| Font faces | `src/styles/fonts.css` |
| Shared primitives | `src/components/ui/*` |
| Shared chrome | `src/components/shared/*` |
| Page compositions | `src/features/*/pages/*` |
| Visual references | `docs/design-references/` |
| Reference mockup styles | `docs/design-references/_src/mock.css` |
