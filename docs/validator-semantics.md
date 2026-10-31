# Exact validator behaviour

This document records the exact semantics implemented by validator.py. These were previously mislabelled as disagreements with the problem statement. They are precise implementation choices in the official validator that the kernel must follow.

## 1. Exam seats use floor division

In validator.py line 392, available seating for an exam in room r is calculated as:

```python
seats += r["capacity"] // 2
```

This uses integer floor division:
- A room with capacity 45 provides 22 exam seats, not 23.
- A room with capacity 60 provides 30 exam seats.
Total exam capacity across multiple rooms is the sum of these floor-divided values.

## 2. Role category caps

In validator.py lines 53-57, `effective_category(data, req)` determines the priority category of a booking request:

```python
def effective_category(data, req):
    order = data["priority_order"]
    cap = data["role_category_cap"].get(req["role"], "club_event")
    a = order.index(req["requested_category"]) if req["requested_category"] in order else len(order) - 1
    return order[max(a, order.index(cap))]
```

- Priority order is indexed from highest priority at index 0 (institute_event) to lowest priority at index 3 (club_event).
- A larger index indicates lower priority.
- Using `max(a, order.index(cap))` ensures that a request can never exceed the maximum category permitted for the requester role.
- For example, if a club officer requests an institute_event, their role cap is club_event (index 3). The effective category becomes `order[max(0, 3)] = order[3] = "club_event"`.

## 3. Booking cancellations

In validator.py lines 274-277:

- The validator loads cancelled request IDs into `ctx.cancelled = {c["request_id"] for c in data.get("cancellations", [])}`.
- If any cancelled request has status "approved" or "alternative_offered" in fest_week bookings, rule B3 is triggered:
  `"{req_id} was cancelled but is {st}"`.
- Cancelled requests must always be marked as rejected with an explicit reason such as "Withdrawn by requester".
- Cancelled requests do not count toward `booking_score_max_if_all_approved`.

## 4. S4 soft penalty basket counting

In validator.py lines 203-221, soft rule S4 penalizes having more than one lecture for the same course on the same day. The validator evaluates this in two separate passes:

1. Non-basket lectures per student group:
   For every student group g, day, and course, if lecture count c > 1:
   `pen["S4"] += 3 * (c - 1)`

2. Basket lectures across all groups:
   For all sessions with a basket_slot, the validator tracks occurrences by `(course_id, day)`:
   `bc[(s["course_id"], day)] += 1`
   If c > 1:
   `pen["S4"] += 3 * (c - 1)`

Basket lectures are thus penalized if the same course appears multiple times on the same day anywhere in the basket assignment, in addition to group-specific lecture counts.

## 5. Textual conflicts between problem statement and validator

Currently, there are no verified textual conflicts between the problem statement specification and validator.py. If a true conflict is discovered, it must be logged here with the exact paragraph from the problem statement, the conflicting lines in validator.py, and the rationale for the resolution.
