import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../data");
const dataFile = path.join(dataDir, "tickets.json");

const seedTickets = [
  {
    id: "OPS-1001",
    title: "Laptop cannot connect to office Wi-Fi",
    description: "The laptop disconnects every few minutes.",
    requester: "Aarav",
    category: "Network",
    priority: "High",
    status: "In Progress",
    assignee: "IT Support",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "OPS-1002",
    title: "Request access to shared drive",
    description: "Need access to the Finance shared folder.",
    requester: "Maya",
    category: "Access",
    priority: "Medium",
    status: "Open",
    assignee: "Unassigned",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "OPS-1003",
    title: "Install approved PDF software",
    description: "Please install the approved PDF reader.",
    requester: "Ishaan",
    category: "Software",
    priority: "Low",
    status: "Resolved",
    assignee: "IT Support",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(seedTickets, null, 2));
  }
}

export async function readTickets() {
  await ensureStore();
  const raw = await fs.readFile(dataFile, "utf8");
  return JSON.parse(raw);
}

export async function writeTickets(tickets) {
  await ensureStore();
  const tempFile = `${dataFile}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(tickets, null, 2));
  await fs.rename(tempFile, dataFile);
}
