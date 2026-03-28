from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import events, availability, overrides, bookings, questions

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Slotify",
    description="Scheduling & Booking Platform API",
    version="1.0.0",
)

# CORS – allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(events.router, prefix="/api", tags=["Events"])
app.include_router(availability.router, prefix="/api", tags=["Availability"])
app.include_router(overrides.router, prefix="/api", tags=["Overrides"])
app.include_router(bookings.router, prefix="/api", tags=["Bookings"])
app.include_router(questions.router, prefix="/api", tags=["Questions"])


@app.get("/")
def root():
    return {"message": "Slotify API is running 🚀"}
