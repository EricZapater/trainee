# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-07-09

### Hotfix

#### Backend
- **Fixed database scanning in `ToggleSubmissionGestionat`**: Fixed an issue where marking a week as managed resulted in a console error and returned a `500 Internal Server Error` even though the database successfully updated the week's state.
  - *Cause*: The PostgreSQL query was returning `ws.week_start` (of type `DATE`), which failed to scan into a Go `string` variable.
  - *Resolution*: Wrapped `ws.week_start` in `TO_CHAR(ws.week_start, 'YYYY-MM-DD')` inside the `RETURNING` statement of the `UPDATE` query to match other similar queries in the repository.

#### Frontend
- **Fixed timezone shift on week dates (Sunday instead of Monday)**: Resolved a timezone bug where users located in negative timezone offsets (e.g., South America) saw the week starting on Sunday instead of Monday, shifting the entire calendar.
  - *Cause*: JavaScript parses plain date strings (`YYYY-MM-DD`) as UTC midnight. When converted to the user's local timezone (e.g., UTC-3), the date shifted back by a few hours into the Sunday evening.
  - *Resolution*: 
    - Appended `"T00:00:00"` to date strings before parsing them with `new Date()`, forcing the browser to parse the date in the local timezone.
    - Updated `getThisMonday()` to format the default Monday date using local date components (`getFullYear()`, `getMonth()`, `getDate()`) instead of `.toISOString().split('T')[0]`, which could also shift the date depending on the time of day.
    - Fixed related timezone shift issues in `CompeticioDetailView.vue`, `TestDetailView.vue`, `TestsManagerView.vue`, and the historical date filter in `CompeticionsHistoricView.vue`.
- **Hide inactive activities in the calendar and templates**: Prevented inactive activities from appearing or being populated when loading submissions or applying templates.
  - *Resolution*: 
    - Filtered out inactive activities when loading the athlete's submission in `loadSubmission()`.
    - Filtered out inactive activities when applying templates in `applyTemplate()`.
- **Control of inactive athletes in planning and tests**: Filtered and restricted inactive athletes' visibility in planning and tests.
  - *Resolution*:
    - Added an active/inactive/all athlete filter dropdown in `PlanningManagerView.vue`.
    - Restricted the test creation athlete list, pending tests, and test reminders in `TestsManagerView.vue` to only show active athletes (filtering both frontend load and backend SQL queries).

