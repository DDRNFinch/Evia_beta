# Evia

**Evia — Apprentice Vocational Assistant** is a clean, animated apprenticeship companion designed to help learners understand their course, organise evidence and monitor progress.

[Open the current Evia app](https://ava-apprentice-assistant.dfinch1984.chatgpt.site)

## What Evia currently does

- Introduces herself through a short first-use onboarding journey
- Opens the main options when the learner taps Evia
- Displays four progress arches for TOC, KSB, OTJ and EPA
- Provides areas for My Course, Self Study, My Portfolio and Settings
- Lets tutors and learners add a course in three ways:
  - Import a structured Evia course file
  - Paste an existing course layout
  - Paste an unstructured KSB list and let Evia organise it
- Preserves tutor-written unit titles and KSB mappings
- Creates evidence-focused units from Knowledge, Skills and Behaviours
- Shows full KSB wording and suitable evidence options inside each unit
- Includes animated facial expressions and smooth in-app transitions

## Project status

Evia is an evolving prototype. Learner onboarding and course information are currently stored in the browser on the learner's device. A production version will need persistent accounts, secure data storage and tutor administration services.

## Run locally

### Requirements

- Node.js 22.13 or newer
- npm

### Start the app

```bash
npm ci
npm run dev
```

Then open the local address shown in the terminal.

### Build

```bash
npm run build
```

## Main source files

- `app/page.tsx` — Evia interface, navigation, onboarding and course-building logic
- `app/globals.css` — visual design, responsive layout, animations and transitions
- `app/layout.tsx` — application metadata
- `public/` — static assets
- `tests/` — rendered application checks

## Technology

- React
- Next.js
- Vinext
- TypeScript
- Cloudflare-compatible deployment output

## Repository purpose

This repository contains the current Evia source code. The live prototype is deployed separately; GitHub is being used to store and manage the project as it develops.
