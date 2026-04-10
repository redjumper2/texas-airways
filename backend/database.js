const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "db", "texas_airsystems.db");
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS technicians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    available INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wo TEXT UNIQUE,
    account TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Quoted',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Unscheduled',
    substatus TEXT,
    city TEXT NOT NULL,
    zip TEXT,
    latitude REAL,
    longitude REAL,
    priority INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    technician_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    distance_miles REAL,
    assigned_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,
    entity_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_zip ON jobs(zip);
  CREATE INDEX IF NOT EXISTS idx_techs_location ON technicians(location);
  CREATE INDEX IF NOT EXISTS idx_techs_available ON technicians(available);
  CREATE INDEX IF NOT EXISTS idx_assignments_tech ON assignments(technician_id);
  CREATE INDEX IF NOT EXISTS idx_assignments_job ON assignments(job_id);
  CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);
`);

// ── Coordinates lookup ──────────────────────────────────────────────────
const COORDS = {
  "Austin": [30.267, -97.743], "Round Rock": [30.508, -97.679],
  "Georgetown": [30.633, -97.677], "Taylor": [30.570, -97.410],
  "Hutto": [30.543, -97.547], "Pflugerville": [30.439, -97.620],
  "Cedar Park": [30.505, -97.820], "Kyle": [29.989, -97.877],
  "Buda": [30.085, -97.840], "San Marcos": [29.883, -97.941],
  "Bastrop": [30.110, -97.315], "Elgin": [30.349, -97.370],
  "Lockhart": [29.885, -97.670], "Jarrell": [30.821, -97.603],
  "Thrall": [30.608, -97.302], "Luling": [29.681, -97.649],
  "Rockdale": [30.656, -97.002], "Dripping Springs": [30.190, -98.086],
  "Dime Box": [30.358, -96.821], "Copperas Cove": [31.124, -97.903],
  "South Austin": [30.207, -97.770], "183/McNeil": [30.440, -97.760],
  "Buda/Kyle": [30.037, -97.858], "San Marcos / New Braunfels": [29.80, -97.96],
  "Waco": [31.549, -97.147], "Temple": [31.098, -97.343],
  "Killeen": [31.117, -97.728], "Westlake": [30.298, -97.808],
  "Ft. Cavazos": [31.137, -97.775], "Fort cavazos": [31.137, -97.775],
  "Kingsland": [30.659, -98.440], "Robinson": [31.468, -97.115],
  "hutto": [30.543, -97.547], "taylor": [30.570, -97.410],
  "waco": [31.549, -97.147],
};

function getCoords(location) {
  if (COORDS[location]) return COORDS[location];
  const key = Object.keys(COORDS).find(k => k.toLowerCase() === location.toLowerCase());
  return key ? COORDS[key] : null;
}

// ── Seed data ───────────────────────────────────────────────────────────
function seed() {
  const techCount = db.prepare("SELECT COUNT(*) as c FROM technicians").get().c;
  if (techCount > 0) return;

  console.log("Seeding database...");

  const insertTech = db.prepare(
    "INSERT INTO technicians (name, location, latitude, longitude, available) VALUES (?, ?, ?, ?, 1)"
  );

  const techs = [
    ["Aaron Felan", "Hutto"], ["Alvin Theis", "Thrall"], ["Andrew Aleman", "Temple"],
    ["Brady Peterson", "Taylor"], ["Brandon Schulz", "Round Rock"], ["Christian Chavez", "Kyle"],
    ["Chris Jimenez", "Taylor"], ["Collin White", "Taylor"], ["Daniel Betancourt", "Luling"],
    ["David (DJ) Johnson", "Buda/Kyle"], ["Eddie Perez", "Georgetown"], ["Egris Tuarezca", "Buda"],
    ["Emilio Argueta", "Bastrop"], ["Granger Suarez", "Bastrop"], ["Henry Oranday", "Georgetown"],
    ["Jaron Williams", "Hutto"], ["Juan Felan", "Hutto"], ["Jock Riggin", "Georgetown"],
    ["JoeVanni Hernandez", "Kyle"], ["Jose Yanez", "Lockhart"], ["Justin Burdette", "Hutto"],
    ["Keven Blair", "Thrall"], ["Kyle Green", "Jarrell"], ["Luke Hamilton", "Jarrell"],
    ["Marcus Stautz", "Rockdale"], ["Martin Velasquez", "Bastrop"], ["Mason Stifflemire", "Taylor"],
    ["Matt Speed", "Round Rock"], ["Michael Johns", "Jarrell"], ["Nick Jacobson", "Elgin"],
    ["Pedro Jaimes-Santos", "South Austin"], ["Tim House", "Kyle"], ["Rafael Velarde", "Bastrop"],
    ["Raul Rangel", "Dripping Springs"], ["Ricardo Jardine", "183/McNeil"], ["RJ Jatzlau", "Dime Box"],
    ["Tanner Faris", "San Marcos / New Braunfels"], ["Stacy Drayton", "Copperas Cove"],
    ["Zachary Vasquez", "Kyle"], ["Zion Anderson", "Taylor"],
  ];

  const insertMany = db.transaction(() => {
    for (const [name, loc] of techs) {
      const c = getCoords(loc);
      insertTech.run(name, loc, c ? c[0] : null, c ? c[1] : null);
    }
  });
  insertMany();

  const insertJob = db.prepare(
    "INSERT INTO jobs (wo, account, type, description, status, substatus, city, zip, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const jobs = [
    ["26-000086097","2422 E. 7th Street","Warranty","Warranty LG EPROM board","Unscheduled","Waiting for Parts","Austin","78701"],
    ["26-000085829","2422 E. 7th Street","Internal T&M","Replace belt/sheaves","Completed","Hold for Customer PO","Austin","78701"],
    ["26-000085427","321 W. 6th Street","Warranty","Warranty APT#5107 evaporator coil & Room 3108 reversing valve","Completed","Hold for Customer PO","Austin","78701"],
    ["26-000086125","AC Marriott Hotel Waco Downtown","Quoted","AC Marriott Waco EEV","Unscheduled","Waiting for Parts","Waco","76701"],
    ["26-000084310","Ascension Seton","Equipment/Startup","Exhaust fan VFD startup","Completed","Hold for Customer PO","Austin","78705"],
    ["26-000084771","Ascension Seton Williamson","Quoted","Humidifier Spare Parts","Completed","Hold for Customer PO","Round Rock","78665"],
    ["26-000084619","Ascension Seton Williamson","Quoted","AHU-13 PM Related Repairs","Completed","Hold for Customer PO","Round Rock","78665"],
    ["26-000084608","Ascension Seton Williamson","Quoted","AHU-15 Driver and Display Board Replacement","Completed","Hold for Customer PO","Round Rock","78665"],
    ["25-000079012","Austin Baptist Church","Quoted","RTU1-& 10 Replacement","Unscheduled","Waiting for Parts","Austin","78750"],
    ["26-000086049","Austin ISD Houston Elementary","Warranty","Low water buttons broken on boiler","Unscheduled","Waiting for Parts","Austin","78744"],
    ["26-000085918","Austin ISD Houston Elementary","Equipment/Startup","Pump & EF VFD SU","Completed","Hold for Customer PO","Austin","78744"],
    ["26-000085183","Austin ISD Houston Elementary","Equipment/Startup","AHU/VFD Startup + Boiler startup","Completed","Hold for Customer PO","Austin","78744"],
    ["26-000085369","Austin ISD Mills Elementary","Equipment/Startup","Startup HRU-1, 3, 4","Completed","Hold for Customer PO","Austin","78749"],
    ["26-000085889","B&K Tenant Improvements - Woodgate","Internal T&M","Troubleshoot on AAON RTU","Completed","Hold for Customer PO","Georgetown","78628"],
    ["26-000085177","B&K Tenant Improvements - Woodgate","Warranty","AAON RTU-1 & RTU-2 missing pressure sensors","Unscheduled","Waiting for Parts","Georgetown","78628"],
    ["25-000079730","BAE Systems","Quoted","Pump Seal Replacement","Unscheduled","Ready for Scheduling","Austin","78753"],
    ["26-000085256","Barbara Jordan Terminal","Warranty","ABB door latches","Unscheduled","Waiting for Parts","Austin","78719"],
    ["26-000085110","Barbara Jordan Terminal","Internal T&M","Inspect VFDs","Completed","Hold for Customer PO","Austin","78719"],
    ["26-000085042","Baylor Scott & White - Round Rock","Internal T&M","Paragon + VFD Troubleshoot","Completed","Hold for Customer PO","Round Rock","78665"],
    ["26-000085214","BlueSky - Samsung","External T&M","65 ton AAON is down","Completed","Hold for Customer PO","Taylor","76574"],
    ["25-000079158","Brookdale Gaines Ranch","Quoted","Brookdale Gaines Ranch work","Unscheduled","Waiting for Parts","Austin","78735"],
    ["26-000085377","Capstone Building","Quoted","Capstone Building work","Completed","Hold for Customer PO","Austin","78729"],
    ["26-000084923","Capstone Building","Quoted","Capstone Building repairs","Completed","Hold for Customer PO","Austin","78729"],
    ["25-000070077","Central Texas College","Quoted","Central Texas College HVAC","Unscheduled","Hold for Customer PO","Killeen","76540"],
    ["26-000085981","Centro North Building","Internal T&M","Centro North Building service","Completed","Hold for Customer PO","Austin","78746"],
    ["26-000083957","Charles Schwab","Quoted","Charles Schwab HVAC service","Completed","Hold for Customer PO","Westlake","76262"],
    ["26-000085426","City of Taylor Water Treatment","Quoted","Water treatment facility service","Completed","Hold for Customer PO","Taylor","76574"],
    ["26-000084794","Colorado Tower","Quoted","Colorado Tower HVAC","Completed","Hold for Customer PO","Austin","78701"],
    ["26-000085949","Del Valle Health & Wellness","Quoted","Del Valle Health service","Completed","Hold for Customer PO","Austin","78617"],
    ["26-000086150","Dell Seton Medical Center","Quoted","Dell Seton Medical HVAC","Unscheduled","Waiting for Parts","Austin","78701"],
    ["26-000083955","Edison Riverside","Quoted","Edison Riverside service","Completed","Hold for Customer PO","Austin","78741"],
    ["26-000085895","Emler Swim School - Bee Cave","Quoted","Emler Swim Bee Cave HVAC","Completed","Hold for Customer PO","Austin","78746"],
    ["26-000082410","ESO Solutions","Quoted","ESO Solutions HVAC","Completed","Hold for Customer PO","Austin","78722"],
    ["26-000086099","EVO Entertainment Hutto","Quoted","EVO Hutto HVAC service","Unscheduled","Ready for Scheduling","Hutto","78634"],
    ["26-000085795","Facebook - Heatherwilde","Quoted","Facebook Heatherwilde HVAC","Completed","Hold for Customer PO","Pflugerville","78660"],
    ["26-000085905","Fisher Residence - 5010 Amarra","Quoted","Fisher Residence service","Completed","Hold for Customer PO","Austin","78735"],
    ["26-000083491","Fort Cavazos - 91220 Block","Quoted","Fort Cavazos Block 91220","Unscheduled","Hold for Customer PO","Ft. Cavazos","76544"],
    ["26-000083286","Fort Cavazos - 91220 Block","Quoted","Fort Cavazos Block 91220","Unscheduled","Hold for Customer PO","Ft. Cavazos","76544"],
    ["26-000086142","Fort Cavazos Hammerhead - 9400","Quoted","Fort Cavazos Hammerhead","Unscheduled","Hold for Customer PO","Ft. Cavazos","76544"],
    ["26-000085811","Fort Cavazos Hammerhead - 9400","Quoted","Fort Cavazos Hammerhead","Unscheduled","Hold for Customer PO","Ft. Cavazos","76544"],
    ["26-000083830","Fort Cavazos Hammerhead - 9400","Quoted","Fort Cavazos Hammerhead","Completed","Hold for Customer PO","Ft. Cavazos","76544"],
    ["26-000084468","Green Pastures","Quoted","Green Pastures HVAC","Completed","Hold for Customer PO","Austin","78704"],
    ["26-000083678","Hotel Trinity - Autograph","Quoted","Hotel Trinity service","Completed","Hold for Customer PO","Austin","78701"],
    ["26-000086083","Hyatt Centric Congress Ave","Quoted","Hyatt Centric HVAC","Unscheduled","Ready for Scheduling","Austin","78701"],
    ["26-000085692","ICU Medical Austin","Quoted","ICU Medical Austin HVAC","Completed","Hold for Customer PO","Austin","78728"],
    ["26-000085473","ICU Medical Round Rock","Quoted","ICU Medical Round Rock HVAC","Completed","Hold for Customer PO","Round Rock","78665"],
    ["26-000083981","Kingsland School","Quoted","Kingsland School HVAC","Unscheduled","Hold for Customer PO","Kingsland","78639"],
    ["26-000085715","L3 Harris","Quoted","L3 Harris Waco HVAC","Completed","Hold for Customer PO","Waco","76705"],
    ["25-000080320","L3 Harris","Quoted","L3 Harris Waco service","Completed","Hold for Customer PO","Waco","76705"],
    ["25-000077333","Lora Reynolds Gallery","Quoted","Lora Reynolds Gallery HVAC","Completed","Hold for Customer PO","Austin","78703"],
    ["26-000085874","Nebraska Furniture Mart","Quoted","Nebraska Furniture Mart HVAC","Completed","Hold for Customer PO","Cedar Park","78613"],
    ["25-000077717","Rambler","Quoted","Rambler HVAC service","Completed","Hold for Customer PO","Austin","78705"],
    ["25-000072175","Refresco Beverages US Inc.","Quoted","Refresco Beverages HVAC","Completed","Hold for Customer PO","Waco","76712"],
    ["26-000084917","Rise Student Center","Quoted","Rise Student Center HVAC","Completed","Hold for Customer PO","Austin","78705"],
    ["26-000084869","Rise Student Center","Quoted","Rise Student Center service","Completed","Hold for Customer PO","Austin","78705"],
    ["26-000084956","Saint Edwards University","Quoted","St Edwards University HVAC","Completed","Hold for Customer PO","Austin","78704"],
    ["26-000081978","Samsung Taylor","Quoted","Samsung Taylor HVAC","Completed","Hold for Customer PO","Taylor","76574"],
    ["25-000081209","Samsung Taylor","Quoted","Samsung Taylor service","Completed","Hold for Customer PO","Taylor","76574"],
    ["26-000085938","Sharp Surgery Center","Quoted","Sharp Surgery HVAC","Completed","Hold for Customer PO","Austin","78745"],
    ["25-000079624","Skybox","Quoted","Skybox Pflugerville HVAC","Completed","Hold for Customer PO","Pflugerville","78660"],
    ["26-000085481","Skybox Hutto 1","Quoted","Skybox Hutto HVAC","Completed","Hold for Customer PO","Hutto","78634"],
    ["26-000085845","Skyloft Austin","Quoted","Skyloft Austin HVAC","Completed","Hold for Customer PO","Austin","78705"],
    ["26-000085059","Sonic Reference Laboratory","Quoted","Sonic Reference Lab HVAC","Completed","Hold for Customer PO","Austin","78728"],
    ["26-000084793","South Congress Hotel","Quoted","South Congress Hotel HVAC","Completed","Hold for Customer PO","Austin","78704"],
    ["26-000084812","St Davids North Austin Medical","Quoted","St Davids North Austin HVAC","Completed","Hold for Customer PO","Austin","78704"],
    ["25-000079824","St Edwards - Carriage House","Quoted","St Edwards Carriage House","Completed","Hold for Customer PO","Austin","78704"],
    ["25-000076924","St. Edwards - St. André Apartments","Quoted","St Edwards André Apartments","Completed","Hold for Customer PO","Austin","78704"],
    ["26-000082086","Stephen F. Austin State Office","Quoted","SFA State Office HVAC","Completed","Hold for Customer PO","Austin","78701"],
    ["26-000085921","Taylor Middle School","Quoted","Taylor Middle School HVAC","Completed","Hold for Customer PO","Taylor","76574"],
    ["26-000083872","TDEM Headquarters","Quoted","TDEM HQ HVAC service","Completed","Hold for Customer PO","Austin","78719"],
    ["25-000079565","Temple College","Quoted","Temple College HVAC","Completed","Hold for Customer PO","Temple","76504"],
    ["26-000085519","Texas State University - Athletics","Quoted","TX State Athletics HVAC","Completed","Hold for Customer PO","San Marcos","78666"],
    ["26-000085518","Texas State University - Athletics","Quoted","TX State Athletics service","Completed","Hold for Customer PO","San Marcos","78666"],
    ["26-000083705","Texas State - Bobcat Stadium","Quoted","TX State Bobcat Stadium","Completed","Hold for Customer PO","San Marcos","78666"],
    ["26-000085540","Texas State University STEM Building","Quoted","TX State STEM Building HVAC","Completed","Hold for Customer PO","San Marcos","78666"],
    ["26-000085251","Texas State - Dept of Housing","Quoted","TX State Housing HVAC","Completed","Hold for Customer PO","San Marcos","78666"],
    ["25-000077284","The Ocean Lab","Quoted","Ocean Lab HVAC","Completed","Hold for Customer PO","Austin","78705"],
    ["26-000083898","Travis County Expo Center","Quoted","Travis County Expo HVAC","Completed","Hold for Customer PO","Austin","78724"],
    ["26-000083930","TWC Trinity Building","Quoted","TWC Trinity HVAC","Completed","Hold for Customer PO","Austin","78701"],
    ["26-000084002","UT East Campus Garage","Quoted","UT East Campus HVAC","Completed","Hold for Customer PO","Austin","78722"],
    ["26-000082421","UT Montopolis Research Campus","Quoted","UT Montopolis HVAC","Completed","Hold for Customer PO","Austin","78741"],
    ["26-000085958","Waller Creek","Quoted","Waller Creek HVAC","Completed","Hold for Customer PO","Austin","78701"],
    ["26-000083032","Waller Creek","Quoted","Waller Creek service","Completed","Hold for Customer PO","Austin","78701"],
    ["26-000082038","Waller Creek","Quoted","Waller Creek repairs","Completed","Hold for Customer PO","Austin","78701"],
    ["26-000085242","Walmart Dairy Plant","Quoted","Walmart Dairy Plant HVAC","Completed","Hold for Customer PO","Robinson","76706"],
    ["26-000084932","Walmart Dairy Plant","Quoted","Walmart Dairy Plant service","Completed","Hold for Customer PO","Robinson","76706"],
    ["25-000078753","Wesco Hilltop","Quoted","Wesco Hilltop HVAC","Completed","Hold for Customer PO","Austin","78735"],
    ["26-000081991","Westlake Hills Surgery Center","Quoted","Westlake Hills Surgery HVAC","Completed","Hold for Customer PO","Austin","78746"],
    ["26-000083421","Whole Foods Distribution Center","Quoted","Whole Foods DC HVAC","Completed","Hold for Customer PO","Austin","78721"],
    ["26-000082632","Williamson County CMF Building","Quoted","Williamson Co CMF HVAC","Completed","Hold for Customer PO","Georgetown","78626"],
    ["25-000080923","Williamson County CMF Building","Quoted","Williamson Co CMF service","Completed","Hold for Customer PO","Georgetown","78626"],
  ];

  const insertJobs = db.transaction(() => {
    for (const j of jobs) {
      const c = getCoords(j[6]);
      insertJob.run(j[0], j[1], j[2], j[3], j[4], j[5], j[6], j[7], c ? c[0] : null, c ? c[1] : null);
    }
  });
  insertJobs();

  console.log(`Seeded ${techs.length} technicians and ${jobs.length} jobs`);
}

// ── Audit logging helper ────────────────────────────────────────────────
function logAudit(entity, entityId, action, details = null) {
  db.prepare("INSERT INTO audit_log (entity, entity_id, action, details) VALUES (?, ?, ?, ?)").run(
    entity, entityId, action, details ? JSON.stringify(details) : null
  );
}

seed();

module.exports = { db, getCoords, logAudit, COORDS };
