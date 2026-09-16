# Helpdesk Queue Manager

## Problem

Priya and a small IT helpdesk team need to work the queue in the correct order under pressure. Some work is urgent and time-sensitive, while others are routine requests. The queue must always surface the most pressing unresolved work first, with overdue items jumping ahead automatically based on response deadlines.

## Solution

This app provides a generic helpdesk ticket dashboard that sorts active tickets using a reusable queue-priority algorithm. It includes live overdue detection, assignment tracking, search, status updates, pagination, and ticket creation with automatic SLA deadlines.

## Key Features

- Queue ordering based on overdue status, urgency, deadline, and creation time
- Dynamic overdue detection using current time and response due dates
- Ticket creation with automatic 2-hour and 24-hour SLA calculation
- Search across customer name, ticket ID, and issue title
- Filters for all tickets, overdue items, assigned-to-me, urgent, normal, and status
- Pagination after filtering and sorting
- Assignment and status updates persisted in localStorage
- Dashboard statistics for open tickets, overdue items, urgent work, and assigned tasks

## Queue Ordering Rule

The queue ordering is intentionally not a simple priority-only sort:

1. Unresolved tickets come before resolved or closed tickets.
2. Overdue unresolved tickets are listed first.
3. Among overdue unresolved tickets, the oldest breach appears first.
4. Remaining unresolved urgent tickets are prioritized next.
5. Within urgent tickets, the earliest response deadline wins.
6. Remaining unresolved normal tickets come after urgent work.
7. Within normal tickets, the earliest response deadline wins.
8. If deadlines are identical, createdAt acts as the deterministic final tie-breaker.

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
- src/utils/queue.js — reusable queue ordering and overdue logic
- src/utils/queue.test.js — queue logic verification tests
- README.md — project overview and setup
- REASONING.md — engineering rationale and design choices

## Setup

```bash
npm install
npm run dev
npm run build
```

## How to Use

- Create tickets from the Create ticket control in the top-right.
- Filter by all, overdue, assigned-to-me, urgent, normal, or status.
- Search for customer names, ticket IDs, or issue titles.
- Assign tickets to Priya or Rahul from the queue or detail panel.
- Change status to Open, In Progress, Resolved, or Closed as work moves through the desk.
- Use the pagination controls after filtering to move through large queues.

## Testing

Queue logic is tested with Vitest in src/utils/queue.test.js. The suite checks overdue ordering, urgency priority, resolved ticket handling, and SLA calculations.

## Design Decisions

- Queue logic is kept in a reusable utility so it can be tested independent of React.
- Overdue is calculated dynamically from current time and responseDueAt rather than stored as a stale flag.
- Sorting is always done after filtering to keep the queue consistent with the active view.
- localStorage is used for persistence because no backend is included in this lightweight assessment build.

## Limitations / Future Improvements

- This is a client-side app with no multi-user backend or real authentication.
- Ticket lifecycle events are local to the browser and not synchronized across devices.
- The current implementation keeps a lightweight single-page dashboard rather than adding a separate API layer.
