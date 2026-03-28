"""
Email Notification Service
Sends booking confirmations, cancellation notices, and reschedule notifications.
Failures are logged but do not block the booking flow.

Fixed to use port 465 (SSL) instead of 587 (TLS) for Railway compatibility.
"""
import os
import logging
import smtplib
from datetime import date, time
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))  # Changed from 587 to 465
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "")

logger.info(f"📧 Email config: SMTP_HOST={SMTP_HOST}, SMTP_PORT={SMTP_PORT}, SMTP_USER={SMTP_USER}")


def _send_email(to: str, subject: str, body: str):
    """Send an email via SMTP. Fails gracefully."""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("⚠️ SMTP credentials not configured – skipping email to %s", to)
        return
    
    try:
        logger.info(f"📧 Sending email to {to}: {subject}")
        
        msg = MIMEText(body, "html")
        msg["Subject"] = subject
        msg["From"] = EMAIL_FROM
        msg["To"] = to
        
        # Use SMTP_SSL (port 465) instead of SMTP + starttls (port 587)
        # This is more reliable on Railway
        logger.info(f"🔐 Connecting to {SMTP_HOST}:{SMTP_PORT} using SSL")
        
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            logger.info("✅ SSL connection established")
            
            server.login(SMTP_USER, SMTP_PASSWORD)
            logger.info("✅ SMTP authentication successful")
            
            server.sendmail(EMAIL_FROM, to, msg.as_string())
            logger.info(f"✅ Email sent successfully to {to}: {subject}")
            
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"❌ SMTP Authentication Failed for {to}: {str(e)}")
        logger.error("🔑 Check SMTP_USER and SMTP_PASSWORD in Railway environment variables")
        logger.error("💡 For Gmail: Use App Password (16 chars), not your regular password")
        logger.error("💡 Get App Password: https://myaccount.google.com/apppasswords")
        
    except smtplib.SMTPException as e:
        logger.error(f"❌ SMTP Error sending to {to}: {str(e)}")
        
    except TimeoutError as e:
        logger.error(f"❌ Email Connection Timeout to {to}: {str(e)}")
        logger.error("🌐 Railway may have network restrictions on port 465")
        logger.error("💡 Try upgrading your Railway plan")
        
    except OSError as e:
        logger.error(f"❌ Network Error sending to {to}: {str(e)}")
        logger.error("🌐 Cannot reach SMTP server")
        
    except Exception as e:
        logger.error(f"❌ Failed to send email to {to}: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())


def send_booking_confirmation(
    invitee_email: str,
    invitee_name: str,
    event_name: str,
    booking_date: date,
    start_time: time,
    end_time: time,
):
    """Send booking confirmation email"""
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
    """Send cancellation notice email"""
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
    """Send reschedule notice email"""
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
