"""
Email Notification Service
Sends booking confirmations, cancellation notices, and reschedule notifications.
Failures are logged but do not block the booking flow.
"""
import os
import logging
from datetime import date, time

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "")


def _send_email(to: str, subject: str, body: str):
    """Send an email via SMTP. Fails gracefully."""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured – skipping email to %s", to)
        return

    try:
        import smtplib
        from email.mime.text import MIMEText

        msg = MIMEText(body, "html")
        msg["Subject"] = subject
        msg["From"] = EMAIL_FROM
        msg["To"] = to

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, to, msg.as_string())

        logger.info("Email sent to %s: %s", to, subject)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, str(e))


def send_booking_confirmation(
    invitee_email: str,
    invitee_name: str,
    event_name: str,
    booking_date: date,
    start_time: time,
    end_time: time,
):
    subject = f"Booking Confirmed – {event_name}"
    body = f"""
    <h2>Booking Confirmed ✅</h2>
    <p>Hi {invitee_name},</p>
    <p>Your meeting <strong>{event_name}</strong> has been booked successfully.</p>
    <p><strong>Date:</strong> {booking_date.strftime('%B %d, %Y')}</p>
    <p><strong>Time:</strong> {start_time.strftime('%I:%M %p')} – {end_time.strftime('%I:%M %p')}</p>
    <br>
    <p>— Slotify</p>
    """
    _send_email(invitee_email, subject, body)


def send_cancellation_notice(
    invitee_email: str,
    invitee_name: str,
    event_name: str,
    booking_date: date,
    start_time: time,
):
    subject = f"Booking Cancelled – {event_name}"
    body = f"""
    <h2>Booking Cancelled ❌</h2>
    <p>Hi {invitee_name},</p>
    <p>Your meeting <strong>{event_name}</strong> on {booking_date.strftime('%B %d, %Y')}
    at {start_time.strftime('%I:%M %p')} has been cancelled.</p>
    <br>
    <p>— Slotify</p>
    """
    _send_email(invitee_email, subject, body)


def send_reschedule_notice(
    invitee_email: str,
    invitee_name: str,
    event_name: str,
    old_date: date,
    old_time: time,
    new_date: date,
    new_start: time,
    new_end: time,
):
    subject = f"Meeting Rescheduled – {event_name}"
    body = f"""
    <h2>Meeting Rescheduled 🔄</h2>
    <p>Hi {invitee_name},</p>
    <p>Your meeting <strong>{event_name}</strong> has been rescheduled.</p>
    <p><strong>Old:</strong> {old_date.strftime('%B %d, %Y')} at {old_time.strftime('%I:%M %p')}</p>
    <p><strong>New:</strong> {new_date.strftime('%B %d, %Y')}, {new_start.strftime('%I:%M %p')} – {new_end.strftime('%I:%M %p')}</p>
    <br>
    <p>— Slotify</p>
    """
    _send_email(invitee_email, subject, body)
