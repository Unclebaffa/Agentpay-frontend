# TODO - Admin pause/unpause confirmation hardening

- [x] Update `src/app/admin/page.tsx`:

  - [ ] Add typed ConfirmDialog guarded pause/unpause with explicit state-naming messages.
  - [ ] Prevent accidental double submission: disable toggle while request in flight.
  - [ ] Reflect pending status in UI (StatusDot/Badge).
  - [ ] Surface success/failure via toast; keep existing `role="alert"` error path.
  - [ ] Re-fetch status after action; handle concurrent external changes by reconciling with latest fetched `paused` state.
  - [ ] Ensure accessible keyboard operability relies on ConfirmDialog.

- [ ] Add comprehensive tests `src/app/admin/page.test.tsx`:
  - [ ] Cancel makes no call
  - [ ] Confirm posts correct endpoint
  - [ ] Button disables mid-flight and prevents rapid double-click
  - [ ] Status refreshes after action
  - [ ] Edge cases: toggle while already paused, request failure, re-fetch after failure
  - [ ] Ensure error path uses role="alert"

- [ ] Update `README.md` with documentation noting kill-switch confirmation requirement.


- [ ] Create git branch `blackboxai/security/admin-28-pause-confirmation` and commit.

- [ ] Push branch to GitHub.

- [ ] Run:
  - [ ] `npm test`
  - [ ] `npm run lint`
  - [ ] `npm run typecheck`
  - [ ] `npm run build`
  - [ ] Ensure coverage >= 95% for changed page.

