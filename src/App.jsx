import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AGENTS, PRIORITY_VALUES, TICKET_STATUSES } from './data/seedTickets'
import { loadTickets, resetDemoTickets, saveTickets } from './services/ticketService'
import {
  buildResponseDueAt,
  escalateBreachedTickets,
  isTicketOverdue,
  sortTicketsByQueuePriority,
} from './utils/queue'

const PAGE_SIZE = 10
const defaultForm = {
  customerName: '',
  customerEmail: '',
  title: '',
  description: '',
  priority: 'urgent',
  assignee: 'Unassigned',
  status: 'open',
}

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'assigned_to_me', label: 'Assigned to Me' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'normal', label: 'Normal' },
]

const STATUS_FILTERS = [
  { id: 'all', label: 'All status' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
]

const formatDateTime = (iso) =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))

const formatRelativeTime = (ms) => {
  const totalMinutes = Math.max(0, Math.round(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

const getDueSummary = (ticket, now = new Date()) => {
  if (!ticket || !ticket.responseDueAt) {
    return 'No deadline'
  }

  const dueAt = new Date(ticket.responseDueAt).getTime()
  const current = new Date(now).getTime()
  const diff = dueAt - current

  if (diff > 0) {
    return `Due in ${formatRelativeTime(diff)}`
  }

  return `Overdue by ${formatRelativeTime(current - dueAt)}`
}

function App() {
  const [tickets, setTickets] = useState(() => loadTickets())
  const [currentUser, setCurrentUser] = useState('Priya')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTicketId, setSelectedTicketId] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState(defaultForm)
  const [formError, setFormError] = useState('')
  const [page, setPage] = useState(1)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    saveTickets(tickets)
  }, [tickets])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextNow = new Date()
      setNow(nextNow)
      setTickets((previous) => escalateBreachedTickets(previous, nextNow))
    }, 30000)

    return () => window.clearInterval(timer)
  }, [])

  const orderedTickets = useMemo(
    () => sortTicketsByQueuePriority(tickets, now),
    [tickets, now],
  )

  const filteredTickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return orderedTickets.filter((ticket) => {
      const matchesSearch =
        !term ||
        [ticket.id, ticket.customerName, ticket.title, ticket.assignee]
          .join(' ')
          .toLowerCase()
          .includes(term)

      const matchesFilter = (() => {
        if (activeFilter === 'overdue') {
          return isTicketOverdue(ticket, now)
        }

        if (activeFilter === 'assigned_to_me') {
          return ticket.assignee === currentUser
        }

        if (activeFilter === 'urgent') {
          return ticket.priority === 'urgent'
        }

        if (activeFilter === 'normal') {
          return ticket.priority === 'normal'
        }

        return true
      })()

      const matchesStatus =
        statusFilter === 'all' || ticket.status === statusFilter

      return matchesSearch && matchesFilter && matchesStatus
    })
  }, [activeFilter, currentUser, now, orderedTickets, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const currentPageTickets = filteredTickets.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? null

  const stats = useMemo(() => {
    const openTickets = tickets.filter(
      (ticket) => ticket.status === 'open' || ticket.status === 'in_progress',
    )

    return {
      totalOpen: openTickets.length,
      overdue: openTickets.filter((ticket) => isTicketOverdue(ticket, now)).length,
      urgent: openTickets.filter((ticket) => ticket.priority === 'urgent').length,
      assignedToMe: openTickets.filter((ticket) => ticket.assignee === currentUser).length,
    }
  }, [currentUser, now, tickets])

  const updateTicket = (ticketId, changes) => {
    setTickets((previous) =>
      previous.map((ticket) => {
        if (ticket.id !== ticketId) {
          return ticket
        }

        const nextTicket = { ...ticket, ...changes }

        if (changes.priority && changes.priority !== ticket.priority) {
          nextTicket.responseDueAt = buildResponseDueAt(ticket.createdAt, changes.priority)
        }

        return nextTicket
      }),
    )
  }

  const handleCreateTicket = (event) => {
    event.preventDefault()

    const trimmedName = formData.customerName.trim()
    const trimmedTitle = formData.title.trim()
    const trimmedDescription = formData.description.trim()

    if (!trimmedName || !trimmedTitle || !trimmedDescription) {
      setFormError('Please provide customer name, issue title, and description.')
      return
    }

    const createdAt = new Date().toISOString()
    const nextTicket = {
      id: `TCK-${Date.now().toString().slice(-6)}`,
      customerName: trimmedName,
      customerEmail: formData.customerEmail.trim(),
      title: trimmedTitle,
      description: trimmedDescription,
      priority: PRIORITY_VALUES.includes(formData.priority) ? formData.priority : 'urgent',
      status: TICKET_STATUSES.includes(formData.status) ? formData.status : 'open',
      assignee: AGENTS.includes(formData.assignee) ? formData.assignee : 'Unassigned',
      createdAt,
      responseDueAt: buildResponseDueAt(createdAt, formData.priority),
    }

    setTickets((previous) => [nextTicket, ...previous])
    setSelectedTicketId(nextTicket.id)
    setFormData(defaultForm)
    setShowCreateForm(false)
    setFormError('')
  }

  const resetQueue = () => {
    const demoTickets = resetDemoTickets()
    setTickets(demoTickets)
    setSelectedTicketId(demoTickets[0]?.id ?? null)
    setSearchTerm('')
    setActiveFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Support operations</p>
          <h1>Helpdesk queue</h1>
        </div>

        <div className="topbar-controls">
          <label className="field-inline">
            <span>Current user</span>
            <select
              value={currentUser}
              onChange={(event) => setCurrentUser(event.target.value)}
            >
              <option value="Priya">Priya</option>
              <option value="Rahul">Rahul</option>
            </select>
          </label>

          <div className="searchbox">
            <label htmlFor="ticket-search">Search tickets</label>
            <input
              id="ticket-search"
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setPage(1)
              }}
              placeholder="Customer, ticket ID, issue"
            />
          </div>

          <button type="button" className="primary-button" onClick={() => setShowCreateForm((value) => !value)}>
            {showCreateForm ? 'Close form' : 'Create ticket'}
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard label="Total Open Tickets" value={stats.totalOpen} tone="neutral" />
        <StatCard label="Overdue" value={stats.overdue} tone="alert" />
        <StatCard label="Urgent" value={stats.urgent} tone="priority" />
        <StatCard label="Assigned to Me" value={stats.assignedToMe} tone="success" />
      </section>

      {showCreateForm && (
        <section className="panel create-panel">
          <div className="panel-header">
            <h2>Create a new ticket</h2>
          </div>
          <form onSubmit={handleCreateTicket} className="ticket-form">
            <div className="form-grid">
              <label>
                <span>Customer name</span>
                <input
                  value={formData.customerName}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      customerName: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Customer email</span>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      customerEmail: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="full-width">
                <span>Issue title</span>
                <input
                  value={formData.title}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="full-width">
                <span>Description</span>
                <textarea
                  value={formData.description}
                  rows="4"
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Priority</span>
                <select
                  value={formData.priority}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      priority: event.target.value,
                    }))
                  }
                >
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                </select>
              </label>

              <label>
                <span>Assignee</span>
                <select
                  value={formData.assignee}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      assignee: event.target.value,
                    }))
                  }
                >
                  <option value="Unassigned">Unassigned</option>
                  {AGENTS.map((agent) => (
                    <option key={agent} value={agent}>
                      {agent}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status</span>
                <select
                  value={formData.status}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  {TICKET_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {formError && <p className="form-error">{formError}</p>}
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Save ticket
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="toolbar panel">
        <div className="filter-group">
          {FILTER_OPTIONS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={activeFilter === filter.id ? 'filter active' : 'filter'}
              onClick={() => {
                setActiveFilter(filter.id)
                setPage(1)
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="filter-group narrow">
          <label className="field-inline compact">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="secondary-button" onClick={resetQueue}>
            Reset demo data
          </button>
        </div>
      </section>

      <main className="content-grid">
        <section className="queue-panel panel">
          <div className="list-header">
            <div>
              <p className="eyebrow">Queue</p>
              <h2>
                {filteredTickets.length} result{filteredTickets.length === 1 ? '' : 's'}
              </h2>
            </div>
            <div className="pagination-meta">
              Page {safePage} of {totalPages}
            </div>
          </div>

          {currentPageTickets.length === 0 ? (
            <div className="empty-state">
              <h3>No tickets match this view.</h3>
              <p>Adjust the filters, search terms, or create a new support request.</p>
            </div>
          ) : (
            <div className="ticket-list">
              {currentPageTickets.map((ticket, index) => {
                const overdue = isTicketOverdue(ticket, now)

                return (
                  <article
                    key={ticket.id}
                    className={selectedTicketId === ticket.id ? 'ticket-card selected' : 'ticket-card'}
                    onClick={() => setSelectedTicketId(ticket.id)}
                  >
                    <div className="ticket-card-top">
                      <div className="meta-block">
                        <span className="ticket-id">{ticket.id}</span>
                        <span className="queue-rank">#{index + 1 + (safePage - 1) * PAGE_SIZE}</span>
                      </div>
                      <div className="badges-wrap">
                        <span className={`badge priority-${ticket.priority}`}>
                          {ticket.priority}
                        </span>
                        <span className={`badge status-${ticket.status}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        {overdue && (
                          <span className="badge badge-alert">Overdue</span>
                        )}
                      </div>
                    </div>

                    <h3>{ticket.title}</h3>
                    <div className="customer-row">
                      <strong>{ticket.customerName}</strong>
                      <span>{ticket.assignee === 'Unassigned' ? 'Unassigned' : `Assigned to ${ticket.assignee}`}</span>
                    </div>
                    <p className="summary">{ticket.description}</p>

                    <div className="ticket-meta-grid">
                      <div>
                        <span className="meta-label">Created</span>
                        <span>{formatDateTime(ticket.createdAt)}</span>
                      </div>
                      <div>
                        <span className="meta-label">Deadline</span>
                        <span>{formatDateTime(ticket.responseDueAt)}</span>
                      </div>
                      <div>
                        <span className="meta-label">SLA</span>
                        <span>{getDueSummary(ticket, now)}</span>
                      </div>
                    </div>

                    <div className="card-actions">
                      <label>
                        <span>Assign</span>
                        <select
                          value={ticket.assignee}
                          onChange={(event) =>
                            updateTicket(ticket.id, { assignee: event.target.value })
                          }
                        >
                          <option value="Unassigned">Unassigned</option>
                          {AGENTS.map((agent) => (
                            <option key={agent} value={agent}>
                              {agent}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Status</span>
                        <select
                          value={ticket.status}
                          onChange={(event) =>
                            updateTicket(ticket.id, { status: event.target.value })
                          }
                        >
                          {TICKET_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          <div className="pagination">
            <button
              type="button"
              className="secondary-button"
              disabled={safePage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </button>
            <span>
              {filteredTickets.length} total / {Math.max(1, totalPages)} pages
            </span>
            <button
              type="button"
              className="secondary-button"
              disabled={safePage === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Next
            </button>
          </div>
        </section>

        {selectedTicket ? (
          <aside className="detail-panel panel">
            <div className="detail-header">
              <div>
                <p className="eyebrow">Ticket details</p>
                <h2>{selectedTicket.id}</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setSelectedTicketId(null)}>
                Close
              </button>
            </div>

            <div className="detail-body">
              <h3>{selectedTicket.title}</h3>
              <p>{selectedTicket.description}</p>

              <dl className="detail-grid">
                <div>
                  <dt>Customer</dt>
                  <dd>{selectedTicket.customerName}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{selectedTicket.customerEmail || 'Not provided'}</dd>
                </div>
                <div>
                  <dt>Priority</dt>
                  <dd>{selectedTicket.priority}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selectedTicket.status.replace('_', ' ')}</dd>
                </div>
                <div>
                  <dt>Assignee</dt>
                  <dd>{selectedTicket.assignee}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDateTime(selectedTicket.createdAt)}</dd>
                </div>
                <div>
                  <dt>Response deadline</dt>
                  <dd>{formatDateTime(selectedTicket.responseDueAt)}</dd>
                </div>
                <div>
                  <dt>Current due state</dt>
                  <dd>{getDueSummary(selectedTicket, now)}</dd>
                </div>
              </dl>

              <div className="detail-actions">
                <label>
                  <span>Assign</span>
                  <select
                    value={selectedTicket.assignee}
                    onChange={(event) =>
                      updateTicket(selectedTicket.id, { assignee: event.target.value })
                    }
                  >
                    <option value="Unassigned">Unassigned</option>
                    {AGENTS.map((agent) => (
                      <option key={agent} value={agent}>
                        {agent}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Status</span>
                  <select
                    value={selectedTicket.status}
                    onChange={(event) =>
                      updateTicket(selectedTicket.id, { status: event.target.value })
                    }
                  >
                    {TICKET_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Priority</span>
                  <select
                    value={selectedTicket.priority}
                    onChange={(event) =>
                      updateTicket(selectedTicket.id, { priority: event.target.value })
                    }
                  >
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="normal">Normal</option>
                  </select>
                </label>
              </div>
            </div>
          </aside>
        ) : (
          <aside className="detail-panel panel placeholder-panel">
            <div className="detail-header">
              <div>
                <p className="eyebrow">Ticket details</p>
                <h2>No ticket selected</h2>
              </div>
            </div>
            <p className="placeholder-copy">Choose a ticket from the queue to inspect details and update assignment or status.</p>
          </aside>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, tone }) {
  return (
    <article className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

export default App
