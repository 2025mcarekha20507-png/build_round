# Problem Interpretation

The helpdesk queue is constantly pressured by urgent operational issues, routine user requests, and shifting deadlines. Priya needs a queue that always identifies the most time-sensitive unresolved work first, not just the newest ticket or highest label value.

# Core Requirements

- The queue must prioritize unresolved tickets by urgency and response SLA.
- Overdue tickets must move ahead dynamically as time passes.
- Resolved and closed tickets must not reappear as active blocked work.
- Users need search, assignment, status changes, and clear summaries.
- The logic must be reusable and testable outside the UI.

# Queue Ordering Reasoning

The ordering rule is built around the actual support workflow. When time slips past the SLA, the work becomes the highest priority. After that, urgent tickets outrank routine requests, then earlier deadlines win. Finally, creation time creates a deterministic ordering when everything else is equal.

This is implemented as a pure comparator that evaluates each ticket independently against the current time and then sorts the full list without mutating the original array.

# Data Model

Each ticket stores a customer name, issue title, description, priority, status, assignee, createdAt, and responseDueAt. Priority values are limited to urgent and normal, while statuses are restricted to open, in_progress, resolved, and closed. This keeps the app consistent and avoids ambiguous queue logic.

# Architecture

The app is intentionally lightweight. React owns the stateful dashboard experience, while the ordering algorithm lives in a utility module so it can be unit tested separately from the view layer. Ticket persistence sits in a small service layer that reads and writes to localStorage.

# Important Design Decisions

- Overdue is derived on demand from current time and responseDueAt instead of storing a brittle stale flag.
- Queue sorting always happens after filtering and search so the visible list matches the exact active view.
- Pagination happens after sorting, matching the assessment requirement.
- Seed data aims to demonstrate edge cases such as overdue urgent work, overdue normal work, non-overdue urgent work, and resolved tickets that are no longer active.

# Edge Cases

- Resolved and closed tickets are excluded from overdue logic.
- Tickets with the same responseDueAt fall back to createdAt for stable ordering.
- If an assignee or status is invalid, the app normalizes it before saving.
- Search combines customer name, ticket ID, and title in a case-insensitive match.

# Testing Strategy

The queue logic is validated with Vitest tests that cover the critical requirements: overdue ordering, urgent versus normal handling, SLA deadlines, and resolved ticket exclusion. This keeps the business rule stable even as the UI evolves.

# Trade-offs

The app intentionally avoids an API-backed database or user authentication because the assessment requires a fast, lightweight build. localStorage is enough to mimic real persistence for this exercise while keeping setup straightforward.

# Future Improvements

- Add a backend and real multi-user persistence.
- Introduce comments or audit history for ticket lifecycle changes.
- Add stronger error states and offline sync.
- Expand filters and reporting to support larger service teams.
