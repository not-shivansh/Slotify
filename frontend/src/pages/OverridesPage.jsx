import { useState, useEffect } from 'react'
import api from '../api'

export default function OverridesPage() {
  const [overrides, setOverrides] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    date: '', is_unavailable: true, start_time: '09:00', end_time: '17:00',
  })

  useEffect(() => { loadOverrides() }, [])

  const loadOverrides = async () => {
    setLoading(true)
    try {
      const res = await api.get('/overrides')
      setOverrides(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        date: form.date,
        is_unavailable: form.is_unavailable,
      }
      if (!form.is_unavailable) {
        payload.start_time = form.start_time
        payload.end_time = form.end_time
      }
      await api.post('/overrides', payload)
      setShowModal(false)
      setForm({ date: '', is_unavailable: true, start_time: '09:00', end_time: '17:00' })
      loadOverrides()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating override')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this override?')) return
    try {
      await api.delete(`/overrides/${id}`)
      loadOverrides()
    } catch (err) { console.error(err) }
  }

  const formatDate = (d) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  const formatTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  }

  return (
    <>
      <div className="page-header flex justify-between items-center">
        <div>
          <h2>Date Overrides</h2>
          <p>Block specific dates or set custom hours</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Override</button>
      </div>

      {loading ? <div className="loading-spinner" /> : overrides.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📌</div>
          <p>No date overrides. Add one for holidays or special days.</p>
        </div>
      ) : (
        <div className="card-grid">
          {overrides.map(o => (
            <div key={o.id} className="card">
              <div className="flex justify-between items-center">
                <div>
                  <strong>{formatDate(o.date)}</strong>
                  <div className="text-sm mt-1">
                    {o.is_unavailable ? (
                      <span className="badge badge-cancelled">Unavailable</span>
                    ) : (
                      <span className="badge badge-confirmed">{formatTime(o.start_time)} – {formatTime(o.end_time)}</span>
                    )}
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(o.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Date Override</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" required value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                  <input type="checkbox" checked={form.is_unavailable}
                    onChange={e => setForm({...form, is_unavailable: e.target.checked})} />
                  Mark as completely unavailable
                </label>
              </div>
              {!form.is_unavailable && (
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input className="form-input" type="time" value={form.start_time}
                      onChange={e => setForm({...form, start_time: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input className="form-input" type="time" value={form.end_time}
                      onChange={e => setForm({...form, end_time: e.target.value})} />
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Override</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
