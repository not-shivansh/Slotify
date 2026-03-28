<div align="center">

# 🗓️ Slotify

### Seamless Scheduling & Booking Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

*A Calendly-inspired scheduling platform that automates availability sharing, enables self-service booking, and eliminates scheduling conflicts.*

---

</div>

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📅 **Event Types** | Create & manage meeting types with custom durations, URL slugs, and buffer times |
| 🕐 **Availability** | Define weekly schedules (Mon–Sun) with multiple time ranges per day |
| 📌 **Date Overrides** | Block specific dates or set custom hours for holidays & exceptions |
| 🔗 **Public Booking** | Shareable booking links with calendar, slot picker, and form |
| ⚡ **Smart Slot Engine** | Dynamic slot generation with buffer time, overlap prevention, and override handling |
| 🔒 **Double-Booking Prevention** | Database-level validation ensures no scheduling conflicts |
| 👥 **Meetings Dashboard** | View upcoming & past meetings with cancel/reschedule options |
| 🔄 **Rescheduling** | One-click reschedule links with full availability checking |
| ❓ **Custom Questions** | Add dynamic invitee questions to booking forms |
| 📧 **Email Notifications** | Automated confirmations, cancellations & reschedule notices via SMTP |
| 📱 **Responsive Design** | Mobile-first UI that works across all devices |

---

## 📸 Screenshots

### Event Types
Manage your meeting types — create, edit, delete, and share booking links.

![Event Types](screenshots/events.png)

### Availability
Define your weekly schedule with flexible time ranges for each day.

![Availability](screenshots/availability.png)

### Date Overrides
Block specific dates or set custom hours for holidays and exceptions.

![Date Overrides](screenshots/overrides.png)

### Meetings Dashboard
Track all your upcoming and past meetings in one place.

![Meetings](screenshots/meetings.png)

### Public Booking Page
Clean, intuitive booking experience — select a date, pick a slot, and confirm.

![Public Booking](screenshots/booking.png)

### Booking Confirmation
Clean confirmation screen with meeting details after a successful booking.

![Booking Confirmed](screenshots/booking-confirmed.png)

### Booking Confirmation Mail

![Confirmation Mail](screenshots/booking-confirm.jpeg)

### Booking Cancellation Mail

![Cancellation Mail](screenshots/booking-cancel.jpeg)

---

## 🛠️ Tech Stack

```
Backend      →  FastAPI (Python) + SQLAlchemy ORM
Frontend     →  React 18 (Vite) + Tailwind CSS v4
Database     →  PostgreSQL
API Style    →  RESTful JSON
Email        →  SMTP (configurable)
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL** (running locally)

### 1. Clone the repo

```bash
git clone https://github.com/not-shivansh/Slotify.git
cd Slotify
```

### 2. Set up the backend

```bash
# Install dependencies
pip install -r requirements.txt

# Create a .env file
cp .env.example .env   # or create manually (see below)

# Create the database
psql -U postgres -c "CREATE DATABASE slotify;"

# Start the server
python -m uvicorn app.main:app --reload --port 8001
```

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app

- **Admin UI** → [http://localhost:5173](http://localhost:5173)
- **API Docs** → [http://localhost:8001/docs](http://localhost:8001/docs)

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/slotify

# Email (optional — booking works without it)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

---

## 📁 Project Structure

```
Slotify/
├── app/
│   ├── main.py                # FastAPI entry point + CORS
│   ├── database.py            # SQLAlchemy engine & session
│   ├── models.py              # 8 database models
│   ├── schemas.py             # Pydantic request/response schemas
│   ├── routers/
│   │   ├── events.py          # Event type CRUD
│   │   ├── availability.py    # Availability schedule CRUD
│   │   ├── overrides.py       # Date override CRUD
│   │   ├── bookings.py        # Slots, book, cancel, reschedule, meetings
│   │   └── questions.py       # Custom invitee questions CRUD
│   └── services/
│       ├── slot_engine.py     # Core slot generation algorithm
│       └── email.py           # SMTP email notifications
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── EventsPage.jsx       # Event management
│   │   │   ├── AvailabilityPage.jsx  # Weekly availability editor
│   │   │   ├── OverridesPage.jsx     # Date overrides
│   │   │   ├── MeetingsPage.jsx      # Meetings dashboard
│   │   │   ├── BookingPage.jsx       # Public booking flow
│   │   │   └── ReschedulePage.jsx    # Reschedule flow
│   │   ├── components/Layout.jsx     # Sidebar layout
│   │   ├── api.js                    # Axios API client
│   │   └── index.css                 # Design system
│   └── vite.config.js               # Vite + Tailwind + API proxy
├── requirements.txt
└── .env
```

---

## 🔌 API Endpoints

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/events` | Create event type |
| `GET` | `/api/events` | List all events |
| `GET` | `/api/events/{id}` | Get event by ID |
| `GET` | `/api/events/slug/{slug}` | Get event by slug |
| `PUT` | `/api/events/{id}` | Update event |
| `DELETE` | `/api/events/{id}` | Delete event |

### Availability
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/availability` | Create schedule |
| `GET` | `/api/availability` | List schedules |
| `PUT` | `/api/availability/{id}` | Update schedule |
| `DELETE` | `/api/availability/{id}` | Delete schedule |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/slots?event_type_id=...&date=...` | Get available slots |
| `POST` | `/api/book` | Create booking |
| `POST` | `/api/cancel/{id}` | Cancel booking |
| `POST` | `/api/reschedule/{id}` | Reschedule booking |
| `GET` | `/api/meetings/upcoming` | Upcoming meetings |
| `GET` | `/api/meetings/past` | Past meetings |

### Overrides & Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/overrides` | Create date override |
| `GET` | `/api/overrides` | List overrides |
| `POST` | `/api/events/{id}/questions` | Add custom question |
| `GET` | `/api/events/{id}/questions` | List questions |

---

## 🧠 Slot Generation Algorithm

The slot engine is the core of Slotify. Here's how it works:

```
1. Load event type → get duration + buffer times
2. Check date overrides → if unavailable, return empty
3. If override has custom hours → use those
4. Otherwise → load default weekly availability for that day
5. Generate candidate slots at duration-minute intervals
6. Load all confirmed bookings for the date
7. Filter out candidates that overlap with bookings (including buffers)
8. Return available slots ✅
```

---

## 🗃️ Database Schema

```mermaid
erDiagram
    User ||--o{ EventType : creates
    User ||--o{ AvailabilitySchedule : defines
    User ||--o{ DateOverride : sets
    AvailabilitySchedule ||--o{ AvailabilitySlot : contains
    EventType ||--o{ Booking : receives
    EventType ||--o{ CustomQuestion : has
    Booking ||--o{ Answer : contains
    CustomQuestion ||--o{ Answer : answered_by
```

---

## 🔮 Future Enhancements

- [ ] Google Calendar integration
- [ ] Zoom/Meet link auto-generation
- [ ] Team scheduling
- [ ] Payment integration
- [ ] AI-based scheduling recommendations



<div align="center">

**Built with ❤️ by [Shivansh](https://linkedin.com/in/thakur-shivansh)**

</div>
