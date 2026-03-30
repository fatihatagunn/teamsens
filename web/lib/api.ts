import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  Meeting,
  CreateMeetingInput,
  Partner,
  CreatePartnerInput,
  SendEmailInput,
} from "@/types";
import { auth } from "./firebase";

const BASE_URL = "/api/v1";

async function getAuthHeader(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeader, ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error: string }).error ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasksApi = {
  list: (status?: string) =>
    request<Task[]>(`/tasks${status ? `?status=${status}` : ""}`),

  get: (id: string) => request<Task>(`/tasks/${id}`),

  create: (input: CreateTaskInput) =>
    request<Task>("/tasks", { method: "POST", body: JSON.stringify(input) }),

  update: (id: string, input: UpdateTaskInput) =>
    request<Task>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  delete: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
};

// ─── Meetings ─────────────────────────────────────────────────────────────────

export const meetingsApi = {
  list: () => request<Meeting[]>("/meetings"),

  get: (id: string) => request<Meeting>(`/meetings/${id}`),

  create: (input: CreateMeetingInput) =>
    request<Meeting>("/meetings", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    request<void>(`/meetings/${id}`, { method: "DELETE" }),
};

// ─── Partners ─────────────────────────────────────────────────────────────────

export const partnersApi = {
  list: () => request<Partner[]>("/partners"),

  get: (id: string) => request<Partner>(`/partners/${id}`),

  create: (input: CreatePartnerInput) =>
    request<Partner>("/partners", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateStatus: (id: string, status: Partner["status"]) =>
    request<Partner>(`/partners/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  sendEmail: (id: string, input: SendEmailInput) =>
    request<{ message: string; to: string }>(`/partners/${id}/email`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    request<void>(`/partners/${id}`, { method: "DELETE" }),
};
