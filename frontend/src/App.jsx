import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, Bell, CheckCircle2, ChevronDown, CircleHelp, ClipboardList,
  Clock3, Filter, LayoutDashboard, Menu, Plus, RefreshCw, Search,
  Server, Settings, ShieldCheck, Ticket, Trash2, X, Zap
} from "lucide-react";

const API = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const categories = ["Hardware", "Software", "Network", "Access", "Email", "Other"];
const priorities = ["Low", "Medium", "High", "Urgent"];
const statuses = ["Open", "In Progress", "Resolved"];

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

function StatCard({ label, value, icon: Icon, tone, note }) {
  return <article className="stat-card">
    <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
    <div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
  </article>;
}

function Badge({ children, kind = "" }) {
  return <span className={`badge ${kind.toLowerCase().replaceAll(" ", "-")}`}>{children}</span>;
}

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, urgent: 0 });
  const [health, setHealth] = useState("checking");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [ticketData, dashboard, healthData] = await Promise.all([
        request("/tickets"), request("/dashboard"), request("/health")
      ]);
      setTickets(ticketData.tickets);
      setStats(dashboard);
      setHealth(healthData.status === "ok" ? "online" : "offline");
    } catch (err) {
      setError(err.message);
      setHealth("offline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibleTickets = useMemo(() => tickets.filter(ticket => {
    const text = `${ticket.id} ${ticket.title} ${ticket.requester} ${ticket.category}`.toLowerCase();
    return text.includes(query.toLowerCase())
      && (statusFilter === "All statuses" || ticket.status === statusFilter)
      && (priorityFilter === "All priorities" || ticket.priority === priorityFilter);
  }), [tickets, query, statusFilter, priorityFilter]);

  async function createTicket(formData) {
    try {
      await request("/tickets", { method: "POST", body: JSON.stringify(formData) });
      setShowModal(false);
      setToast("Ticket created successfully");
      await load();
    } catch (err) { setToast(err.message); }
  }

  async function updateTicket(id, changes) {
    try {
      await request(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
      setSelected(null);
      setToast("Ticket updated");
      await load();
    } catch (err) { setToast(err.message); }
  }

  async function deleteTicket(ticket) {
    if (!window.confirm(`Delete ${ticket.id}? This cannot be undone.`)) return;
    try {
      await request(`/tickets/${ticket.id}`, { method: "DELETE" });
      setSelected(null);
      setToast("Ticket deleted");
      await load();
    } catch (err) { setToast(err.message); }
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Zap size={21} fill="currentColor" /></div><span>ops<span>desk</span></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>
        <a className="nav-link active" href="#dashboard" onClick={() => setMobileNav(false)}><LayoutDashboard size={18}/> Overview</a>
        <a className="nav-link" href="#tickets" onClick={() => setMobileNav(false)}><Ticket size={18}/> All tickets <span className="nav-count">{stats.total}</span></a>
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><strong>Need a hand?</strong><p>Keep your team's requests moving.</p><span>OpsDesk workspace</span></div>
        <a className="nav-link muted" href="#settings"><Settings size={18}/> Settings</a>
        <div className="profile"><div className="avatar">VM</div><div><strong>Workspace Admin</strong><small>Administrator</small></div><ChevronDown size={15}/></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu"><Menu size={20}/></button>
        <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
        <div className="top-actions"><div className={`api-status ${health}`}><span className="status-dot"></span> API {health}</div><button className="icon-button" aria-label="Notifications"><Bell size={18}/><i></i></button><div className="top-avatar">VM</div></div>
      </header>

      <div className="page-content" id="dashboard">
        <section className="page-heading">
          <div><div className="eyebrow">FRIDAY, YOUR SERVICE DESK · JENKINS DEPLOYMENT</div><h1>Good morning, Admin <span>✦</span></h1><p>Here's what's happening with your support requests today.</p></div>
          <div className="heading-actions"><button className="button button-light" onClick={load}><RefreshCw size={16}/> Refresh</button><button className="button button-primary" onClick={() => setShowModal(true)}><Plus size={17}/> New ticket</button></div>
        </section>

        {error && <div className="error-banner"><Server size={17}/><span>{error}. Check that the backend API is running and the frontend API URL is correct.</span><button onClick={load}>Retry</button></div>}

        <section className="stats-grid">
          <StatCard label="Total tickets" value={stats.total} icon={ClipboardList} tone="violet" note="All requests"/>
          <StatCard label="Open" value={stats.open} icon={Clock3} tone="orange" note="Awaiting action"/>
          <StatCard label="In progress" value={stats.inProgress} icon={Activity} tone="blue" note="Being worked on"/>
          <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} tone="green" note="Successfully closed"/>
        </section>

        <section className="insight-row">
          <div className="insight-card"><div className="insight-symbol"><ShieldCheck size={20}/></div><div><strong>Service desk health</strong><p>{health === "online" ? "Your API is responding normally." : "Waiting for API connection."}</p></div><Badge kind={health === "online" ? "Resolved" : "High"}>{health === "online" ? "Operational" : "Unavailable"}</Badge></div>
          <div className="urgent-card"><div className="urgent-symbol"><Zap size={19}/></div><div><strong>{stats.urgent} urgent requests</strong><p>Require attention from your team</p></div></div>
        </section>

        <section className="tickets-panel" id="tickets">
          <div className="panel-heading"><div><h2>Recent tickets</h2><p>Track and manage your team's support requests.</p></div><button className="button button-outline" onClick={() => setShowModal(true)}><Plus size={16}/> Create ticket</button></div>
          <div className="toolbar">
            <div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tickets, requesters..."/></div>
            <div className="filter-control"><Filter size={15}/><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All statuses</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="filter-control"><select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}><option>All priorities</option>{priorities.map(p => <option key={p}>{p}</option>)}</select></div>
          </div>
          <div className="table-wrap">
            <table><thead><tr><th>TICKET</th><th>REQUEST</th><th>REQUESTER</th><th>PRIORITY</th><th>STATUS</th><th>UPDATED</th><th></th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="7" className="empty-state">Loading tickets…</td></tr>
                : visibleTickets.length === 0 ? <tr><td colSpan="7" className="empty-state">No tickets match your filters.</td></tr>
                : visibleTickets.map(ticket => <tr key={ticket.id} onClick={() => setSelected(ticket)} className="ticket-row">
                  <td><span className="ticket-id">{ticket.id}</span></td><td><div className="request-cell"><strong>{ticket.title}</strong><small>{ticket.category}</small></div></td><td><span className="requester"><span className="mini-avatar">{ticket.requester.slice(0,1).toUpperCase()}</span>{ticket.requester}</span></td><td><Badge kind={ticket.priority}>{ticket.priority}</Badge></td><td><Badge kind={ticket.status}>{ticket.status}</Badge></td><td className="date-cell">{new Date(ticket.updatedAt).toLocaleDateString()}</td><td><button className="row-arrow" aria-label={`Open ${ticket.id}`}>↗</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="table-footer"><span>Showing <strong>{visibleTickets.length}</strong> of <strong>{tickets.length}</strong> tickets</span><span>Updated just now</span></div>
        </section>
        <footer className="footer"><span>© 2026 OpsDesk</span><span><span className="footer-dot"></span> Connected workspace</span></footer>
      </div>
    </main>

    {showModal && <TicketModal onClose={() => setShowModal(false)} onSubmit={createTicket}/>}
    {selected && <TicketDetails ticket={selected} onClose={() => setSelected(null)} onUpdate={updateTicket} onDelete={deleteTicket}/>}
    {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>;
}

function TicketModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ title: "", description: "", requester: "", category: "Software", priority: "Medium" });
  const [saving, setSaving] = useState(false);
  function change(e) { setForm(current => ({ ...current, [e.target.name]: e.target.value })); }
  async function submit(e) { e.preventDefault(); setSaving(true); await onSubmit(form); setSaving(false); }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <form className="modal" onSubmit={submit}>
      <div className="modal-heading"><div><span className="eyebrow">NEW REQUEST</span><h2>Create a ticket</h2><p>Tell the service desk what you need help with.</p></div><button type="button" className="icon-button" onClick={onClose}><X size={19}/></button></div>
      <label>Request title<input name="title" value={form.title} onChange={change} placeholder="e.g. Cannot access shared drive" required maxLength="100"/></label>
      <label>Description<textarea name="description" value={form.description} onChange={change} placeholder="Add details that will help the team resolve this…" required rows="4"/></label>
      <div className="form-grid"><label>Requester<input name="requester" value={form.requester} onChange={change} placeholder="Your name" required/></label><label>Category<select name="category" value={form.category} onChange={change}>{categories.map(c => <option key={c}>{c}</option>)}</select></label></div>
      <label>Priority<select name="priority" value={form.priority} onChange={change}>{priorities.map(p => <option key={p}>{p}</option>)}</select></label>
      <div className="modal-actions"><button type="button" className="button button-light" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Creating…" : "Create ticket"}</button></div>
    </form>
  </div>;
}

function TicketDetails({ ticket, onClose, onUpdate, onDelete }) {
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [assignee, setAssignee] = useState(ticket.assignee);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal details-modal">
      <div className="modal-heading"><div><span className="eyebrow">{ticket.id}</span><h2>Ticket details</h2><p>Review and update this support request.</p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div>
      <div className="detail-title"><h3>{ticket.title}</h3><p>{ticket.description}</p></div>
      <div className="detail-meta"><div><small>REQUESTER</small><strong>{ticket.requester}</strong></div><div><small>CATEGORY</small><strong>{ticket.category}</strong></div><div><small>CREATED</small><strong>{new Date(ticket.createdAt).toLocaleString()}</strong></div></div>
      <div className="form-grid"><label>Status<select value={status} onChange={e => setStatus(e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><label>Priority<select value={priority} onChange={e => setPriority(e.target.value)}>{priorities.map(p => <option key={p}>{p}</option>)}</select></label></div>
      <label>Assignee<input value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Team member"/></label>
      <div className="modal-actions split-actions"><button className="button button-danger" onClick={() => onDelete(ticket)}><Trash2 size={15}/> Delete</button><div><button className="button button-light" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => onUpdate(ticket.id, { status, priority, assignee })}>Save changes</button></div></div>
    </section>
  </div>;
}

export default App;
