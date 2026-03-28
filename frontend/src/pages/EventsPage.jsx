import { useState, useEffect } from 'react'
import api from '../api'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [form, setForm] = useState({
    name: '', duration_minutes: 30, url_slug: '', buffer_before: 0, buffer_after: 0,
  })

  useEffect(() => { loadEvents() }, [])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const res = await api.get('/events')
      setEvents(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const openCreate = () => {
    setEditingEvent(null)
    setForm({ name: '', duration_minutes: 30, url_slug: '', buffer_before: 0, buffer_after: 0 })
    setShowModal(true)
  }

  const openEdit = (event) => {
    setEditingEvent(event)
    setForm({
      name: event.name,
      duration_minutes: event.duration_minutes,
      url_slug: event.url_slug,
      buffer_before: event.buffer_before,
      buffer_after: event.buffer_after,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}`, form)
      } else {
        await api.post('/events', form)
      }
      setShowModal(false)
      loadEvents()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving event')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this event type?')) return
    try {
      await api.delete(`/events/${id}`)
      loadEvents()
    } catch (err) { console.error(err) }
  }

  const copyLink = (slug) => {
    const url = `${window.location.origin}/book/${slug}`
    navigator.clipboard.writeText(url)
    alert('Booking link copied!')
  }

  return (
    <>
      <div className="page-header flex justify-between items-center">
        <div>
          <h2>Event Types</h2>
          <p>Create and manage your meeting types</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Event</button>
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p>No event types yet. Create your first one!</p>
        </div>
      ) : (
        <div className="card-grid">
          {events.map(ev => (
            <div key={ev.id} className="card event-card">
              <div className="event-card-body">
                <div className="event-name">{ev.name}</div>
                <div className="event-meta">
                  <span>⏱ {ev.duration_minutes} min</span>
                  {ev.buffer_before > 0 && <span>↩ {ev.buffer_before}m before</span>}
                  {ev.buffer_after > 0 && <span>↪ {ev.buffer_after}m after</span>}
                </div>
                <div className="event-link" onClick={() => copyLink(ev.url_slug)}>
                  🔗 /book/{ev.url_slug} — Copy link
                </div>
                <div className="event-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(ev)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ev.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingEvent ? 'Edit Event' : 'New Event Type'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Event Name</label>
                <input className="form-input" required value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. 30-min Consultation" />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <input className="form-input" type="number" min="5" required value={form.duration_minutes}
                  onChange={e => setForm({...form, duration_minutes: parseInt(e.target.value) || 0})} />
              </div>
              <div className="form-group">
                <label className="form-label">URL Slug</label>
                <input className="form-input" value={form.url_slug}
                  onChange={e => setForm({...form, url_slug: e.target.value})} placeholder="auto-generated if empty" />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label className="form-label">Buffer Before (min)</label>
                  <input className="form-input" type="number" min="0" value={form.buffer_before}
                    onChange={e => setForm({...form, buffer_before: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Buffer After (min)</label>
                  <input className="form-input" type="number" min="0" value={form.buffer_after}
                    onChange={e => setForm({...form, buffer_after: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingEvent ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
