/**
 * Typed API Client for CIT Scheduler Backend
 *
 * Implements bearer token auth, standardized error envelope parsing:
 * {"error": {"code": string, "message": string, "details": any[]}}
 * with automatic retries and full endpoint coverage.
 */

import { paths } from './api-types';

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export class ApiError extends Error {
  code: string;
  details?: any;
  status: number;

  constructor(status: number, envelope: ApiErrorEnvelope) {
    const msg = envelope?.error?.message || `HTTP ${status}`;
    super(msg);
    this.name = 'ApiError';
    this.status = status;
    this.code = envelope?.error?.code || 'UNKNOWN_ERROR';
    this.details = envelope?.error?.details || [];
  }
}

const TOKEN_KEY = 'cit_scheduler_token';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || '';
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string | null): void {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 2
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let envelope: ApiErrorEnvelope;
        try {
          envelope = await response.json();
          // Normalize if backend returned detail format instead of error envelope
          if (!envelope.error && (envelope as any).detail) {
            const detail = (envelope as any).detail;
            if (typeof detail === 'object' && detail.code && detail.message) {
              envelope = { error: detail };
            } else {
              envelope = {
                error: {
                  code: `HTTP_${response.status}`,
                  message: typeof detail === 'string' ? detail : JSON.stringify(detail),
                  details: Array.isArray(detail) ? detail : [],
                },
              };
            }
          }
        } catch {
          envelope = {
            error: {
              code: `HTTP_${response.status}`,
              message: response.statusText || 'An error occurred',
              details: [],
            },
          };
        }

        // Retry on 503 service unavailable or network glitch
        if (response.status === 503 && retries > 0) {
          await new Promise((r) => setTimeout(r, 800));
          return this.request<T>(endpoint, options, retries - 1);
        }

        throw new ApiError(response.status, envelope);
      }

      // Check if response has content
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return (await response.json()) as T;
      }
      return (null as unknown) as T;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 600));
        return this.request<T>(endpoint, options, retries - 1);
      }
      throw new ApiError(0, {
        error: {
          code: 'NETWORK_ERROR',
          message: err?.message || 'Unable to connect to scheduling server',
          details: [],
        },
      });
    }
  }

  // --- Auth Endpoints ---
  async login(email: string, password = 'password'): Promise<{ access_token: string; role: string; email: string }> {
    const res = await this.request<{ access_token: string; role: string; email: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    if (res.access_token) {
      this.setToken(res.access_token);
    }
    return res;
  }

  async getMe(): Promise<{ email: string; name: string; role: string }> {
    return this.request<{ email: string; name: string; role: string }>('/api/auth/me');
  }

  logout(): void {
    this.setToken(null);
  }

  // --- Meta Endpoints ---
  async getMeta(): Promise<any> {
    return this.request<any>('/api/meta');
  }

  // --- Timetable Endpoints ---
  async getTimetable(view?: string, id?: string): Promise<any> {
    const params = new URLSearchParams();
    if (view) params.set('view', view);
    if (id) params.set('id', id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/api/timetable${query}`);
  }

  async getTimetableAll(): Promise<any> {
    return this.request<any>('/api/timetable/all');
  }

  async generateTimetable(body: any = {}): Promise<any> {
    return this.request<any>('/api/timetable/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async optimiseTimetable(body: any = {}): Promise<any> {
    return this.request<any>('/api/timetable/optimise', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getLegalSlots(sessionId: string): Promise<any> {
    return this.request<any>(`/api/sessions/${encodeURIComponent(sessionId)}/legal-slots`);
  }

  async moveSession(sessionId: string, req: { day: string; start_period: number; room_id: string }): Promise<any> {
    return this.request<any>(`/api/sessions/${encodeURIComponent(sessionId)}/move`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // --- Room Endpoints ---
  async getFreeRooms(
    params: { day: string; period: number; duration?: number; room_type?: string; min_capacity?: number } | string,
    period?: number,
    duration?: number
  ): Promise<any> {
    const q = new URLSearchParams();
    if (typeof params === 'string') {
      q.set('day', params);
      if (period !== undefined) q.set('period', String(period));
      if (duration !== undefined) q.set('duration', String(duration));
    } else {
      q.set('day', params.day);
      q.set('period', String(params.period));
      if (params.duration) q.set('duration', String(params.duration));
      if (params.room_type && params.room_type !== 'ALL') q.set('type', params.room_type);
      if (params.min_capacity) q.set('min_capacity', String(params.min_capacity));
    }
    return this.request<any>(`/api/rooms/free?${q.toString()}`);
  }

  // --- Exam Endpoints ---
  async getExams(): Promise<any> {
    return this.request<any>('/api/exams');
  }

  async generateExams(body: any = {}): Promise<any> {
    return this.request<any>('/api/exams/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // --- Bookings Endpoints ---
  async getBookings(status?: string): Promise<any> {
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<any>(`/api/bookings${query}`);
  }

  async parseBooking(text: string): Promise<any> {
    return this.request<any>('/api/bookings/parse', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async createBooking(req: any): Promise<any> {
    return this.request<any>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async cancelBooking(bookingId: string): Promise<any> {
    return this.request<any>(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: 'POST',
    });
  }

  async decideBookings(body: any = {}): Promise<any> {
    return this.request<any>('/api/bookings/decide', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getBookingDecision(bookingId: string): Promise<any> {
    return this.request<any>(`/api/bookings/${encodeURIComponent(bookingId)}/decision`);
  }

  // --- Disruption & Proposal Endpoints ---
  async previewDisruption(req: {
    changes?: any[];
    faculty_unavailable?: Array<{ faculty_id: string; day: string; periods: number[] }>;
    room_unavailable?: Array<{ room_id: string; day: string; periods: number[] }>;
    reason?: string;
  }): Promise<any> {
    let body: any = req;
    if (!req.changes) {
      const changes: any[] = [];
      if (req.faculty_unavailable) {
        for (const f of req.faculty_unavailable) {
          changes.push({
            type: 'faculty_leave',
            faculty_id: f.faculty_id,
            day: f.day,
            periods: f.periods,
            reason: req.reason || 'Medical / personal leave',
          });
        }
      }
      if (req.room_unavailable) {
        for (const r of req.room_unavailable) {
          changes.push({
            type: 'room_unavailable',
            room_id: r.room_id,
            day: r.day,
            periods: r.periods,
            reason: req.reason || 'Maintenance / repair closure',
          });
        }
      }
      body = { changes };
    }
    return this.request<any>('/api/disruptions/preview', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getProposals(): Promise<any> {
    return this.request<any>('/api/proposals');
  }

  async approveProposal(proposalId: string): Promise<any> {
    return this.request<any>(`/api/proposals/${encodeURIComponent(proposalId)}/approve`, {
      method: 'POST',
    });
  }

  async rejectProposal(proposalId: string, reason = 'Administrative decision'): Promise<any> {
    return this.request<any>(`/api/proposals/${encodeURIComponent(proposalId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // --- Explain & Assistant Endpoints ---
  async explainSession(sessionId: string): Promise<any> {
    return this.request<any>(`/api/explain/session/${encodeURIComponent(sessionId)}`);
  }

  async explainBooking(bookingId: string): Promise<any> {
    return this.request<any>(`/api/explain/booking/${encodeURIComponent(bookingId)}`);
  }

  async askAssistant(message: string): Promise<any> {
    return this.request<any>('/api/assistant', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // --- Validation, Health & Dashboard Endpoints ---
  async getValidationReport(): Promise<any> {
    return this.request<any>('/api/validation');
  }

  async getOfficialValidation(): Promise<any> {
    return this.request<any>('/api/validation/official');
  }

  async getDashboard(): Promise<any> {
    return this.request<any>('/api/dashboard');
  }

  async resetDatabase(): Promise<any> {
    return this.request<any>('/api/admin/reset', {
      method: 'POST',
    });
  }

  async getJobStatus(jobId: string): Promise<any> {
    return this.request<any>(`/api/jobs/${encodeURIComponent(jobId)}`);
  }

  async getProofSummary(): Promise<any> {
    return this.request<any>('/api/proof/summary');
  }

  async exportSchedule(): Promise<any> {
    return this.request<any>('/api/timetable/all');
  }
}

export const api = new ApiClient();
