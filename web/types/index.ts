import type { Timestamp } from "firebase/firestore";

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string;
  dueDate?: string; // ISO-8601
  createdAt: string;
  updatedAt: string;
}

/** Firestore raw document shape (before mapping to Task) */
export interface TaskDoc {
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string;
  dueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assigneeId?: string;
  dueDate?: string;
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  calendarId: string;
  eventId: string;
  meetLink: string;
  hangoutLink: string;
  htmlLink: string;
  createdAt: string;
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  startTime: string; // RFC3339
  endTime: string;   // RFC3339
  attendees?: string[];
  calendarId?: string;
}

// ─── Partners ─────────────────────────────────────────────────────────────────

export type PartnerStatus = "prospect" | "active" | "inactive";

export interface Partner {
  id: string;
  name: string;
  email: string;
  contactName: string;
  status: PartnerStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerInput {
  name: string;
  email: string;
  contactName?: string;
  notes?: string;
}

export interface SendEmailInput {
  subject: string;
  body: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}
