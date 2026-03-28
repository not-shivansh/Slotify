import { useState, useEffect } from 'react'
import api from '../api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function AvailabilityPage() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState(
    DAYS.map((_, i) => ({ day_of_week: i, enabled: i < 5, start_time: '09:00', end_time: '17:00' }))
  )
  const [scheduleName, setScheduleName] = useState('Default')
  const [editingId, setEditingId] = useState(null)

  useEffect(() => { loadSchedules() }, [])

  const loadSchedules = async () => {
    setLoading(true)
    try {
      const res = await api.get('/availability')
      setSchedules(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleSave = async () => {
    const enabledSlots = slots.filter(s => s.enabled).map(s => ({
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
    }))

    try {
      if (editingId) {
        await api.put(`/availability/${editingId}`, {
          name: scheduleName,
          is_default: true,
          slots: enabledSlots,
        })
      } else {
        await api.post('/availability', {
          name: scheduleName,
          is_default: true,
          slots: enabledSlots,
        })
      }
      loadSchedules()
      alert('Availability saved!')
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving')
    }
  }

  const loadScheduleIntoEditor = (schedule) => {
    setEditingId(schedule.id)
    setScheduleName(schedule.name)
    const newSlots = DAYS.map((_, i) => {
      const existing = schedule.slots.find(s => s.day_of_week === i)
      if (existing) {
        return { day_of_week: i, enabled: true, start_time: existing.start_time, end_time: existing.end_time }
      }
      return { day_of_week: i, enabled: false, start_time: '09:00', end_time: '17:00' }
    })
    setSlots(newSlots)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule?')) return
    try {
      await api.delete(`/availability/${id}`)
      if (editingId === id) {
        setEditingId(null)
        setSlots(DAYS.map((_, i) => ({ day_of_week: i, enabled: i < 5, start_time: '09:00', end_time: '17:00' })))
        setScheduleName('Default')
      }
      loadSchedules()
    } catch (err) { console.error(err) }
  }

  return (
    <>
      <div className="page-header">
        <h2>Availability</h2>
        <p>Set your weekly schedule so others can book time with you</p>
      </div>

      {/* Editor */}
      <div className="card" style={{marginBottom: '1.5rem'}}>
        <div className="flex justify-between items-center mb-4">
          <div className="form-group" style={{marginBottom: 0}}>
            <label className="form-label">Schedule Name</label>
            <input className="form-input" value={scheduleName}
              onChange={e => setScheduleName(e.target.value)} style={{width: 220}} />
          </div>
          <button className="btn btn-primary" onClick={handleSave}>
            {editingId ? 'Update Schedule' : 'Save Schedule'}
          </button>
        </div>

        <div className="avail-grid">
          {slots.map((slot, idx) => (
            <div key={idx} className="avail-day-row">
              <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                <input type="checkbox" checked={slot.enabled}
                  onChange={e => {
                    const n = [...slots]; n[idx] = {...n[idx], enabled: e.target.checked}; setSlots(n)
                  }} />
                <span className="avail-day-label">{DAYS[slot.day_of_week]}</span>
              </label>
              {slot.enabled && (
                <div className="avail-times">
                  <input type="time" className="form-input" value={slot.start_time}
                    style={{width: 140}}
                    onChange={e => {
                      const n = [...slots]; n[idx] = {...n[idx], start_time: e.target.value}; setSlots(n)
                    }} />
                  <span className="text-muted">to</span>
                  <input type="time" className="form-input" value={slot.end_time}
                    style={{width: 140}}
                    onChange={e => {
                      const n = [...slots]; n[idx] = {...n[idx], end_time: e.target.value}; setSlots(n)
                    }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Existing Schedules */}
      {loading ? <div className="loading-spinner" /> : schedules.length > 0 && (
        <>
          <h3 style={{fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem'}}>Saved Schedules</h3>
          <div className="card-grid">
            {schedules.map(s => (
              <div key={s.id} className="card">
                <div className="flex justify-between items-center">
                  <div>
                    <strong>{s.name}</strong>
                    {s.is_default && <span className="badge badge-confirmed" style={{marginLeft: '0.5rem'}}>Default</span>}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => loadScheduleIntoEditor(s)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Delete</button>
                  </div>
                </div>
                <div className="text-sm text-muted mt-2">
                  {s.slots.length} time slots configured
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
