import { useState, useEffect } from 'react'
import api from '../api'

export default function MeetingsPage() {
  const [tab, setTab] = useState('upcoming')
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMeetings() }, [tab])

  const loadMeetings = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/meetings/${tab}`)
      setMeetings(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this meeting?')) return
    try {
      await api.post(`/cancel/${id}`)
      loadMeetings()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error cancelling')
    }
  }

  const formatDate = (d) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  const formatTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  }

  const copyRescheduleLink = (id) => {
    const url = `${window.location.origin}/reschedule/${id}`
    navigator.clipboard.writeText(url)
    alert('Reschedule link copied!')
  }

  return (
    <>
      <div className="page-header">
        <h2>Meetings</h2>
        <p>View and manage your scheduled meetings</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>
          Upcoming
        </button>
        <button className={`tab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>
          Past
        </button>
      </div>

      {loading ? <div className="loading-spinner" /> : meetings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{tab === 'upcoming' ? '📭' : '📋'}</div>
          <p>No {tab} meetings found.</p>
        </div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
          {meetings.map(m => (
            <div key={m.id} className="card">
              <div className="flex justify-between items-center">
                <div>
                  <div style={{fontWeight: 600, fontSize: '1rem'}}>{m.invitee_name}</div>
                  <div className="text-sm text-muted">{m.invitee_email}</div>
                  <div className="text-sm mt-1">
                    📅 {formatDate(m.date)} &nbsp; ⏰ {formatTime(m.start_time)} – {formatTime(m.end_time)}
                  </div>
                  <span className={`badge badge-${m.status} mt-2`} style={{display: 'inline-block', marginTop: '0.5rem'}}>
                    {m.status}
                  </span>
                </div>
                {tab === 'upcoming' && m.status === 'confirmed' && (
                  <div className="flex gap-2" style={{flexDirection: 'column'}}>
                    <button className="btn btn-secondary btn-sm" onClick={() => copyRescheduleLink(m.id)}>
                      🔄 Reschedule Link
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleCancel(m.id)}>
                      ❌ Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
