import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import EventsPage from './pages/EventsPage'
import AvailabilityPage from './pages/AvailabilityPage'
import OverridesPage from './pages/OverridesPage'
import MeetingsPage from './pages/MeetingsPage'
import BookingPage from './pages/BookingPage'
import ReschedulePage from './pages/ReschedulePage'

export default function App() {
  return (
    <Routes>
      {/* Public booking routes — no sidebar */}
      <Route path="/book/:slug" element={<BookingPage />} />
      <Route path="/reschedule/:bookingId" element={<ReschedulePage />} />

      {/* Admin routes with sidebar */}
      <Route element={<Layout />}>
        <Route path="/" element={<EventsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/availability" element={<AvailabilityPage />} />
        <Route path="/overrides" element={<OverridesPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
      </Route>
    </Routes>
  )
}
