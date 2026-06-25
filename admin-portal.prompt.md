---
name: admin-portal
description: "Agent prompt to implement/refactor the Admin Portal tab only. MUST NOT modify the Main Map page, GIS rendering, draw layers, overlays, markers, clustering, floating controls, presentation mode, map settings, or drawing logic. Keep the map system untouched and stable."
applyTo: "client/components/**"
scope: workspace
---

# Admin Portal — Implementation Prompt

Purpose
- Implement or refactor the Admin Portal tab only. The Admin Portal manages admissions intake, the feeder school registry, GIS update workflow, import settings, and import logs. It must not change how the Main Map page or any GIS rendering behaves.

Primary constraints (must obey)
- NEVER modify the Main Map page or any files/components that render or control the map. This includes (but is not limited to) `MapWrapper.tsx`, `DrawingCanvas.tsx`, `DrawingToolbar.tsx`, `MapLegend.tsx`, map UI components, floating controls, clustering logic, marker rendering, overlays, and presentation mode.
- All GIS visual changes must be performed by producing update payloads/APIs that the map system consumes — do not alter map rendering or client-side map code.
- School matching UI must run inside the import modal only. Do NOT create a separate matching dashboard.

Scope of allowed changes
- Admin Portal UI and logic only: components and files that compose the Admin Portal tab (for example: `AdmissionsIntegrationHub.tsx`, `SchoolImportDialog.tsx`, `SchoolFormDialog.tsx`, supporting hooks like `use-schools.ts`, `schoolImport.ts`, and admin-only UI primitives). Confirm exact filenames before bulk edits.

Admin Portal final structure (must implement exactly these tabs)
1. Data Integration
  - Purpose: Import admissions data.
  - Inside: API Integration, Google Sheets Integration, Excel/CSV/JSON Upload.
  - Main fields to retrieve and show in import preview: Student Name, Student ID, Last Attended School.
  - Workflow (UI flow inside the import modal): Import Data → Match School → Verify → Save Coordinates → Update GIS.
  - Business rules (matching):
    - New Students → Senior High School feeder
    - Transferee → College feeder school
  - Matching: perform automatic best-effort matches inside the import modal and expose a compact preview + manual override controls. Do not implement a large matching dashboard.

2. School Registry
  - Purpose: Maintain feeder school database.
  - Fields: School Name, Latitude, Longitude, Municipality, School Type, Verification Status.
  - Actions: Add School, Edit School, Remove Duplicate, Re-Geolocate School.
  - Manual Add: support AI-powered geolocation via Nominatim (with server-side proxy or rate limit safeguards). Fallback to manual lat/lng entry.

3. GIS Updates
  - Purpose: Apply imported updates to GIS.
  - Inside: Pending Updates list, Refresh Markers action (triggers map update via backend endpoint), Apply GIS Changes (compact confirmation UI).
  - Keep this compact and operational.

4. Import Logs
  - Purpose: Track imports and results.
  - Inside: Import Date, Source, Records Imported, Failed Rows, Status, Quick link to view failed-row details.

5. Settings
  - Purpose: Admin-only settings for import behavior.
  - Allowed settings only: import behavior, auto-match settings, duplicate handling, compact mode, themes.
  - Do NOT add general analytics or enterprise ERP settings here.

Remove from Admin Portal (explicitly):
- Giant dashboard widgets, floating analytics, duplicate operational cards, unnecessary charts, oversized headers, large analytics banners, duplicate matching panels, enterprise-style UI, excessive scrolling sections.

Layout & UX requirements
- Use a left sidebar of compact tabs; only one active workspace at a time.
- Compact layout, minimal scrolling, and maximum content density for operations.
- Clean spacing, consistent padding, responsive scaling for smaller screens.
- Avoid heavy visuals and large analytics banners — keep the portal lightweight and operational.

Integration & backend notes
- Do not change map APIs or map rendering code. If GIS updates are required, produce backend API payloads (or use existing integration endpoints) so the main map can refresh markers without code changes to the map itself.
- For Nominatim geolocation: prefer server-side requests (rate-limited) or use a cached lookup service. Include error handling and manual fallback lat/lng entry.

Acceptance criteria (what to deliver)
- UI implementing the five tabs above, matching the compact layout and UX rules.
- Import modal implements Import → Match (inside modal) → Verify → Save Coordinates → Submit update to GIS endpoint.
- `School Registry` supports add/edit/remove-duplicate/re-geolocate flows.
- `GIS Updates` is compact and triggers backend updates without altering map rendering code.
- `Import Logs` lists imports with status and failed-row detail view.
- `Settings` only exposes the allowed admin settings.
- Code changes only touch Admin Portal files. No changes to map files or map-related logic.
- TypeScript build passes for modified files and local smoke test for Main Map page shows no regressions in map interactions.

How to use this prompt (example invocations)
- "Refactor Admin Portal to left-sidebar tabs, implement Data Integration/import modal, and ensure school matching runs inside the modal only. Do not touch map files."
- "Implement `School Registry` CRUD with Nominatim geolocation and duplicate detection; leave map code untouched; write tests for the registry hooks."

Questions to clarify (prompt will ask if missing)
1. Confirm the exact component filenames you consider part of the Admin Portal (I suggest `AdmissionsIntegrationHub.tsx`, `SchoolImportDialog.tsx`, `SchoolFormDialog.tsx`, `use-schools.ts`, `schoolImport.ts`).
2. Do you permit server-side Nominatim requests or do you prefer a different geocoding provider / API key?
3. Should I add small unit/integration tests for the import/registry flows, or just implement UI + smoke checks?

Notes for the engineer/agent
- If you detect any change that must be applied to map rendering to achieve a feature, stop and record the change as a backend payload or API contract. Do not change map UI.
- Keep every Admin Portal screen compact and focused on the operational flow.

Examples of short commands a human can give this prompt
- "Create compact Admin Portal UI and implement import modal matching." → expects UI + import modal + matching implementation.
- "Add Nominatim geolocation to manual school add (server-side)." → expects registry change only.

End of prompt.
