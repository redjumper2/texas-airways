const express = require("express");
const router = express.Router();
const { db, getCoords, logAudit } = require("../database");
const { validate, technicianSchema, techUpdateSchema } = require("../middleware/validate");

// GET /api/technicians — list all, with optional search
router.get("/", (req, res) => {
  try {
    const { search, available, location, page = 1, limit = 100 } = req.query;
    let sql = "SELECT * FROM technicians WHERE 1=1";
    const params = [];

    if (search) {
      sql += " AND (name LIKE ? OR location LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (available !== undefined) {
      sql += " AND available = ?";
      params.push(available === "true" ? 1 : 0);
    }
    if (location) {
      sql += " AND location = ?";
      params.push(location);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as total");
    const total = db.prepare(countSql).get(...params).total;

    sql += " ORDER BY name ASC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const techs = db.prepare(sql).all(...params);
    res.json({
      data: techs.map(t => ({ ...t, available: !!t.available })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch technicians", details: err.message });
  }
});

// GET /api/technicians/:id
router.get("/:id", (req, res) => {
  try {
    const tech = db.prepare("SELECT * FROM technicians WHERE id = ?").get(req.params.id);
    if (!tech) return res.status(404).json({ error: "Technician not found" });
    res.json({ ...tech, available: !!tech.available });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch technician", details: err.message });
  }
});

// POST /api/technicians
router.post("/", validate(technicianSchema), (req, res) => {
  try {
    const { name, location, available } = req.body;
    const coords = getCoords(location);
    const result = db.prepare(
      "INSERT INTO technicians (name, location, latitude, longitude, available) VALUES (?, ?, ?, ?, ?)"
    ).run(name, location, coords ? coords[0] : null, coords ? coords[1] : null, available ? 1 : 0);

    logAudit("technician", result.lastInsertRowid, "created", { name, location });

    const tech = db.prepare("SELECT * FROM technicians WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ ...tech, available: !!tech.available });
  } catch (err) {
    res.status(500).json({ error: "Failed to create technician", details: err.message });
  }
});

// PUT /api/technicians/:id
router.put("/:id", validate(techUpdateSchema), (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM technicians WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Technician not found" });

    const updates = { ...existing, ...req.body };
    const coords = getCoords(updates.location);
    db.prepare(
      "UPDATE technicians SET name=?, location=?, latitude=?, longitude=?, available=?, updated_at=datetime('now') WHERE id=?"
    ).run(updates.name, updates.location, coords ? coords[0] : null, coords ? coords[1] : null,
      updates.available ? 1 : 0, req.params.id);

    logAudit("technician", req.params.id, "updated", req.body);

    const tech = db.prepare("SELECT * FROM technicians WHERE id = ?").get(req.params.id);
    res.json({ ...tech, available: !!tech.available });
  } catch (err) {
    res.status(500).json({ error: "Failed to update technician", details: err.message });
  }
});

// DELETE /api/technicians/:id
router.delete("/:id", (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM technicians WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Technician not found" });

    db.prepare("DELETE FROM technicians WHERE id = ?").run(req.params.id);
    logAudit("technician", req.params.id, "deleted", { name: existing.name });

    res.json({ message: "Technician deleted", id: parseInt(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete technician", details: err.message });
  }
});

// GET /api/technicians/locations/list — unique locations
router.get("/locations/list", (_req, res) => {
  try {
    const locs = db.prepare("SELECT DISTINCT location FROM technicians ORDER BY location").all();
    res.json(locs.map(l => l.location));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

module.exports = router;
