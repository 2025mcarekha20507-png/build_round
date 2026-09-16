# Helpdesk Queue Manager

## Problem

Priya and a small IT helpdesk team need to work the queue in the correct order under pressure. Some work is urgent and time-sensitive, while others are routine requests. The queue must always surface the most pressing unresolved work first, with overdue items jumping ahead automatically based on response deadlines.

## Solution

This app provides a generic helpdesk ticket dashboard that sorts active tickets using a reusable queue-priority algorithm. It includes live overdue detection, assignment tracking, search, status updates, pagination, and ticket creation with automatic SLA deadlines.

## Key Features

- Queue ordering based on overdue status, urgency, deadline, and creation time
- Dynamic overdue detection using current time and response due dates
- Ticket creation with automatic SLA calculation for normal, high, and urgent work
- Automatic one-level escalation for unresolved tickets that breach their response deadline
- Search across customer name, ticket ID, issue title, and assignee
- Filters for all tickets, overdue items, assigned-to-me, urgent, high, normal, and status
- Pagination after filtering and sorting
- Assignment and status updates persisted in localStorage
- Dashboard statistics for open tickets, overdue items, urgent work, and assigned tasks

## Queue Ordering Rule

The queue ordering is intentionally not a simple priority-only sort:

1. Unresolved tickets come before resolved or closed tickets.
2. Overdue unresolved tickets are listed first.
3. Among overdue unresolved tickets, the oldest breach appears first.
4. Remaining unresolved urgent tickets are prioritized next.
5. Remaining unresolved high tickets come after urgent work.
6. Remaining unresolved normal tickets come after high work.
7. Within the same priority, the earliest response deadline wins.
8. If deadlines are identical, createdAt acts as the deterministic final tie-breaker.

An automated check runs with the app timer. A breached unresolved ticket moves one level per run: normal to high, high to urgent, and urgent remains urgent. The response deadline is recalculated after escalation so a ticket cannot escalate repeatedly from the same breach during one run.

## Tech Stack

- React
- Vite
- JavaScript
- CSS
- localStorage persistence
- Vitest for queue logic checks

## Project Structure

- src/App.jsx — dashboard UI and interaction logic
- src/data/seedTickets.js — seed ticket data and shared constants
- src/services/ticketService.js — localStorage load/save logic
- src/utils/queue.js — reusable queue ordering, SLA, and escalation logic
- src/utils/queue.test.js — queue logic verification tests
- README.md — project overview, setup, running, and debugging
- REASONING.md — engineering rationale and design choices

## Project Setup

```bash
npm install
```

The project uses Node.js, npm, React, and Vite. Dependencies are declared in `package.json` and locked in `package-lock.json`.

## Running Locally

Start the development server:

```bash
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`. To expose the server in a container or remote workspace, use:

```bash
npm run dev -- --host 0.0.0.0
```

Create a production bundle and preview it locally with:

```bash
npm run build
npm run preview
```

## How to Use

- Create tickets from the Create ticket control in the top-right.
- Filter by all, overdue, assigned-to-me, urgent, normal, or status.
- Search for customer names, ticket IDs, issue titles, or assignee names.
- Assign tickets to Priya or Rahul from the queue or detail panel.
- Change status to Open, In Progress, Resolved, or Closed as work moves through the desk.
- Use the pagination controls after filtering to move through large queues.

## Testing

Queue logic is tested with Vitest in `src/utils/queue.test.js`. Run the full check with:

```bash
npm test
```

The suite checks overdue ordering, priority handling, resolved ticket exclusion, SLA calculations, and one-level breach escalation. Run linting and the production build with:

```bash
npm run lint
npm run build
```

## Debugging

- If the queue looks stale, refresh the page. Ticket data is stored under the browser's localStorage key `helpdesk-ticket-queue-v1`.
- Use **Reset demo data** in the dashboard to restore the seeded tickets and clear local changes.
- To inspect ordering behavior without the UI, edit or extend `src/utils/queue.test.js` and run `npm test`.
- Overdue state is calculated from `responseDueAt` and the current time; it is not stored as a boolean.
- The automatic escalation check runs every 30 seconds while the app is open. A reload also loads the persisted priority values.
- If the UI fails to start after dependency changes, remove `node_modules`, run `npm install`, and retry `npm run dev`.

## Design Decisions

- Queue logic is kept in a reusable utility so it can be tested independent of React.
- Overdue is calculated dynamically from current time and responseDueAt rather than stored as a stale flag.
- The full queue is sorted before search and filters so every view preserves the same global priority order.
- Breach escalation is pure and testable, and raises a ticket by at most one priority level per run.
- localStorage is used for persistence because no backend is included in this lightweight assessment build.

## Limitations / Future Improvements

- This is a client-side app with no multi-user backend or real authentication.
- Ticket lifecycle events are local to the browser and not synchronized across devices.
- The current implementation keeps a lightweight single-page dashboard rather than adding a separate API layer.
