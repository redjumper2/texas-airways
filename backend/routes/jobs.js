const express = require("express");
const router = express.Router();
const multer = require("multer");
const Papa = require("papaparse");
const fs = require("fs");
const { db, getCoords, logAudit } = require("../database");
const { validate, jobSchema, jobUpdateSchema } = require("../middleware/validate");

const upload = multer({ dest: "/tmp/uploads/", limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/jobs
router.get("/", (req, res) => {
  try {
    const { search, city, status, type, page = 1, limit = 100, sort = "created_at", order = "desc" } = req.query;
    let sql = "SELECT * FROM jobs WHERE 1=1";
    const params = [];

    if (search) {
      sql += " AND (wo LIKE ? OR account LIKE ? OR description LIKE ? OR city LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (city) { sql += " AND LOWER(city) = LOWER(?)"; params.push(city); }
    if (status) { sql += " AND status = ?"; params.push(status); }
    if (type) { sql += " AND type = ?"; params.push(type); }

    const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as total");
    const total = db.prepare(countSql).get(...params).total;

    const allowedSorts = ["created_at", "wo", "account", "city", "status", "type"];
    const sortCol = allowedSorts.includes(sort) ? sort : "created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";
    const offset = (parseInt(page) - 1) * parseInt(limit);

    sql += ` ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const jobs = db.prepare(sql).all(...params);

    // Get city + status counts for filters
    const cities = db.prepare("SELECT DISTINCT city FROM jobs ORDER BY city").all().map(r => r.city);
    const statusCounts = db.prepare("SELECT status, COUNT(*) as count FROM jobs GROUP BY status").all();

    res.json({ data: jobs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)), cities, statusCounts });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch jobs", details: err.message });
  }
});

// GET /api/jobs/stats
router.get("/stats", (_req, res) => {
  try {
    const total = db.prepare("SELECT COUNT(*) as c FROM jobs").get().c;
    const unscheduled = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'Unscheduled'").get().c;
    const completed = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'Completed'").get().c;
    const byCity = db.prepare("SELECT city, COUNT(*) as count FROM jobs GROUP BY city ORDER BY count DESC LIMIT 10").all();
    const byType = db.prepare("SELECT type, COUNT(*) as count FROM jobs GROUP BY type ORDER BY count DESC").all();
    res.json({ total, unscheduled, completed, inProgress: total - unscheduled - completed, byCity, byType });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/jobs/:id
router.get("/:id", (req, res) => {
  try {
    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

// POST /api/jobs
router.post("/", validate(jobSchema), (req, res) => {
  try {
    const { wo, account, type, description, status, substatus, city, zip, priority } = req.body;
    const coords = getCoords(city);

    const existing = db.prepare("SELECT id FROM jobs WHERE wo = ?").get(wo);
    if (existing) return res.status(409).json({ error: "Work order number already exists" });

    const result = db.prepare(
      "INSERT INTO jobs (wo, account, type, description, status, substatus, city, zip, latitude, longitude, priority) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
    ).run(wo, account, type, description, status, substatus, city, zip, coords?.[0], coords?.[1], priority || 0);

    logAudit("job", result.lastInsertRowid, "created", { wo, account });
    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: "Failed to create job", details: err.message });
  }
});

// PUT /api/jobs/:id
router.put("/:id", validate(jobUpdateSchema), (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Job not found" });

    const updates = { ...existing, ...req.body };
    const coords = getCoords(updates.city);
    db.prepare(
      "UPDATE jobs SET wo=?, account=?, type=?, description=?, status=?, substatus=?, city=?, zip=?, latitude=?, longitude=?, priority=?, updated_at=datetime('now') WHERE id=?"
    ).run(updates.wo, updates.account, updates.type, updates.description, updates.status,
      updates.substatus, updates.city, updates.zip, coords?.[0], coords?.[1], updates.priority || 0, req.params.id);

    logAudit("job", req.params.id, "updated", req.body);
    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: "Failed to update job", details: err.message });
  }
});

// DELETE /api/jobs/:id
router.delete("/:id", (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Job not found" });

    db.prepare("DELETE FROM assignments WHERE job_id = ?").run(req.params.id);
    db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
    logAudit("job", req.params.id, "deleted", { wo: existing.wo });
    res.json({ message: "Job deleted", id: parseInt(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete job", details: err.message });
  }
});

// POST /api/jobs/import — CSV/XLSX file upload
router.post("/import", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const content = fs.readFileSync(req.file.path, "utf-8");
    fs.unlinkSync(req.file.path);

    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      return res.status(400).json({ error: "CSV parsing errors", details: parsed.errors.slice(0, 10) });
    }

    const results = { imported: 0, skipped: 0, errors: [] };
    const insert = db.prepare(
      "INSERT OR IGNORE INTO jobs (wo, account, type, description, status, substatus, city, zip, latitude, longitude) VALUES (?,?,?,?,?,?,?,?,?,?)"
    );

    const importAll = db.transaction(() => {
      for (const row of parsed.data) {
        const wo = row["Work Order Number"] || row["wo"] || row["WO"] || row["WO#"] || "";
        const account = row["Service Account"] || row["account"] || row["Account"] || "";
        const type = row["Work Order Type"] || row["type"] || row["Type"] || "Quoted";
        const desc = row["Short Description"] || row["description"] || row["Description"] || "";
        const status = row["System Status"] || row["status"] || row["Status"] || "Unscheduled";
        const substatus = row["Substatus"] || row["substatus"] || "";
        const city = row["City"] || row["city"] || "";
        const zip = row["Zipcode"] || row["zip"] || row["Zip"] || "";

        if (!wo || !account || !city) {
          results.skipped++;
          results.errors.push({ row: wo || "unknown", reason: "Missing required fields" });
          continue;
        }

        const coords = getCoords(city);
        const r = insert.run(wo, account, type, desc, status, substatus, city, zip, coords?.[0], coords?.[1]);
        if (r.changes > 0) results.imported++;
        else { results.skipped++; results.errors.push({ row: wo, reason: "Duplicate WO number" }); }
      }
    });
    importAll();

    logAudit("jobs", null, "bulk_import", { imported: results.imported, skipped: results.skipped });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Import failed", details: err.message });
  }
});

module.exports = router;
