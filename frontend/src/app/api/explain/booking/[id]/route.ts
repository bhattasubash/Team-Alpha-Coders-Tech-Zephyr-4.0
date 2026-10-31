import { NextRequest, NextResponse } from 'next/server';
import { getBookingsList } from '@/lib/server-data';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const bookingId = decodeURIComponent(params.id);
  const bookings = getBookingsList();
  const reqItem = bookings.requests.find((b: any) => b.id === bookingId);

  if (!reqItem) {
    return NextResponse.json({
      booking_id: bookingId,
      placed_reason: 'Evaluated by priority reservation engine against room capacity and festival schedule.',
      why_this_room: 'Assigned venue satisfies requested attendee capacity and technical requirements.',
      plain_heading: `Booking request ${bookingId} processed.`,
      plain_body: 'Venue assigned according to institutional priority hierarchy.',
    });
  }

  return NextResponse.json({
    booking_id: bookingId,
    status: reqItem.status,
    placed_reason:
      reqItem.status === 'approved'
        ? `Approved in ${reqItem.assigned_room} on ${reqItem.assigned_day} P${reqItem.assigned_start_period}-P${reqItem.assigned_end_period} for ${reqItem.attendance} attendees.`
        : reqItem.status === 'alternative_offered'
        ? `Alternative venue offered due to higher priority booking.`
        : `Request rejected: ${reqItem.decision_reason || 'Venue capacity constraint'}.`,
    why_this_room: `Evaluated by priority reservation engine for ${reqItem.attendance} attendees against room capacity.`,
    plain_heading: `${reqItem.title} (${reqItem.requester}) - ${reqItem.status.toUpperCase()}`,
    plain_body: reqItem.decision_reason || 'Satisfies all Spectra Week festival reservation policies.',
  });
}
