export const PRIORITY_RANK = {
  urgent: 0,
  high: 1,
  normal: 2,
}

export const PRIORITY_SEQUENCE = ['normal', 'high', 'urgent']

export const UNRESOLVED_STATUSES = new Set(['open', 'in_progress'])

export function isTicketUnresolved(ticket) {
  return ticket && UNRESOLVED_STATUSES.has(ticket.status)
}

export function getSlaHours(priority) {
  if (priority === 'high') {
    return 8
  }

  if (priority === 'urgent') {
    return 2
  }

  return 24
}

export function buildResponseDueAt(createdAt, priority) {
  const createdTime = new Date(createdAt).getTime()
  const slaHours = getSlaHours(priority)

  return new Date(createdTime + slaHours * 60 * 60 * 1000).toISOString()
}

export function isTicketOverdue(ticket, now = new Date()) {
  if (!ticket || !isTicketUnresolved(ticket)) {
    return false
  }

  const dueAt = new Date(ticket.responseDueAt).getTime()
  const currentTime = new Date(now).getTime()

  return currentTime > dueAt
}

export function getOverdueDurationMs(ticket, now = new Date()) {
  if (!isTicketOverdue(ticket, now)) {
    return 0
  }

  return new Date(now).getTime() - new Date(ticket.responseDueAt).getTime()
}

export function compareQueuePriority(a, b, now = new Date()) {
  const aResolved = !isTicketUnresolved(a)
  const bResolved = !isTicketUnresolved(b)

  if (aResolved !== bResolved) {
    return aResolved ? 1 : -1
  }

  const aOverdue = isTicketOverdue(a, now)
  const bOverdue = isTicketOverdue(b, now)

  if (aOverdue !== bOverdue) {
    return aOverdue ? -1 : 1
  }

  if (aOverdue && bOverdue) {
    const overdueDelta = getOverdueDurationMs(b, now) - getOverdueDurationMs(a, now)
    if (overdueDelta !== 0) {
      return overdueDelta
    }
  }

  if (a.priority !== b.priority) {
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  }

  const aDue = new Date(a.responseDueAt).getTime()
  const bDue = new Date(b.responseDueAt).getTime()
  if (aDue !== bDue) {
    return aDue - bDue
  }

  const aCreated = new Date(a.createdAt).getTime()
  const bCreated = new Date(b.createdAt).getTime()
  if (aCreated !== bCreated) {
    return aCreated - bCreated
  }

  return String(a.id).localeCompare(String(b.id))
}

export function escalatePriority(priority) {
  if (priority === 'normal') {
    return 'high'
  }

  if (priority === 'high') {
    return 'urgent'
  }

  return 'urgent'
}

export function escalateBreachedTickets(tickets, now = new Date()) {
  let didEscalate = false

  const nextTickets = tickets.map((ticket) => {
    if (!isTicketUnresolved(ticket) || !isTicketOverdue(ticket, now)) {
      return ticket
    }

    const nextPriority = escalatePriority(ticket.priority)

    if (nextPriority === ticket.priority) {
      return ticket
    }

    didEscalate = true

    return {
      ...ticket,
      priority: nextPriority,
      responseDueAt: buildResponseDueAt(ticket.createdAt, nextPriority),
    }
  })

  return didEscalate ? nextTickets : tickets
}

export function sortTicketsByQueuePriority(tickets, now = new Date()) {
  return [...tickets].sort((a, b) => compareQueuePriority(a, b, now))
}
