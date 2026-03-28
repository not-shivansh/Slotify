from datetime import date, time, datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, EmailStr


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class UserBase(BaseModel):
    name: str
    email: EmailStr
    timezone: str = "Asia/Kolkata"


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# EventType
# ---------------------------------------------------------------------------
class EventTypeBase(BaseModel):
    name: str
    duration_minutes: int = 30
    url_slug: Optional[str] = None
    buffer_before: int = 0
    buffer_after: int = 0
    is_active: bool = True


class EventTypeCreate(EventTypeBase):
    pass


class EventTypeUpdate(BaseModel):
    name: Optional[str] = None
    duration_minutes: Optional[int] = None
    url_slug: Optional[str] = None
    buffer_before: Optional[int] = None
    buffer_after: Optional[int] = None
    is_active: Optional[bool] = None


class EventTypeResponse(EventTypeBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# AvailabilitySlot
# ---------------------------------------------------------------------------
class AvailabilitySlotBase(BaseModel):
    day_of_week: int  # 0=Monday … 6=Sunday
    start_time: time
    end_time: time


class AvailabilitySlotCreate(AvailabilitySlotBase):
    pass


class AvailabilitySlotResponse(AvailabilitySlotBase):
    id: UUID

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# AvailabilitySchedule
# ---------------------------------------------------------------------------
class AvailabilityScheduleBase(BaseModel):
    name: str = "Default"
    is_default: bool = False


class AvailabilityScheduleCreate(AvailabilityScheduleBase):
    slots: List[AvailabilitySlotCreate] = []


class AvailabilityScheduleUpdate(BaseModel):
    name: Optional[str] = None
    is_default: Optional[bool] = None
    slots: Optional[List[AvailabilitySlotCreate]] = None


class AvailabilityScheduleResponse(AvailabilityScheduleBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    slots: List[AvailabilitySlotResponse] = []

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# DateOverride
# ---------------------------------------------------------------------------
class DateOverrideBase(BaseModel):
    date: date
    is_unavailable: bool = False
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class DateOverrideCreate(DateOverrideBase):
    pass


class DateOverrideUpdate(BaseModel):
    is_unavailable: Optional[bool] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class DateOverrideResponse(DateOverrideBase):
    id: UUID
    user_id: UUID

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# CustomQuestion
# ---------------------------------------------------------------------------
class CustomQuestionBase(BaseModel):
    question_text: str
    is_required: bool = False
    order: int = 0


class CustomQuestionCreate(CustomQuestionBase):
    pass


class CustomQuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    is_required: Optional[bool] = None
    order: Optional[int] = None


class CustomQuestionResponse(CustomQuestionBase):
    id: UUID
    event_type_id: UUID

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Answer
# ---------------------------------------------------------------------------
class AnswerBase(BaseModel):
    question_id: UUID
    answer_text: str


class AnswerResponse(AnswerBase):
    id: UUID
    booking_id: UUID

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------
class BookingBase(BaseModel):
    date: date
    start_time: time
    invitee_name: str
    invitee_email: EmailStr


class BookingCreate(BookingBase):
    event_type_id: UUID
    answers: List[AnswerBase] = []


class BookingResponse(BookingBase):
    id: UUID
    event_type_id: UUID
    end_time: time
    status: str
    rescheduled_to_id: Optional[UUID] = None
    created_at: datetime
    answers: List[AnswerResponse] = []

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Reschedule
# ---------------------------------------------------------------------------
class RescheduleRequest(BaseModel):
    new_date: date
    new_start_time: time


# ---------------------------------------------------------------------------
# Slot (for slot generation response)
# ---------------------------------------------------------------------------
class TimeSlotResponse(BaseModel):
    start_time: time
    end_time: time
