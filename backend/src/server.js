import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import { ensureStore, readTickets, writeTickets } from "./store.js";

const app = express();
const PORT = Number(process.env.PORT || 3001);
const allowedOrigin = process.env.FRONTEND_ORIGIN || "*";

app.use(cors({
  origin: allowedOrigin === "*" ? "*" : allowedOrigin.split(",").map(value => value.trim()),
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json({ limit: "1mb" }));

const priorities = ["Low", "Medium", "High", "Urgent"];
const statuses = ["Open", "In Progress", "Resolved"];

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "opsdesk-api", timestamp: new Date().toISOString() });
});

app.get("/api/dashboard", async (_req, res, next) => {
  try {
    const tickets = await readTickets();
    res.json({
      total: tickets.length,
      open: tickets.filter(t => t.status === "Open").length,
      inProgress: tickets.filter(t => t.status === "In Progress").length,
      resolved: tickets.filter(t => t.status === "Resolved").length,
      urgent: tickets.filter(t => t.priority === "Urgent" && t.status !== "Resolved").length
    });
  } catch (error) { next(error); }
});

app.get("/api/tickets", async (req, res, next) => {
  try {
    const tickets = await readTickets();
    const { status, priority, q } = req.query;
    const filtered = tickets.filter(ticket => {
      const matchesStatus = !status || ticket.status === status;
      const matchesPriority = !priority || ticket.priority === priority;
      const text = `${ticket.id} ${ticket.title} ${ticket.requester} ${ticket.category}`.toLowerCase();
      const matchesQuery = !q || text.includes(String(q).toLowerCase());
      return matchesStatus && matchesPriority && matchesQuery;
    });
    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json({ tickets: filtered });
  } catch (error) { next(error); }
});

app.post("/api/tickets", async (req, res, next) => {
  try {
    const { title, description, requester, category, priority } = req.body || {};
    if (![title, description, requester, category, priority].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ error: "Please provide title, description, requester, category and priority." });
    }
    if (!priorities.includes(priority)) return res.status(400).json({ error: "Invalid priority." });
    const tickets = await readTickets();
    const ticket = {
      id: `OPS-${crypto.randomInt(10000, 99999)}`,
      title: title.trim(),
      description: description.trim(),
      requester: requester.trim(),
      category: category.trim(),
      priority,
      status: "Open",
      assignee: "Unassigned",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tickets.unshift(ticket);
    await writeTickets(tickets);
    res.status(201).json({ ticket });
  } catch (error) { next(error); }
});

app.patch("/api/tickets/:id", async (req, res, next) => {
  try {
    const tickets = await readTickets();
    const ticket = tickets.find(item => item.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found." });

    const { status, assignee, priority } = req.body || {};
    if (status !== undefined && !statuses.includes(status)) return res.status(400).json({ error: "Invalid status." });
    if (priority !== undefined && !priorities.includes(priority)) return res.status(400).json({ error: "Invalid priority." });
    if (assignee !== undefined && (typeof assignee !== "string" || !assignee.trim())) {
      return res.status(400).json({ error: "Assignee must be a non-empty string." });
    }

    if (status !== undefined) ticket.status = status;
    if (priority !== undefined) ticket.priority = priority;
    if (assignee !== undefined) ticket.assignee = assignee.trim();
    ticket.updatedAt = new Date().toISOString();
    await writeTickets(tickets);
    res.json({ ticket });
  } catch (error) { next(error); }
});

app.delete("/api/tickets/:id", async (req, res, next) => {
  try {
    const tickets = await readTickets();
    const index = tickets.findIndex(item => item.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Ticket not found." });
    const [deleted] = tickets.splice(index, 1);
    await writeTickets(tickets);
    res.json({ deleted });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error." });
});

await ensureStore();
app.listen(PORT, "0.0.0.0", () => {
  console.log(`OpsDesk API listening on port ${PORT}`);
});
