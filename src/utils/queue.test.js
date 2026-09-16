import { describe, expect, it } from 'vitest'

import {
  buildResponseDueAt,
  escalateBreachedTickets,
  isTicketOverdue,
  sortTicketsByQueuePriority,
} from './queue'

describe('queue ordering', () => {
  it('puts overdue tickets ahead of non-overdue urgent tickets', () => {
    const now = new Date('2025-01-01T12:00:00Z')
    const tickets = [
      {
        id: 'A',
        customerName: 'Alpha',
        title: 'late urgent',
        priority: 'urgent',
        status: 'open',
        createdAt: '2025-01-01T06:00:00Z',
        responseDueAt: '2025-01-01T08:00:00Z',
      },
      {
        id: 'B',
        customerName: 'Bravo',
        title: 'non-overdue urgent',
        priority: 'urgent',
        status: 'open',
        createdAt: '2025-01-01T10:00:00Z',
        responseDueAt: '2025-01-01T12:30:00Z',
      },
    ]

    expect(sortTicketsByQueuePriority(tickets, now)[0].id).toBe('A')
  })

  it('sorts overdue tickets by how overdue they are', () => {
    const now = new Date('2025-01-01T10:00:00Z')
    const tickets = [
      {
        id: 'A',
        priority: 'normal',
        status: 'open',
        createdAt: '2025-01-01T00:00:00Z',
        responseDueAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'B',
        priority: 'normal',
        status: 'open',
        createdAt: '2025-01-01T00:00:00Z',
        responseDueAt: '2025-01-01T01:00:00Z',
      },
    ]

    expect(sortTicketsByQueuePriority(tickets, now)[0].id).toBe('A')
  })

  it('prioritizes urgent tickets over normal tickets', () => {
    const now = new Date('2025-01-01T08:00:00Z')
    const tickets = [
      {
        id: 'A',
        priority: 'normal',
        status: 'open',
        createdAt: '2025-01-01T00:00:00Z',
        responseDueAt: '2025-01-02T00:00:00Z',
      },
      {
        id: 'B',
        priority: 'urgent',
        status: 'open',
        createdAt: '2025-01-01T02:00:00Z',
        responseDueAt: '2025-01-01T04:00:00Z',
      },
    ]

    expect(sortTicketsByQueuePriority(tickets, now)[0].id).toBe('B')
  })

  it('places resolved tickets behind active tickets even if overdue', () => {
    const now = new Date('2025-01-02T12:00:00Z')
    const tickets = [
      {
        id: 'A',
        priority: 'urgent',
        status: 'resolved',
        createdAt: '2025-01-01T00:00:00Z',
        responseDueAt: '2025-01-01T02:00:00Z',
      },
      {
        id: 'B',
        priority: 'urgent',
        status: 'open',
        createdAt: '2025-01-01T08:00:00Z',
        responseDueAt: '2025-01-01T10:00:00Z',
      },
    ]

    expect(sortTicketsByQueuePriority(tickets, now)[0].id).toBe('B')
  })

  it('calculates future due times based on priority SLA', () => {
    const createdAt = '2025-01-01T08:00:00Z'

    expect(buildResponseDueAt(createdAt, 'urgent')).toBe(
      new Date('2025-01-01T10:00:00Z').toISOString(),
    )
    expect(buildResponseDueAt(createdAt, 'normal')).toBe(
      new Date('2025-01-02T08:00:00Z').toISOString(),
    )
  })

  it('treats overdue by comparing now against responseDueAt', () => {
    const now = new Date('2025-01-01T12:00:00Z')
    const ticket = {
      status: 'open',
      responseDueAt: '2025-01-01T10:00:00Z',
    }

    expect(isTicketOverdue(ticket, now)).toBe(true)
  })

  it('escalates breached tickets by one priority level per run', () => {
    const now = new Date('2025-01-01T12:00:00Z')
    const tickets = [
      {
        id: 'N1',
        priority: 'normal',
        status: 'open',
        createdAt: '2025-01-01T00:00:00Z',
        responseDueAt: '2025-01-01T10:00:00Z',
      },
      {
        id: 'H1',
        priority: 'high',
        status: 'open',
        createdAt: '2025-01-01T00:00:00Z',
        responseDueAt: '2025-01-01T10:00:00Z',
      },
      {
        id: 'U1',
        priority: 'urgent',
        status: 'open',
        createdAt: '2025-01-01T00:00:00Z',
        responseDueAt: '2025-01-01T10:00:00Z',
      },
    ]

    const nextTickets = escalateBreachedTickets(tickets, now)

    expect(nextTickets.find((ticket) => ticket.id === 'N1').priority).toBe('high')
    expect(nextTickets.find((ticket) => ticket.id === 'H1').priority).toBe('urgent')
    expect(nextTickets.find((ticket) => ticket.id === 'U1').priority).toBe('urgent')
  })
})
