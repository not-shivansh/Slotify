import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ReschedulePage() {
  const { bookingId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [event, setEvent] = useState(null)

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [step, setStep] = useState('calendar')
  const [newBooking, setNewBooking] = useState(null)

  useEffect(() => {
    // We need to figure out the event from the booking. We'll fetch all upcoming meetings
    // and find the one matching. Alternatively we could expose an endpoint for this.
    // For now, let's just show the calendar; the reschedule endpoint needs event_type_id from the booking.
    setLoading(false)
  }, [bookingId])

  const loadSlots = async (date) => {
    setSlotsLoading(true)
    setSelectedSlot(null)
    try {
      // We need event_type_id. Let's try to get it from the meetings list
      if (!event) {
        // Attempt to find from upcoming meetings
        const upRes = await api.get('/meetings/upcoming')
        const booking = upRes.data.find(m => m.id === bookingId)
        if (booking) {
          const evRes = await api.get(`/events/${booking.event_type_id}`)
          setEvent(evRes.data)
          const dateStr = formatDateISO(date)
          const res = await api.get(`/slots?event_type_id=${booking.event_type_id}&date=${dateStr}`)
          setSlots(res.data)
        } else {
          setError('Booking not found or not eligible for rescheduling')
        }
      } else {
        const dateStr = formatDateISO(date)
        const res = await api.get(`/slots?event_type_id=${event.id}&date=${dateStr}`)
        setSlots(res.data)
      }
    } catch (err) { console.error(err) }
    setSlotsLoading(false)
  }

  const handleReschedule = async () => {
    try {
      const res = await api.post(`/reschedule/${bookingId}`, {
        new_date: formatDateISO(selectedDate),
        new_start_time: selectedSlot.start_time,
      })
      setNewBooking(res.data)
      setStep('confirmed')
    } catch (err) {
      alert(err.response?.data?.detail || 'Rescheduling failed')
    }
  }

  const formatDateISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
    return days
  }

  const isToday = (date) => {
    if (!date) return false
    const t = new Date()
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear()
  }

  const isPast = (date) => {
    if (!date) return true
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const isSameDay = (a, b) =>
    a && b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()

  const formatTime = (t) => {
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  }

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))

  if (loading) return <div className="booking-layout"><div className="loading-spinner" /></div>
  if (error) return (
    <div className="booking-layout">
      <div className="booking-card" style={{padding: '3rem', textAlign: 'center'}}>
        <h2>😕 {error}</h2>
      </div>
    </div>
  )

  if (step === 'confirmed') return (
    <div className="booking-layout">
      <div className="booking-card confirmation-card">
        <div className="check-icon">✓</div>
        <h2>Meeting Rescheduled!</h2>
        <p className="text-muted mt-2">Your meeting has been updated successfully</p>
        <div className="card" style={{marginTop: '1.5rem', textAlign: 'left', display: 'inline-block', minWidth: 280}}>
          <p><strong>{event?.name}</strong></p>
          <p className="text-sm text-muted mt-1">📅 {selectedDate?.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})}</p>
          <p className="text-sm text-muted">⏰ {formatTime(newBooking?.start_time)} – {formatTime(newBooking?.end_time)}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="booking-layout">
      <div className="booking-card">
        <div className="booking-header">
          <h2>🔄 Reschedule Meeting</h2>
          {event && <p className="text-sm text-muted">{event.name} — {event.duration_minutes} minutes</p>}
        </div>
        <div className="booking-body">
          <div className="booking-calendar-section">
            <div className="flex justify-between items-center mb-4">
              <button className="btn btn-ghost" onClick={prevMonth}>◀</button>
              <strong>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
              <button className="btn btn-ghost" onClick={nextMonth}>▶</button>
            </div>
            <div className="calendar-grid">
              {DAY_NAMES.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
              {getDaysInMonth(currentMonth).map((day, i) => (
                <button key={i}
                  className={`calendar-day ${!day ? 'other-month' : ''} ${day && isPast(day) ? 'disabled' : ''} ${day && isToday(day) ? 'today' : ''} ${day && isSameDay(day, selectedDate) ? 'selected' : ''}`}
                  disabled={!day || isPast(day)}
                  onClick={() => { if (day && !isPast(day)) { setSelectedDate(day); loadSlots(day) } }}
                >
                  {day?.getDate()}
                </button>
              ))}
            </div>
          </div>

          <div className="booking-slots-section">
            {!selectedDate ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <p>Select a new date</p>
              </div>
            ) : slotsLoading ? (
              <div className="loading-spinner" />
            ) : slots.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">😔</div>
                <p>No available slots on this date</p>
              </div>
            ) : (
              <>
                <h4 style={{marginBottom: '0.75rem', fontWeight: 600}}>
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h4>
                <div className="slot-list">
                  {slots.map((s, i) => (
                    <button key={i}
                      className={`slot-btn ${selectedSlot && selectedSlot.start_time === s.start_time ? 'selected' : ''}`}
                      onClick={() => setSelectedSlot(s)}
                    >
                      {formatTime(s.start_time)}
                    </button>
                  ))}
                </div>
                {selectedSlot && (
                  <button className="btn btn-primary" style={{width: '100%', marginTop: '1rem'}} onClick={handleReschedule}>
                    Confirm Reschedule — {formatTime(selectedSlot.start_time)}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
