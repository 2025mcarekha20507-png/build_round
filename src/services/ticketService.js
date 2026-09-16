import { AGENTS, createSeedTickets } from '../data/seedTickets'

const STORAGE_KEY = 'helpdesk-ticket-queue-v1'

const normalizeTicket = (ticket) => {
  const normalized = {
    id: ticket.id,
    customerName: ticket.customerName || 'Unknown customer',
    customerEmail: ticket.customerEmail || '',
    title: ticket.title || 'Untitled ticket',
    description: ticket.description || '',
    priority: ['urgent', 'high', 'normal'].includes(ticket.priority)
      ? ticket.priority
      : 'normal',
    status: ['open', 'in_progress', 'resolved', 'closed'].includes(ticket.status)
      ? ticket.status
      : 'open',
    assignee: AGENTS.includes(ticket.assignee) ? ticket.assignee : 'Unassigned',
    createdAt: ticket.createdAt || new Date().toISOString(),
    responseDueAt: ticket.responseDueAt || new Date().toISOString(),
  }

  return normalized
}

export function loadTickets() {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    const seeded = createSeedTickets().map(normalizeTicket)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new Error('Stored tickets are malformed.')
    }
    return parsed.map(normalizeTicket)
  } catch {
    const seeded = createSeedTickets().map(normalizeTicket)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
}

export function saveTickets(tickets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets))
}

export function resetDemoTickets() {
  const seeded = createSeedTickets().map(normalizeTicket)
  saveTickets(seeded)
  return seeded
}
