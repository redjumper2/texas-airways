import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ToastProvider, useToast } from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import Modal from "./components/Modal";
import { useTechnicians, useCreateTechnician, useUpdateTechnician, useDeleteTechnician } from "./hooks/useTechnicians";
import { useJobs, useJobStats, useCreateJob, useUpdateJob, useDeleteJob, useImportJobs } from "./hooks/useJobs";
import { useSchedule, useSaveSchedule } from "./hooks/useSchedule";

// ─── ICONS ───────────────────────────────────────────────────────────────
const I = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const Icons = {
  home: <I d={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>} />,
  users: <I d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />,
  briefcase: <I d={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>} />,
  zap: <I d={<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>} />,
  plus: <I d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />,
  edit: <I d={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />,
  trash: <I d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>} />,
  upload: <I d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>} />,
  map: <I d={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>} />,
  search: <I d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />,
  check: <I d={<><polyline points="20 6 9 17 4 12"/></>} />,
  clock: <I d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />,
  chevDown: <I d={<><polyline points="6 9 12 15 18 9"/></>} />,
  save: <I d={<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>} />,
  loader: <I d={<><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></>} />,
  alert: <I d={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>} />,
};

// ─── LOADING SPINNER ─────────────────────────────────────────────────────
function Spinner({ text = "Loading..." }) {
  return (
    <div className="empty" role="status" aria-label="Loading">
      <div className="spinner" /><p style={{ marginTop: 12, fontSize: 14 }}>{text}</p>
    </div>
  );
}

// ─── HOME PAGE ──────────────────────────────────────────────────────────
function HomePage({ onNav }) {
  const { data: stats, isLoading } = useJobStats();
  const { data: techData } = useTechnicians();
  const techCount = techData?.total || 0;
  const total = stats?.total || 0;
  const unsched = stats?.unscheduled || 0;
  const completed = stats?.completed || 0;

  return (
    <div>
      <div className="hero">
        <h1>Texas AirSystems</h1>
        <p>Service Dispatch Forecasting & Scheduling — streamline technician assignments across Central Texas.</p>
      </div>
      <div className="stats-grid">
        {[
          { icon: Icons.users, val: techCount, label: "Active Technicians", cls: "blue" },
          { icon: Icons.briefcase, val: total, label: "Total Work Orders", cls: "orange" },
          { icon: Icons.clock, val: unsched, label: "Unscheduled Jobs", cls: "red" },
          { icon: Icons.check, val: completed, label: "Completed", cls: "green" },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-value">{isLoading ? "—" : s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="home-grid">
        {[
          { id: "technicians", icon: Icons.users, bg: "#EBF5FF", color: "var(--brand)", title: "Technicians", desc: "View, add, or update your field service technicians and their home locations." },
          { id: "jobs", icon: Icons.briefcase, bg: "#FFF3E8", color: "var(--accent)", title: "Work Orders", desc: "Manage the active job list — add, edit, remove, or import from CSV exports." },
          { id: "schedule", icon: Icons.zap, bg: "#ECFDF5", color: "var(--success)", title: "Smart Schedule", desc: "Auto-assign technicians to jobs by proximity for the most efficient dispatch." },
        ].map(c => (
          <div className="home-card" key={c.id} onClick={() => onNav(c.id)} role="button" tabIndex={0} aria-label={c.title}
            onKeyDown={e => e.key === "Enter" && onNav(c.id)}>
            <div className="home-card-icon" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
            <h3>{c.title}</h3><p>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TECHNICIANS PAGE ───────────────────────────────────────────────────
function TechniciansPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({ name: "", location: "" });

  const { data, isLoading, error } = useTechnicians({ search: search || undefined });
  const createMut = useCreateTechnician();
  const updateMut = useUpdateTechnician();
  const deleteMut = useDeleteTechnician();

  const techs = data?.data || [];

  const openAdd = () => { setForm({ name: "", location: "" }); setEditModal("add"); };
  const openEdit = t => { setForm({ name: t.name, location: t.location }); setEditModal(t.id); };

  const save = async () => {
    if (!form.name.trim() || !form.location.trim()) { toast.error("Name and location are required"); return; }
    try {
      if (editModal === "add") {
        await createMut.mutateAsync(form);
        toast.success(`Added ${form.name}`);
      } else {
        await updateMut.mutateAsync({ id: editModal, ...form });
        toast.success(`Updated ${form.name}`);
      }
      setEditModal(null);
    } catch (err) { toast.error(err.message || "Failed to save"); }
  };

  const remove = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    try { await deleteMut.mutateAsync(id); toast.success(`Deleted ${name}`); }
    catch (err) { toast.error(err.message); }
  };

  const toggleAvail = async (t) => {
    try {
      await updateMut.mutateAsync({ id: t.id, available: !t.available });
      toast.info(`${t.name} marked ${t.available ? "unavailable" : "available"}`);
    } catch (err) { toast.error(err.message); }
  };

  if (error) return <div className="empty">{Icons.alert}<p>Failed to load technicians: {error.message}</p></div>;

  return (
    <div>
      <div className="filter-bar">
        <div className="search-box" style={{ width: 280 }}>
          <span className="search-icon">{Icons.search}</span>
          <input className="input" placeholder="Search technicians..." value={search}
            onChange={e => setSearch(e.target.value)} aria-label="Search technicians" />
        </div>
        <div style={{ flex: 1 }} />
        <span className="text-sm text-muted">{techs.length} technician{techs.length !== 1 ? "s" : ""}</span>
        <button className="btn btn-accent" onClick={openAdd}>{Icons.plus} Add Technician</button>
      </div>

      {isLoading ? <Spinner text="Loading technicians..." /> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th style={{width:40}}>#</th><th>Name</th><th>Home Location</th><th>Status</th><th style={{width:100}}>Actions</th></tr></thead>
              <tbody>
                {techs.map((t, i) => (
                  <tr key={t.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td><span className="flex-gap">{Icons.map} {t.location}</span></td>
                    <td>
                      <label className="toggle" aria-label={`${t.name} availability`}>
                        <input type="checkbox" checked={t.available} onChange={() => toggleAvail(t)} />
                        <span className="toggle-slider" />
                      </label>
                    </td>
                    <td>
                      <div className="flex-gap">
                        <button className="btn btn-icon btn-outline btn-sm" onClick={() => openEdit(t)} aria-label="Edit">{Icons.edit}</button>
                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => remove(t.id, t.name)} aria-label="Delete">{Icons.trash}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {techs.length === 0 && <tr><td colSpan={5}><div className="empty">No technicians found.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editModal && (
        <Modal title={editModal === "add" ? "Add Technician" : "Edit Technician"} onClose={() => setEditModal(null)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setEditModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) ? "Saving..." : "Save"}
            </button>
          </>}>
          <div className="form-group">
            <label className="form-label" htmlFor="tech-name">Full Name</label>
            <input id="tech-name" className="input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="tech-loc">Home Location</label>
            <input id="tech-loc" className="input" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="e.g. Round Rock" />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── JOBS PAGE ──────────────────────────────────────────────────────────
function JobsPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({ wo: "", account: "", type: "Quoted", description: "", status: "Unscheduled", substatus: "", city: "", zip: "" });
  const fileRef = useRef(null);

  const params = { page, limit: 50 };
  if (search) params.search = search;
  if (filterCity) params.city = filterCity;
  if (filterStatus) params.status = filterStatus;

  const { data, isLoading, error } = useJobs(params);
  const createMut = useCreateJob();
  const updateMut = useUpdateJob();
  const deleteMut = useDeleteJob();
  const importMut = useImportJobs();

  const jobs = data?.data || [];
  const cities = data?.cities || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  const openAdd = () => {
    setForm({ wo: "", account: "", type: "Quoted", description: "", status: "Unscheduled", substatus: "Ready for Scheduling", city: "", zip: "" });
    setEditModal("add");
  };
  const openEdit = j => {
    setForm({ wo: j.wo, account: j.account, type: j.type, description: j.description, status: j.status, substatus: j.substatus || "", city: j.city, zip: j.zip || "" });
    setEditModal(j.id);
  };

  const save = async () => {
    if (!form.account.trim() || !form.city.trim() || !form.wo.trim()) { toast.error("WO#, Account, and City are required"); return; }
    try {
      if (editModal === "add") {
        await createMut.mutateAsync(form);
        toast.success("Job created");
      } else {
        await updateMut.mutateAsync({ id: editModal, ...form });
        toast.success("Job updated");
      }
      setEditModal(null);
    } catch (err) { toast.error(err.details?.[0]?.message || err.message || "Failed to save"); }
  };

  const remove = async (id, wo) => {
    if (!confirm(`Delete WO ${wo}?`)) return;
    try { await deleteMut.mutateAsync(id); toast.success(`Deleted ${wo}`); }
    catch (err) { toast.error(err.message); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await importMut.mutateAsync(file);
      toast.success(`Imported ${result.imported} jobs (${result.skipped} skipped)`);
    } catch (err) { toast.error("Import failed: " + (err.message || "Unknown error")); }
    e.target.value = "";
  };

  const statusColor = s => s === "Completed" ? "badge-green" : s === "Unscheduled" ? "badge-red" : "badge-yellow";

  if (error) return <div className="empty">{Icons.alert}<p>Failed to load jobs: {error.message}</p></div>;

  return (
    <div>
      <div className="filter-bar">
        <div className="search-box" style={{ width: 260 }}>
          <span className="search-icon">{Icons.search}</span>
          <input className="input" placeholder="Search work orders..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} aria-label="Search jobs" />
        </div>
        <select className="select" style={{ width: 150 }} value={filterCity} onChange={e => { setFilterCity(e.target.value); setPage(1); }} aria-label="Filter by city">
          <option value="">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" style={{ width: 150 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option value="Unscheduled">Unscheduled</option>
          <option value="Completed">Completed</option>
          <option value="In Progress">In Progress</option>
        </select>
        <div style={{ flex: 1 }} />
        <span className="text-sm text-muted">{total} jobs</span>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImport} />
        <button className="btn btn-outline" onClick={() => fileRef.current?.click()} disabled={importMut.isPending}>
          {Icons.upload} {importMut.isPending ? "Importing..." : "Import CSV"}
        </button>
        <button className="btn btn-accent" onClick={openAdd}>{Icons.plus} Add Job</button>
      </div>

      {isLoading ? <Spinner text="Loading work orders..." /> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>WO#</th><th>Account</th><th>Type</th><th>Description</th><th>City</th><th>Status</th><th style={{width:90}}>Actions</th></tr></thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>{j.wo}</td>
                    <td><div className="truncate" title={j.account}>{j.account}</div></td>
                    <td><span className="badge-status badge-blue">{j.type}</span></td>
                    <td><div className="truncate" title={j.description}>{j.description}</div></td>
                    <td><span className="flex-gap">{Icons.map} {j.city}</span></td>
                    <td><span className={`badge-status ${statusColor(j.status)}`}>{j.status}</span></td>
                    <td>
                      <div className="flex-gap">
                        <button className="btn btn-icon btn-outline btn-sm" onClick={() => openEdit(j)} aria-label="Edit">{Icons.edit}</button>
                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => remove(j.id, j.wo)} aria-label="Delete">{Icons.trash}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && <tr><td colSpan={7}><div className="empty">No jobs match your filters.</div></td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span className="text-sm text-muted">Page {page} of {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      )}

      {editModal && (
        <Modal title={editModal === "add" ? "Add Work Order" : "Edit Work Order"} onClose={() => setEditModal(null)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setEditModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) ? "Saving..." : "Save"}
            </button>
          </>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="job-wo">WO Number</label>
              <input id="job-wo" className="input" value={form.wo} onChange={e => setForm(f => ({...f, wo: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="job-type">Type</label>
              <select id="job-type" className="select" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                <option>Quoted</option><option>Warranty</option><option>Internal T&amp;M</option><option>External T&amp;M</option><option>Equipment/Startup</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="job-acct">Service Account</label>
            <input id="job-acct" className="input" value={form.account} onChange={e => setForm(f => ({...f, account: e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="job-desc">Description</label>
            <input id="job-desc" className="input" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="job-city">City</label>
              <input id="job-city" className="input" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="job-zip">Zip Code</label>
              <input id="job-zip" className="input" value={form.zip} onChange={e => setForm(f => ({...f, zip: e.target.value}))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="job-status">Status</label>
            <select id="job-status" className="select" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
              <option>Unscheduled</option><option>In Progress</option><option>Completed</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SCHEDULE PAGE ──────────────────────────────────────────────────────
function SchedulePage() {
  const toast = useToast();
  const [viewMode, setViewMode] = useState("region");
  const [expandedRegions, setExpandedRegions] = useState({});
  const [filterTech, setFilterTech] = useState("");

  const { data, isLoading, error } = useSchedule();
  const saveMut = useSaveSchedule();

  const assignments = data?.assignments || [];
  const regions = data?.regions || {};
  const techSummary = data?.techSummary || [];
  const stats = data?.stats || {};

  const toggleRegion = r => setExpandedRegions(prev => ({ ...prev, [r]: !prev[r] }));
  const distClass = d => d < 12 ? "dist-near" : d < 30 ? "dist-mid" : "dist-far";

  const handleSave = async () => {
    try {
      await saveMut.mutateAsync(assignments);
      toast.success("Schedule saved to database");
    } catch (err) { toast.error("Failed to save: " + err.message); }
  };

  const filteredTechView = filterTech
    ? techSummary.filter(t => t.name.toLowerCase().includes(filterTech.toLowerCase()))
    : techSummary;

  if (error) return <div className="empty">{Icons.alert}<p>Failed to load schedule: {error.message}</p></div>;

  return (
    <div>
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {[
          { icon: Icons.zap, val: stats.totalJobs ?? "—", label: "Jobs to Schedule", cls: "orange" },
          { icon: Icons.users, val: stats.availableTechs ?? "—", label: "Available Techs", cls: "blue" },
          { icon: Icons.map, val: stats.avgDistance ?? "—", label: "Avg Miles / Job", cls: "green" },
          { icon: Icons.check, val: stats.assigned ?? "—", label: "Assigned", cls: "blue" },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div className="stat-info"><div className="stat-value">{s.val}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      <div className="flex-between mb-16">
        <div className="tab-bar">
          <div className={`tab-item ${viewMode === "region" ? "active" : ""}`} onClick={() => setViewMode("region")} role="tab" tabIndex={0}>By Region</div>
          <div className={`tab-item ${viewMode === "tech" ? "active" : ""}`} onClick={() => setViewMode("tech")} role="tab" tabIndex={0}>By Technician</div>
        </div>
        <div className="flex-gap">
          {viewMode === "tech" && (
            <div className="search-box" style={{ width: 220 }}>
              <span className="search-icon">{Icons.search}</span>
              <input className="input" placeholder="Filter techs..." value={filterTech} onChange={e => setFilterTech(e.target.value)} />
            </div>
          )}
          {assignments.length > 0 && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saveMut.isPending}>
              {Icons.save} {saveMut.isPending ? "Saving..." : "Save Schedule"}
            </button>
          )}
        </div>
      </div>

      {isLoading ? <Spinner text="Generating optimized schedule..." /> : stats.totalJobs === 0 ? (
        <div className="card"><div className="empty"><div className="empty-icon">✓</div><p style={{ fontSize: 15 }}>All jobs are currently scheduled or completed!</p></div></div>
      ) : viewMode === "region" ? (
        <div className="schedule-grid">
          {Object.entries(regions).filter(([, a]) => a.length > 0).map(([region, asgns]) => (
            <div key={region} className="schedule-region">
              <div className="region-header" onClick={() => toggleRegion(region)} aria-expanded={expandedRegions[region] !== false}>
                <h3>{Icons.map} {region} <span className="count">{asgns.length}</span></h3>
                <div style={{ transform: expandedRegions[region] === false ? "none" : "rotate(180deg)", transition: ".2s" }}>{Icons.chevDown}</div>
              </div>
              {expandedRegions[region] !== false && (
                <div className="region-body">
                  <div className="schedule-header-row">
                    <div>Technician</div><div>Work Order</div><div>Account / Job</div><div style={{ textAlign: "right" }}>Distance</div>
                  </div>
                  {asgns.map((a, i) => (
                    <div key={i} className="schedule-row">
                      <div className="tech-name"><span className="dot" /> {a.technician.name}</div>
                      <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-secondary)" }}>{a.job.wo}</div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{a.job.account}</div>
                        <div className="job-desc">{a.job.description}</div>
                      </div>
                      <div style={{ textAlign: "right" }}><span className={`dist-badge ${distClass(a.distance)}`}>{a.distance} mi</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="schedule-grid">
          {filteredTechView.map(t => (
            <div key={t.id} className="schedule-region">
              <div className="region-header">
                <h3><span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} /> {t.name}
                  <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: 12, marginLeft: 6 }}>— {t.location}</span>
                  <span className="count">{t.jobCount}</span></h3>
              </div>
              <div className="region-body">
                {t.jobs.map((a, i) => (
                  <div key={i} className="schedule-row" style={{ gridTemplateColumns: "1fr 1fr 100px" }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{a.job.account}</div>
                      <div className="job-desc">{a.job.city} — {a.job.wo}</div>
                    </div>
                    <div className="job-desc">{a.job.description}</div>
                    <div style={{ textAlign: "right" }}><span className={`dist-badge ${distClass(a.distance)}`}>{a.distance} mi</span></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filteredTechView.length === 0 && <div className="card"><div className="empty">No matching technicians with assignments.</div></div>}
        </div>
      )}
    </div>
  );
}

// ─── APP SHELL ──────────────────────────────────────────────────────────
function AppInner() {
  const [page, setPage] = useState("home");
  const { data: statsData } = useJobStats();
  const unscheduled = statsData?.unscheduled || 0;

  const pageInfo = {
    home: { title: "Dashboard", sub: "Overview of your dispatch operations" },
    technicians: { title: "Technicians", sub: "Manage your field service team" },
    jobs: { title: "Work Orders", sub: "Active work order management" },
    schedule: { title: "Smart Schedule", sub: "AI-optimized technician assignments" },
  };

  const navItems = [
    { id: "home", icon: Icons.home, label: "Dashboard" },
    { id: "technicians", icon: Icons.users, label: "Technicians" },
    { id: "jobs", icon: Icons.briefcase, label: "Work Orders", badge: unscheduled },
    { id: "schedule", icon: Icons.zap, label: "Smart Schedule" },
  ];

  return (
    <div className="app">
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">TA</div>
          <div className="sidebar-logo-text">Texas AirSystems<span>Service Dispatch</span></div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(n => (
            <div key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => setPage(n.id)} role="button" tabIndex={0} aria-current={page === n.id ? "page" : undefined}
              onKeyDown={e => e.key === "Enter" && setPage(n.id)}>
              {n.icon}{n.label}
              {n.badge > 0 && <span className="badge">{n.badge}</span>}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">© 2026 Texas AirSystems</div>
      </aside>
      <div className="main">
        <header className="top-bar">
          <h1>{pageInfo[page]?.title}</h1>
          <span className="top-bar-sub">{pageInfo[page]?.sub}</span>
        </header>
        <main className="content">
          <ErrorBoundary>
            {page === "home" && <HomePage onNav={setPage} />}
            {page === "technicians" && <TechniciansPage />}
            {page === "jobs" && <JobsPage />}
            {page === "schedule" && <SchedulePage />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
