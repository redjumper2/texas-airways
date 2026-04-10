const express = require("express");
const router = express.Router();
const { db, logAudit } = require("../database");

// ── Distance calculation (Haversine) ────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Multi-factor scoring ────────────────────────────────────────────────
function scoreAssignment(tech, job, techLoad, maxLoad) {
  const distance = haversine(tech.latitude, tech.longitude, job.latitude, job.longitude);
  const load = techLoad[tech.id] || 0;

  // Weights
  const W_DISTANCE = 1.0;
  const W_LOAD = 8.0;
  const W_PRIORITY = -2.0; // negative = higher priority jobs score lower (better)

  // Normalize distance (0-100 mile range)
  const distScore = Math.min(distance / 100, 1) * 100;

  // Load balance penalty (exponential to strongly discourage overloading)
  const loadScore = (load / Math.max(maxLoad, 1)) * 100;

  // Priority bonus (higher priority = lower score = assigned first)
  const priorityScore = (job.priority || 0) * 10;

  return {
    distance,
    totalScore: (distScore * W_DISTANCE) + (loadScore * W_LOAD) + (priorityScore * W_PRIORITY),
  };
}

// ── Region definitions ──────────────────────────────────────────────────
const REGIONS = {
  "Austin Metro": ["austin", "westlake"],
  "Round Rock / Cedar Park": ["round rock", "cedar park", "pflugerville"],
  "Georgetown / Jarrell": ["georgetown", "jarrell"],
  "Hutto / Taylor / Thrall": ["hutto", "taylor", "thrall"],
  "Kyle / Buda / San Marcos": ["kyle", "buda", "san marcos"],
  "Bastrop / Elgin / Lockhart": ["bastrop", "elgin", "lockhart", "luling"],
  "Waco / Temple / Killeen": ["waco", "temple", "killeen", "copperas cove", "ft. cavazos", "fort cavazos", "robinson"],
  "Other": [],
};

function getRegion(city) {
  const c = city.toLowerCase();
  for (const [region, cities] of Object.entries(REGIONS)) {
    if (region === "Other") continue;
    if (cities.includes(c)) return region;
  }
  return "Other";
}

// GET /api/schedule — generate optimized schedule
router.get("/", (_req, res) => {
  try {
    const techs = db.prepare("SELECT * FROM technicians WHERE available = 1").all();
    const jobs = db.prepare("SELECT * FROM jobs WHERE status = 'Unscheduled'").all();

    if (techs.length === 0) return res.json({ assignments: [], stats: { totalJobs: jobs.length, assigned: 0 }, regions: {} });

    // Sort jobs by priority descending (high priority first)
    jobs.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const techLoad = {};
    techs.forEach(t => { techLoad[t.id] = 0; });
    const maxLoad = Math.ceil(jobs.length / techs.length);
    const assignments = [];

    for (const job of jobs) {
      let bestTech = null;
      let bestScore = Infinity;
      let bestDist = 0;

      for (const tech of techs) {
        const { distance, totalScore } = scoreAssignment(tech, job, techLoad, maxLoad);
        if (totalScore < bestScore) {
          bestScore = totalScore;
          bestTech = tech;
          bestDist = distance;
        }
      }

      if (bestTech) {
        assignments.push({
          technician: { id: bestTech.id, name: bestTech.name, location: bestTech.location },
          job: {
            id: job.id, wo: job.wo, account: job.account, type: job.type,
            description: job.description, city: job.city, zip: job.zip,
            substatus: job.substatus, priority: job.priority || 0,
          },
          distance: Math.round(bestDist * 10) / 10,
          region: getRegion(job.city),
        });
        techLoad[bestTech.id]++;
      }
    }

    // Group by region
    const regions = {};
    for (const a of assignments) {
      if (!regions[a.region]) regions[a.region] = [];
      regions[a.region].push(a);
    }

    // Sort each region by distance
    for (const r of Object.values(regions)) {
      r.sort((a, b) => a.distance - b.distance);
    }

    // Tech workload summary
    const techSummary = techs.map(t => ({
      id: t.id,
      name: t.name,
      location: t.location,
      jobCount: techLoad[t.id] || 0,
      jobs: assignments.filter(a => a.technician.id === t.id)
        .sort((a, b) => a.distance - b.distance),
    })).filter(t => t.jobCount > 0).sort((a, b) => b.jobCount - a.jobCount);

    // Stats
    const distances = assignments.map(a => a.distance);
    const stats = {
      totalJobs: jobs.length,
      assigned: assignments.length,
      availableTechs: techs.length,
      avgDistance: distances.length ? Math.round(distances.reduce((a, b) => a + b, 0) / distances.length * 10) / 10 : 0,
      maxDistance: distances.length ? Math.max(...distances) : 0,
      minDistance: distances.length ? Math.min(...distances) : 0,
    };

    res.json({ assignments, regions, techSummary, stats });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate schedule", details: err.message });
  }
});

// POST /api/schedule/save — persist current assignments
router.post("/save", (req, res) => {
  try {
    const { assignments } = req.body;
    if (!Array.isArray(assignments)) return res.status(400).json({ error: "Invalid assignments" });

    const save = db.transaction(() => {
      db.prepare("DELETE FROM assignments").run();
      const insert = db.prepare("INSERT INTO assignments (technician_id, job_id, distance_miles) VALUES (?, ?, ?)");
      for (const a of assignments) {
        insert.run(a.technician.id, a.job.id, a.distance);
      }
    });
    save();

    logAudit("schedule", null, "saved", { count: assignments.length });
    res.json({ message: "Schedule saved", count: assignments.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to save schedule", details: err.message });
  }
});

// GET /api/schedule/audit — recent audit log
router.get("/audit", (_req, res) => {
  try {
    const logs = db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100").all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

module.exports = router;
