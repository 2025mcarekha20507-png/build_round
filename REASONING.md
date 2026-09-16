# Problem Interpretation

The helpdesk queue is constantly pressured by urgent operational issues, routine user requests, and shifting deadlines. Priya needs a queue that always identifies the most time-sensitive unresolved work first, not just the newest ticket or highest label value.

# Core Requirements

- The queue must prioritize unresolved tickets by urgency and response SLA.
- Overdue tickets must move ahead dynamically as time passes.
- A breached unresolved ticket must escalate by one priority level per automated run.
- Resolved and closed tickets must not reappear as active blocked work.
- Users need search, assignment, status changes, and clear summaries.
- The logic must be reusable and testable outside the UI.

# Queue Ordering Reasoning

The ordering rule is built around the actual support workflow. When time slips past the SLA, the work becomes the highest priority. After that, urgent tickets outrank routine requests, then earlier deadlines win. Finally, creation time creates a deterministic ordering when everything else is equal.

This is implemented as a pure comparator that evaluates each ticket independently against the current time and then sorts the full list without mutating the original array. The comparator first separates unresolved work from resolved or closed work, then places overdue tickets first, orders overdue work by how long it has breached its deadline, and applies priority, deadline, creation time, and ticket ID as deterministic tie-breakers.

# Data Model

Each ticket stores a customer name, issue title, description, priority, status, assignee, createdAt, and responseDueAt. Priority values are normal, high, and urgent, while statuses are restricted to open, in_progress, resolved, and closed. This keeps the app consistent and gives the breach automation an explicit one-step escalation path.

# Architecture

The app is intentionally lightweight. React owns the stateful dashboard experience, while the ordering algorithm lives in a utility module so it can be unit tested separately from the view layer. Ticket persistence sits in a small service layer that reads and writes to localStorage.

# Important Design Decisions

- Overdue is derived on demand from current time and responseDueAt instead of storing a brittle stale flag.
- Queue sorting happens before the active search and filters so every view preserves the same global priority order.
- Pagination happens after sorting, matching the assessment requirement.
- Seed data aims to demonstrate edge cases such as overdue urgent work, overdue normal work, non-overdue urgent work, and resolved tickets that are no longer active.
- Overdue escalation is run by the app timer and updates only unresolved breached tickets. Normal becomes high, high becomes urgent, and urgent remains urgent. Recalculating the response deadline after escalation prevents the same ticket from escalating repeatedly during every timer tick.

# Edge Cases

- Resolved and closed tickets are excluded from overdue logic.
- An urgent ticket can never escalate beyond urgent.
- Each escalation run changes a ticket by at most one priority level.
- Tickets with the same responseDueAt fall back to createdAt for stable ordering.
- If an assignee or status is invalid, the app normalizes it before saving.
- Search combines customer name, ticket ID, title, and assignee in a case-insensitive match.

# Testing Strategy

The queue logic is validated with Vitest tests that cover the critical requirements: overdue ordering, priority handling, SLA deadlines, resolved ticket exclusion, and one-level breach escalation. This keeps the business rule stable even as the UI evolves.

# Trade-offs

The app intentionally avoids an API-backed database or user authentication because the assessment requires a fast, lightweight build. localStorage is enough to mimic real persistence for this exercise while keeping setup straightforward. The trade-off is that persistence is browser-local rather than shared across agents.

# Future Improvements

- Add a backend and real multi-user persistence.
- Introduce comments or audit history for ticket lifecycle changes.
- Record an escalation history so agents can see why and when priority changed.
- Add stronger error states and offline sync.
- Expand filters and reporting to support larger service teams.
