# Repository Guidelines

## Project Structure & Module Organization

This repository contains a React + TypeScript + Vite progressive web app for tracking club deals. Application code is under `src/`:

- `App.tsx` and `main.tsx` define routing and application startup.
- `db/` contains the Dexie schema and CRUD repositories for IndexedDB.
- `hooks/` contains deal, deadline, and extension state hooks.
- `components/` contains feature views and reusable `components/ui/` controls.
- `exporters/` contains CSV and RFC 5545 calendar exporters.
- `utils/` contains date, status, and pure business calculations.

Static assets and PWA icons belong in `public/`. Build and styling configuration is kept in `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, and `postcss.config.js`.

## Build, Test, and Development Commands

Run `npm install` after cloning or changing dependencies. Use:

- `npm run dev` to start the Vite development server.
- `npm run build` to run the TypeScript project build and create the production bundle.
- `npm run preview` to serve the production bundle locally.
- `npm run lint` to run ESLint across the repository.

## Coding Style & Naming Conventions

Follow the existing TypeScript/React style and keep edits narrowly scoped. Use two-space indentation, PascalCase for React components, camelCase for functions and variables, and descriptive French domain names where they match the existing model (`echeances`, `prolongations`). Keep business rules in pure utilities when possible, and preserve existing Tailwind and UI-component conventions.

## Testing Guidelines

No test runner, test files, or coverage threshold is currently configured. Before submitting a change, run `npm run lint` and `npm run build`. New business logic should be isolated in `src/utils/` and accompanied by focused unit tests when a test framework is introduced; name them after the module, for example `calculs.test.ts`.

## Commit & Pull Request Guidelines

No repository Git history is available in this checkout to establish a project-specific commit format. Use short, imperative messages such as `Fix deadline status calculation`. Pull requests should explain the user-visible change, link the related issue, list validation commands, and include screenshots or a short recording for UI/PWA changes. Mention any IndexedDB migration or export-format impact explicitly.

## Security & Configuration Tips

Do not commit credentials or private API configuration. Treat IndexedDB data as client-local state, validate imported/exported data at boundaries, and verify production PWA assets in `public/` before release.
