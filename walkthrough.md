# Student Mapping Registry Walkthrough

## Completed Flow

1. School data is stored in `school_registry` and exposed through `/api/schoolRegistry`.
2. Admissions/API/Sheets/file imports are normalized in the Admissions Integration Hub.
3. Imported student rows sync into the GIS pipeline through `/api/students/sync`.
4. School names are matched through the database-backed matcher and alias table.
5. Schools with missing coordinates, duplicates, or inactive review states appear in the Admin Mapping Queue.
6. Verified schools and processed students drive the Admin Registry and the main GIS map.

## Admin Screens

- `AdminSchoolRegistry.tsx` renders the school registry table, search, selection, bulk delete, edit, geolocate, duplicate cleanup, and add-school actions.
- `SchoolMatchingQueue.tsx` renders schools needing review, missing coordinates, or duplicate cleanup.
- `AdminPortalWorkspace.tsx` wires the Registry and Mapping Queue tabs into the existing Admin Portal.
- `AdmissionsIntegrationHub.tsx` previews external admissions rows and applies clean feeder-school updates to the registry and GIS student sync.

## Important API Paths

- `GET /api/schoolRegistry`
- `POST /api/schoolRegistry`
- `PUT /api/schoolRegistry/:id`
- `DELETE /api/schoolRegistry/:id`
- `POST /api/schoolRegistry/import`
- `POST /api/schoolRegistry/batch-delete`
- `GET /api/mapping/queue`
- `POST /api/mapping/verify`
- `POST /api/students/sync`
- `GET /api/students/processed`

## Verification

Run from `C:\Users\PC\Documents\GitHub\Studentmapping\Studentmapping`:

```powershell
npm run check
npm run build
npm run dev
```

Expected result:

- TypeScript completes without errors.
- Production build completes without errors.
- `npm run dev` starts the Express/Vite development server using `server/index.ts`.

## UI Smoke Test

1. Open the app and switch to Admin.
2. Open School Registry and confirm registry rows load from `/api/schoolRegistry`.
3. Search for a school, select rows, and confirm bulk delete targets `/api/schoolRegistry/batch-delete`.
4. Open Mapping Queue and confirm missing-coordinate, duplicate, or inactive schools appear.
5. Use Pin, Verify, and Merge actions from the queue.
6. Open Settings > API Data Settings and import a small admissions file.
7. Confirm preview rows show Last School, Municipality, and Status correctly.
8. Click Apply to GIS and confirm processed students, registry rows, and map pins refresh.
