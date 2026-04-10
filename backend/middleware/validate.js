const { z } = require("zod");

// ── Schemas ─────────────────────────────────────────────────────────────
const technicianSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  location: z.string().min(1, "Location is required").max(100),
  available: z.boolean().optional().default(true),
});

const jobSchema = z.object({
  wo: z.string().min(1, "Work order number is required").max(50),
  account: z.string().min(1, "Account name is required").max(200),
  type: z.enum(["Quoted", "Warranty", "Internal T&M", "External T&M", "Equipment/Startup"]),
  description: z.string().max(500).optional().default(""),
  status: z.enum(["Unscheduled", "Completed", "In Progress"]),
  substatus: z.string().max(100).optional().default(""),
  city: z.string().min(1, "City is required").max(100),
  zip: z.string().max(10).optional().default(""),
  priority: z.number().int().min(0).max(10).optional().default(0),
});

const jobUpdateSchema = jobSchema.partial();
const techUpdateSchema = technicianSchema.partial();

// ── Middleware factory ──────────────────────────────────────────────────
function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: err.errors.map(e => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }
      next(err);
    }
  };
}

// ── Sanitize input strings ──────────────────────────────────────────────
function sanitize(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    for (const [key, val] of Object.entries(req.body)) {
      if (typeof val === "string") {
        req.body[key] = val.replace(/<[^>]*>/g, "").trim();
      }
    }
  }
  next();
}

module.exports = {
  technicianSchema, jobSchema, jobUpdateSchema, techUpdateSchema,
  validate, sanitize,
};
