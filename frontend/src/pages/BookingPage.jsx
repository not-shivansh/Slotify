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

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)

  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)

  const [step, setStep] = useState('calendar')
  const [form, setForm] = useState({ name: '', email: '' })
  const [answers, setAnswers] = useState({})
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    loadEvent()
  }, [slug])

  const loadEvent = async () => {
    try {
      const res = await api.get(`/events/slug/${slug}`)
      setEvent(res.data)

      const qRes = await api.get(`/events/${res.data.id}/questions`)
      setQuestions(qRes.data)
    } catch {
      setError('Event not found')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (selectedDate && event) loadSlots()
  }, [selectedDate])

  const loadSlots = async () => {
    setSlotsLoading(true)
    setSelectedSlot(null)
    try {
      const dateStr = formatDateISO(selectedDate)
      const res = await api.get(`/slots?event_type_id=${event.id}&date=${dateStr}`)
      setSlots(res.data)
    } catch (err) {
      console.error(err)
    }
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

      console.log("Booking success:", res.data)

      setBooking(res.data)
      setStep('confirmed')

    } catch (err) {
      console.error("Booking error:", err)
      alert(err.response?.data?.detail || 'Booking failed.')
    }
  }

  const formatDateISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  const formatTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d))
    }
    return days
  }

  const isPast = (date) => {
    if (!date) return true
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const formatReadableDate = (date) =>
    date?.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })

  if (loading) return <div className="p-6 text-center">Loading...</div>

  if (error) return <div className="p-6 text-center">{error}</div>

  // ✅ CONFIRMATION STEP (FULLY FIXED)
  if (step === 'confirmed') {
    if (!booking) return <div className="p-6 text-center">Loading confirmation...</div>

    return (
      <div className="p-6 text-center">
        <h2>✅ You're booked!</h2>

        <p className="mt-2">
          Confirmation sent to <strong>{booking.invitee_email}</strong>
        </p>

        <div className="mt-4 border p-4 inline-block text-left">
          <p><strong>{event.name}</strong></p>
          <p>📅 {formatReadableDate(selectedDate)}</p>
          <p>⏰ {formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
        </div>
      </div>
    )
  }

  // FORM STEP
  if (step === 'form') {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h2>{event.name}</h2>

        <p className="text-sm mt-1">
          {formatReadableDate(selectedDate)} | {formatTime(selectedSlot.start_time)}
        </p>

        <form onSubmit={handleBook} className="mt-4">
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border p-2 w-full mb-2"
          />

          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border p-2 w-full mb-2"
          />

          {questions.map(q => (
            <input
              key={q.id}
              placeholder={q.question_text}
              value={answers[q.id] || ''}
              onChange={(e) =>
                setAnswers({ ...answers, [q.id]: e.target.value })
              }
              className="border p-2 w-full mb-2"
            />
          ))}

          <button className="bg-black text-white w-full py-2">
            Confirm Booking
          </button>
        </form>
      </div>
    )
  }

  // CALENDAR + SLOTS
  return (
    <div className="p-6">
      <h2>{event.name}</h2>

      <div className="grid grid-cols-7 gap-2 mt-4">
        {DAY_NAMES.map(d => <div key={d}>{d}</div>)}

        {getDaysInMonth(currentMonth).map((day, i) => (
          <button
            key={i}
            disabled={!day || isPast(day)}
            onClick={() => setSelectedDate(day)}
            className="p-2 border"
          >
            {day?.getDate()}
          </button>
        ))}
      </div>

      {selectedDate && (
        <div className="mt-4">
          <h4>Available Slots</h4>

          {slotsLoading ? (
            <p>Loading...</p>
          ) : (
            slots.map((s, i) => (
              <button
                key={i}
                className="block border p-2 mt-2"
                onClick={() => {
                  setSelectedSlot(s)
                  setStep('form')
                }}
              >
                {formatTime(s.start_time)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

