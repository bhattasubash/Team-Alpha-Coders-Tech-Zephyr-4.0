"""Tests for Natural Language Booking Parser with classrooms, time updates, and Hinglish accuracy."""

from __future__ import annotations

import pytest
from app.ai.provider import LLMProvider, ParsedBooking


@pytest.fixture
def provider():
    return LLMProvider()


def test_classroom_extraction_fallback(provider: LLMProvider):
    """Verify classrooms CR-101 to CR-205 are correctly parsed by fallback parser."""
    test_cases = [
        ("CR-101 chahiye kal subah 10 se 12 baje tak 50 students ke liye", "CR-101", "TUE", 3, 4, 50),
        ("Classroom 102 chahiye Monday 2 baje se 4 baje tak coding session ke liye", "CR-102", "MON", 6, 7, None),
        ("Classroom 103 chahiye somwar 9 to 12", "CR-103", "MON", 2, 4, None),
        ("kamra 201 chahiye Friday shaam 4 se 6 baje 40 students ke liye", "CR-201", "FRI", 8, 9, 40),
        ("Classroom 101 chahiye Wednesday P3 to P4", "CR-101", "WED", 3, 4, None),
    ]

    for text, expected_room, expected_day, exp_from, exp_to, exp_att in test_cases:
        res = provider._fallback_parse(text)
        assert res.requested_room == expected_room, f"Failed room for '{text}': got {res.requested_room}"
        assert res.windows is not None, f"Windows missing for '{text}'"
        assert res.windows[0]["day"] == expected_day, f"Day mismatch for '{text}': got {res.windows[0]['day']}"
        assert res.windows[0]["from_period"] == exp_from, f"From period mismatch for '{text}': got {res.windows[0]['from_period']}"
        assert res.windows[0]["to_period"] == exp_to, f"To period mismatch for '{text}': got {res.windows[0]['to_period']}"
        if exp_att is not None:
            assert res.attendance == exp_att, f"Attendance mismatch for '{text}': got {res.attendance}"
        else:
            # Crucially: room number must not be captured as attendees!
            assert res.attendance != int(expected_room.split("-")[1]), f"Room number leaked into attendance for '{text}'"


def test_lecture_halls_and_labs_fallback(provider: LLMProvider):
    """Verify lecture halls, seminar halls, and labs are extracted."""
    test_cases = [
        ("LH-2 chahiye kal 11 se 1", "LH-2", "TUE", 4, 5),
        ("Lecture Hall 3 on Thursday 2 pm to 5 pm", "LH-3", "THU", 6, 8),
        ("CS Lab 1 chahiye Wednesday 9 se 12 for olympiad demo", "CS-LAB-1", "WED", 2, 4),
        ("Physics lab chahiye Tuesday 2 to 6", "PHY-LAB", "TUE", 6, 9),
        ("Seminar Hall 1 on Thursday P7 for guest lecture", "SH-1", "THU", 7, 7),
    ]

    for text, expected_room, expected_day, exp_from, exp_to in test_cases:
        res = provider._fallback_parse(text)
        assert res.requested_room == expected_room, f"Failed room for '{text}': got {res.requested_room}"
        assert res.windows is not None, f"Windows missing for '{text}'"
        assert res.windows[0]["day"] == expected_day, f"Day mismatch for '{text}'"
        assert res.windows[0]["from_period"] == exp_from, f"From period mismatch for '{text}'"
        assert res.windows[0]["to_period"] == exp_to, f"To period mismatch for '{text}'"


def test_hinglish_days_mapping(provider: LLMProvider):
    """Verify all Hindi and Hinglish days map accurately to timetable days."""
    days = [
        ("somwar ko class chahiye", "MON"),
        ("somvaar ko", "MON"),
        ("aaj chahiye", "MON"),
        ("mangalwar ko", "TUE"),
        ("mangalvaar ko", "TUE"),
        ("kal chahiye", "TUE"),
        ("budhwar ko", "WED"),
        ("budhvaar ko", "WED"),
        ("parso chahiye", "WED"),
        ("guruwar ko", "THU"),
        ("guruvaar ko", "THU"),
        ("brihaspativar ko", "THU"),
        ("narso chahiye", "THU"),
        ("shukrawar ko", "FRI"),
        ("shukravaar ko", "FRI"),
        ("शुक्रवार ko", "FRI"),
        ("सोमवार ko", "MON"),
        ("Auditorium chahiye 4 nov 6 baje tak 200 logon ke liye reharsal ke liye", "WED"),
        ("CR-101 chahiye 6 nov 4 baje tak 50 students", "FRI"),
        ("seminar hall 2 nov 6 baje", "MON"),
        ("LH-1 chahiye 3 nov 6 baje", "TUE"),
        ("OAT chahiye 5 nov 6 baje", "THU"),
    ]

    for text, expected_day in days:
        d, _ = provider._extract_day(text.lower())
        assert d == expected_day, f"Failed day mapping for '{text}': expected {expected_day}, got {d}"


def test_hinglish_time_ranges(provider: LLMProvider):
    """Verify all Hinglish and English time phrases map accurately to period IDs."""
    times = [
        ("10 se 12 baje", 3, 4),
        ("9 se 12 baje", 2, 4),
        ("9 to 11 am", 2, 3),
        ("8 to 10 am", 1, 2),
        ("11 se 1 baje", 4, 5),
        ("2 se 4 baje", 6, 7),
        ("2 se 5 baje", 6, 8),
        ("2 se 6 baje", 6, 9),
        ("3 se 5 baje", 7, 8),
        ("4 se 6 baje", 8, 9),
        ("6 se 8 baje", 10, 11),
        ("6 se 9 baje", 10, 12),
        ("7 se 9 baje", 11, 12),
        ("after lunch", 6, 6),
        ("periods 10 to 12", 10, 12),
        ("P3 to P4", 3, 4),
        ("P7", 7, 7),
    ]

    for text, exp_from, exp_to in times:
        fp, tp, _ = provider._extract_periods(text.lower())
        assert fp == exp_from, f"From period mismatch for '{text}': expected {exp_from}, got {fp}"
        assert tp == exp_to, f"To period mismatch for '{text}': expected {exp_to}, got {tp}"


def test_parse_booking_text_with_classrooms(provider: LLMProvider):
    """Verify parse_booking_text (LLM or hybrid) accurately parses classroom updates."""
    res = provider.parse_booking_text("CR-101 chahiye kal subah 10 se 12 baje tak 50 students ke liye")
    assert res.requested_room == "CR-101"
    assert res.windows is not None
    assert res.windows[0]["day"] == "TUE"
    assert res.windows[0]["from_period"] == 3
    assert res.windows[0]["to_period"] == 4
    assert res.attendance == 50
