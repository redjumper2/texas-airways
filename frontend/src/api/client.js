const BASE = import.meta.env.VITE_API_URL || "/api";

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };
  if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }
  if (config.body instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  const res = await fetch(url, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || "Request failed", res.status, data.details);
  }
  return data;
}

export const api = {
  // Technicians
  getTechnicians: (params) => {
    const q = new URLSearchParams(params).toString();
    return request(`/technicians${q ? `?${q}` : ""}`);
  },
  createTechnician: (body) => request("/technicians", { method: "POST", body }),
  updateTechnician: (id, body) => request(`/technicians/${id}`, { method: "PUT", body }),
  deleteTechnician: (id) => request(`/technicians/${id}`, { method: "DELETE" }),

  // Jobs
  getJobs: (params) => {
    const q = new URLSearchParams(params).toString();
    return request(`/jobs${q ? `?${q}` : ""}`);
  },
  getJobStats: () => request("/jobs/stats"),
  createJob: (body) => request("/jobs", { method: "POST", body }),
  updateJob: (id, body) => request(`/jobs/${id}`, { method: "PUT", body }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: "DELETE" }),
  importJobs: (formData) => request("/jobs/import", { method: "POST", body: formData }),

  // Schedule
  getSchedule: () => request("/schedule"),
  saveSchedule: (assignments) => request("/schedule/save", { method: "POST", body: { assignments } }),
  getAuditLog: () => request("/schedule/audit"),

  // Health
  health: () => request("/health"),
};

export { ApiError };
