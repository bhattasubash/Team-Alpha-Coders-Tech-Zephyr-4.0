"""Reason codes for every constraint violation. One code per validator rule."""

from enum import Enum


class HardViolation(str, Enum):
    """Each value matches the validator's rule code."""

    UNSCHEDULED_OR_UNKNOWN = "H1"
    FACULTY_CONFLICT = "H2"
    GROUP_CONFLICT = "H3"
    ROOM_CONFLICT = "H4"
    CAPACITY_EXCEEDED = "H5"
    WRONG_ROOM_TYPE = "H6"
    FACULTY_UNAVAILABLE = "H7"
    ROOM_UNAVAILABLE = "H8"
    PERIOD_OUT_OF_RANGE = "H9"
    ACCESSIBILITY_VIOLATION = "H10"
    BASKET_SLOT_MISMATCH = "H11"
    FACULTY_DAILY_LIMIT = "H12"
    BOOKING_VIOLATION = "H13"
    FIXED_SLOT_VIOLATION = "H14"


class SoftPenalty(str, Enum):
    """Soft rule codes with associated penalty weights."""

    FACULTY_PREF_AVOIDED = "S1"
    GROUP_GAP = "S2"
    GROUP_OVERLOAD = "S3"
    SAME_COURSE_TWICE = "S4"
    ROOM_UNDERUTILIZED = "S5"
    LAST_PERIOD = "S6"


class BookingViolation(str, Enum):
    """Booking decision constraint codes."""

    DUPLICATE_DECISION = "B1"
    INVALID_OVERRIDE = "B2"
    CANCELLED_APPROVED = "B3"


class ExamViolation(str, Enum):
    """Exam scheduling constraint codes."""

    UNSCHEDULED_OR_UNKNOWN = "E1"
    ROOM_NOT_FOR_EXAM = "E2"
