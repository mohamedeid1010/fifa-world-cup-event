# Live Assistance Dispatch Sync Plan

## Overview

Replace the current localStorage-only assistance flow with a shared Node/Express API backed by SQL Server, while reusing the existing portal and control-board UI patterns. The recommended implementation keeps ticket and auth data as client-side snapshots for now, but moves assistance request creation, queueing, status updates, and live responder dashboards to the server so every user and device sees the same request state.

## Steps

1. Phase 1: Backend foundation. Add an Express service alongside the Vite app with SQL Server connectivity, environment-based configuration, and a clean separation between database access, request services, and HTTP routes. This phase blocks all API-backed frontend work.
2. Phase 1: SQL Server schema. Create an `assistance_requests` table that stores the current portal request snapshot fields already used by the UI: request id or code, owner name, email, phone, ticket id, section, row, seat, unit type, title or incident type, risk, notes or details, source, workflow status, human-readable status, and lifecycle timestamps. Add an `assistance_request_events` table for status, risk, and queue history so police and medical actions are traceable.
3. Phase 1: Live update mechanism. Implement Server-Sent Events in the Express service so new portal requests and control-side status changes are pushed immediately to connected dashboards and user portals without relying on browser localStorage events. Writes still happen through normal HTTP endpoints. SSE is only for broadcasting updates.
4. Phase 1: API contract. Expose endpoints for creating a new assistance request from the user portal, listing current-user requests by owner email, listing dispatches by unit type and queue state, updating risk, accepting a request into the queue, changing workflow status to `PROCESSING` or `DONE`, creating manual dispatches from control, and fetching control-center summary counters. Keep the response shape close to the current frontend request object to minimize UI rewrite.
5. Phase 2: Shared frontend data layer. Add a small API client module in the frontend that wraps fetch calls and SSE subscription logic. This becomes the single source for assistance-request data in the browser, replacing direct reads and writes to localStorage for services while leaving existing ticket and auth local storage untouched.
6. Phase 2: User portal submission flow. In `src/js/main.js`, replace the current emergency button handler that prepends to `state.serviceRequests` with an async `POST` to the new API. Preserve the existing success UX, but enrich the request form so the user can optionally add a short note, since the responder dashboard needs richer case context.
7. Phase 2: User portal request history. In `src/js/main.js`, update `getCurrentUserServiceRequests`, `saveServiceRequests` usage, and `renderServiceRequests` so the user's service log is loaded from the API by `ownerEmail` and refreshed live through SSE. Keep the existing card markup pattern, but show backend status changes such as queued, processing, and done.
8. Phase 3: Police and ambulance intake boards. In `src/js/control-board.js`, replace localStorage-backed `getBoardData` and `updateServiceRequest` behavior with API-backed loaders and mutation calls, but preserve the current board structure: intake, active queue, and archive. Reuse `enrichServiceRequest`, `isRelevantUnit`, risk classification, and status rendering so the UI behavior stays familiar.
9. Phase 3: Control actions. Keep the current police and medical wrappers in `src/js/police.js` and `src/js/dispatches.js` mostly unchanged, but route their queue, risk, status, archive, and manual-dispatch actions through the API. The request cards should explicitly surface all required responder data: user name, phone, ticket id, seat location, request time, risk, and user note.
10. Phase 3: Control center summary. In `src/js/control-center.js`, replace `renderPortalSync` localStorage counting with API summary endpoints plus SSE refresh so Police Alerts and Medical Alerts reflect the shared SQL Server state across users and devices.
11. Phase 4: Frontend markup and styling adjustments. Update `src/pages/user-portal.html` and the responder page templates only where needed to support the richer request payload and clearer responder-facing metadata. Update `src/style/ticket.css`, `src/style/police.css`, and any matching responder stylesheet so request cards clearly separate identity, seat location, timestamps, and workflow state in a more professional layout.
12. Phase 4: Dev workflow and documentation. Extend `package.json` scripts so the Vite client and Express API can run together in development, add environment documentation for SQL Server connection settings, and document the request lifecycle and setup steps in `README.md`.
13. Phase 5: Verification. Validate the full flow using at least two browser sessions or devices: user creates police request, police board receives it live, operator accepts it into queue, changes status to `PROCESSING` and `DONE`, user portal reflects each transition, then repeat for ambulance. Also verify control-center counters, manual dispatch creation, and that the existing frontend still passes `npm run build`.

## Relevant Files

- `src/js/main.js`: current Request Assistance creation flow, current-user filtering, and service-request rendering to reuse and replace.
- `src/pages/user-portal.html`: current Matchday Services and Service Requests sections. Likely needs optional note input and status display refinements.
- `src/js/control-board.js`: main responder board abstraction with intake, active, and archive grouping, risk and status UI, and dispatch actions.
- `src/js/police.js`: police board configuration for status labels and defaults.
- `src/js/dispatches.js`: ambulance board configuration for status labels and defaults.
- `src/js/control-center.js`: summary counts and control access flow that must stop reading localStorage service data.
- `src/pages/control-center.html`: counter labels and operational framing for shared alerts.
- `src/style/police.css`: responder visual layer for richer request metadata and clearer state display.
- `src/style/ticket.css`: user-side request history cards.
- `package.json`: scripts and dependencies for running Vite and Express together.
- `README.md`: setup and environment documentation.
- New backend area under the project root: Express server entrypoint, SQL Server connection module, route handlers, SSE broadcaster, and SQL migration scripts.

## Verification

1. Start SQL Server, then run the client and Express API together in development and confirm the API can connect with the configured environment variables.
2. Submit a police request from the portal and confirm a new `assistance_requests` row and an `assistance_request_events` row are written in SQL Server.
3. Keep the police page open in another browser session and confirm the intake queue updates live without refresh.
4. Change the request from pending to queued to processing to done and confirm the user portal service log updates live with the new status text.
5. Submit an ambulance request and confirm it appears only on the ambulance board, not the police board.
6. Create a manual dispatch from control and confirm it persists in SQL Server and shows correctly in the matching queue.
7. Confirm control-center counters match the SQL-backed queue totals.
8. Run `npm run build` to ensure the Vite frontend still builds after the integration.

## Decisions

- Use Node/Express for the API layer.
- Use SQL Server as the shared persistence layer.
- Use Server-Sent Events for live dashboard and portal updates.
- Keep the existing access-code flow and ticket or auth storage as-is for this phase. The server stores request snapshots rather than migrating the whole account and ticket system.
- Included scope: user-created assistance requests, responder intake and queue handling, user-visible status tracking, and shared control-center counters.
- Excluded scope: full backend authentication, ticket booking migration to SQL Server, and unrelated UI redesign outside the request flow.

## Further Considerations

1. If you later need strict cross-device identity rather than email-based request lookup, the next phase should centralize sign-in and ticket ownership on the server instead of relying on client-side user state.
2. If operations need audit quality beyond basic event history, add responder identity fields to each status-change event so every action is attributed to a control operator.