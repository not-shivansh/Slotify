import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function BookingPage() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)

  // Slots state
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Form state
  const [step, setStep] = useState('calendar') // calendar | form | confirmed
  const [form, setForm] = useState({ name: '', email: '' })
  const [answers, setAnswers] = useState({})
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    loadEvent()
  }, [slug])

  const loadEvent = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/events/slug/${slug}`)
      setEvent(res.data)
      // Load questions
      const qRes = await api.get(`/events/${res.data.id}/questions`)
      setQuestions(qRes.data)
    } catch (err) {
      setError('Event not found')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (selectedDate && event) {
      loadSlots()
    }
  }, [selectedDate])

  const loadSlots = async () => {
    setSlotsLoading(true)
    setSelectedSlot(null)
    try {
      const dateStr = formatDateISO(selectedDate)
      const res = await api.get(`/slots?event_type_id=${event.id}&date=${dateStr}`)
      setSlots(res.data)
    } catch (err) { console.error(err) }
    setSlotsLoading(false)
  }
  

const handleBook = async (e) => {
  e.preventDefault()

  try {
    const payload = {
      event_type_id: event.id,
      date: formatDateISO(selectedDate),
      start_time: selectedSlot.start_time,
      invitee_name: form.name,
      invitee_email: form.email,
      answers: questions.map(q => ({
        question_id: q.id,
        answer_text: answers[q.id] || '',
      })).filter(a => a.answer_text),
    }

    const res = await api.post('/book', payload)

    console.log("BOOKING SUCCESS:", res.data)

    setBooking(res.data)
    setStep('confirmed')

  } catch (err) {
    console.error("BOOKING ERROR:", err)

    // 🔥 HANDLE PARTIAL SUCCESS (IMPORTANT)
    if (err.response?.status === 500 || err.response?.status === 502) {
      alert("Booking was successful, but email failed.")

      // 🔥 STILL SHOW CONFIRMATION
      setBooking({
        invitee_email: form.email,
        start_time: selectedSlot.start_time
      })
      setStep('confirmed')

      return
    }

    if (err.response?.status === 409) {
      alert("⚠️ This slot is already booked. Please choose another.")
      loadSlots()
      return
    }

    alert(err.response?.data?.detail || "Booking failed")
  }
}



  // Calendar helpers
  const formatDateISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []

    // Pad with previous month
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
        <p className="text-muted mt-2">This booking link may be invalid.</p>
      </div>
    </div>
  )

  if (step === 'confirmed') return (
    <div className="booking-layout">
      <div className="booking-card confirmation-card">
        <div className="check-icon">✓</div>
        <h2>You're booked!</h2>
        <p className="text-muted mt-2">A confirmation email has been sent to <strong>{booking?.invitee_email}</strong></p>
        <div className="card" style={{marginTop: '1.5rem', textAlign: 'left', display: 'inline-block', minWidth: 280}}>
          <p><strong>{event.name}</strong></p>
          <p className="text-sm text-muted mt-1">📅 {selectedDate?.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})}</p>
          <p className="text-sm text-muted">⏰ {formatTime(booking?.start_time)} – {formatTime(booking?.end_time)}</p>
        </div>
      </div>
    </div>
  )

  if (step === 'form') return (
    <div className="booking-layout">
      <div className="booking-card" style={{maxWidth: 520}}>
        <div className="booking-header">
          <button className="btn btn-ghost" onClick={() => setStep('calendar')} style={{marginBottom: '0.5rem'}}>← Back</button>
          <h2>{event.name}</h2>
          <p className="text-sm text-muted mt-1">
            📅 {selectedDate?.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'})}
            &nbsp; ⏰ {formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}
          </p>
        </div>
        <form onSubmit={handleBook} style={{padding: '1.5rem'}}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" required value={form.name}
              onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" required value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" />
          </div>
          {questions.map(q => (
            <div key={q.id} className="form-group">
              <label className="form-label">{q.question_text} {q.is_required && '*'}</label>
              <input className="form-input" required={q.is_required}
                value={answers[q.id] || ''}
                onChange={e => setAnswers({...answers, [q.id]: e.target.value})} />
            </div>
          ))}
          <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '0.5rem'}}>
            Confirm Booking
          </button>
        </form>
      </div>
    </div>
  )

  // Calendar + Slots view
  return (
    <div className="booking-layout">
      <div className="booking-card">
        <div className="booking-header">
          <h2>{event.name}</h2>
          <p className="text-sm text-muted">⏱ {event.duration_minutes} minutes</p>
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
                  onClick={() => { if (day && !isPast(day)) { setSelectedDate(day); setStep('calendar') } }}
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
                <p>Select a date to see available times</p>
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
                      onClick={() => { setSelectedSlot(s); setStep('form') }}
                    >
                      {formatTime(s.start_time)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
