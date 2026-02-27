# 🚀 LinkPage Backend — Complete Guide

> Node.js + Express + PostgreSQL backend for the LinkPage creator platform.
> This guide contains every file, the database schema, and instructions to connect with the Lovable frontend.

---

## 📁 Folder Structure

```
backend/
├── .env.example
├── .gitignore
├── package.json
├── server.js                    # Entry point
├── config/
│   └── db.js                    # PostgreSQL pool
├── middleware/
│   ├── auth.js                  # JWT verification
│   ├── validate.js              # Zod schema validation
│   └── errorHandler.js          # Global error handler
├── routes/
│   ├── auth.routes.js           # POST /api/auth/*
│   ├── profile.routes.js        # GET/PUT /api/profile
│   ├── links.routes.js          # CRUD /api/links
│   ├── analytics.routes.js      # GET /api/analytics/*
│   ├── appearance.routes.js     # GET/PUT /api/appearance
│   ├── pdfcard.routes.js        # GET/PUT /api/pdf-card
│   └── public.routes.js         # GET /api/public/:username (no auth)
├── controllers/
│   ├── auth.controller.js
│   ├── profile.controller.js
│   ├── links.controller.js
│   ├── analytics.controller.js
│   ├── appearance.controller.js
│   ├── pdfcard.controller.js
│   └── public.controller.js
├── schemas/                     # Zod validation schemas
│   ├── auth.schema.js
│   ├── link.schema.js
│   ├── profile.schema.js
│   ├── appearance.schema.js
│   └── pdfcard.schema.js
├── utils/
│   ├── token.js                 # JWT sign/verify helpers
│   └── upload.js                # Multer config for file uploads
└── migrations/
    └── 001_initial_schema.sql   # Full database schema
```

---

## 📦 package.json

```json
{
  "name": "linkpage-backend",
  "version": "1.0.0",
  "description": "Backend API for LinkPage creator platform",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "psql $DATABASE_URL -f migrations/001_initial_schema.sql"
  },
  "dependencies": {
    "express": "^4.21.0",
    "pg": "^8.13.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.23.8",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "multer": "^1.4.5-lts.1",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "nodemailer": "^6.9.15"
  },
  "devDependencies": {
    "nodemon": "^3.1.7"
  }
}
```

---

## 🗄️ Database Schema — `migrations/001_initial_schema.sql`

```sql
-- ============================================================
-- LinkPage Database Schema
-- Run: psql $DATABASE_URL -f migrations/001_initial_schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------
-- 1. USERS — authentication & account
-- -------------------------------------------------------
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  UNIQUE,          -- public URL slug
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- -------------------------------------------------------
-- 2. PROFILES — public profile data
-- -------------------------------------------------------
CREATE TABLE profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio         TEXT DEFAULT '',
  location    VARCHAR(100) DEFAULT '',
  avatar_url  VARCHAR(500) DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 3. LINKS — the core link items
-- -------------------------------------------------------
CREATE TABLE links (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  url        VARCHAR(2000) NOT NULL,
  enabled    BOOLEAN DEFAULT TRUE,
  position   INTEGER DEFAULT 0,              -- drag-and-drop order
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_links_user ON links(user_id);

-- -------------------------------------------------------
-- 4. ANALYTICS_EVENTS — page views & link clicks
-- -------------------------------------------------------
CREATE TABLE analytics_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  link_id    UUID REFERENCES links(id) ON DELETE SET NULL,  -- NULL = page view
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('view', 'click', 'qr_scan')),
  referrer   VARCHAR(500) DEFAULT '',
  user_agent VARCHAR(500) DEFAULT '',
  ip_address VARCHAR(45)  DEFAULT '',
  country    VARCHAR(100) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_user      ON analytics_events(user_id);
CREATE INDEX idx_analytics_created   ON analytics_events(created_at);
CREATE INDEX idx_analytics_type      ON analytics_events(event_type);

-- -------------------------------------------------------
-- 5. APPEARANCE_SETTINGS — profile page customization
-- -------------------------------------------------------
CREATE TABLE appearance_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accent_color    VARCHAR(20) DEFAULT '#6366f1',
  bg_style        VARCHAR(20) DEFAULT 'solid',   -- solid | gradient | mesh
  font_family     VARCHAR(50) DEFAULT 'Inter',
  button_radius   VARCHAR(10) DEFAULT 'md',      -- sm | md | lg | full
  dark_mode       BOOLEAN DEFAULT FALSE,
  show_avatar     BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 6. PDF_CARD_SETTINGS — business card configuration
-- -------------------------------------------------------
CREATE TABLE pdf_card_settings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template   VARCHAR(20) DEFAULT 'classic',   -- classic | minimal | bold | elegant
  theme      VARCHAR(20) DEFAULT 'coral',
  name       VARCHAR(100) DEFAULT '',
  title      VARCHAR(100) DEFAULT '',
  email      VARCHAR(255) DEFAULT '',
  phone      VARCHAR(50)  DEFAULT '',
  website    VARCHAR(500) DEFAULT '',
  bio        VARCHAR(300) DEFAULT '',
  photo_url  VARCHAR(500) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 7. NOTIFICATION_PREFERENCES
-- -------------------------------------------------------
CREATE TABLE notification_preferences (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_weekly      BOOLEAN DEFAULT TRUE,
  click_alerts      BOOLEAN DEFAULT FALSE,
  security_alerts   BOOLEAN DEFAULT TRUE,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ⚙️ Config & Utilities

### `.env.example`

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/linkpage
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=./uploads
```

### `config/db.js`

```js
/**
 * PostgreSQL connection pool.
 * Uses DATABASE_URL from environment.
 */
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Test connection on startup
pool.query("SELECT NOW()")
  .then(() => console.log("✅ Database connected"))
  .catch((err) => console.error("❌ Database connection failed:", err.message));

module.exports = pool;
```

### `utils/token.js`

```js
const jwt = require("jsonwebtoken");

/**
 * Sign a JWT with user payload.
 * @param {{ id: string, email: string }} user
 * @returns {string} signed token
 */
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/**
 * Verify and decode a JWT.
 * @param {string} token
 * @returns {{ id: string, email: string }}
 */
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
```

### `utils/upload.js`

```js
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || "./uploads");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  cb(null, allowed.includes(file.mimetype));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB

module.exports = upload;
```

---

## 🛡️ Middleware

### `middleware/auth.js`

```js
const { verifyToken } = require("../utils/token");

/**
 * Protect routes — extracts user from Authorization header.
 * Usage: router.get("/profile", auth, controller)
 */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(header.split(" ")[1]);
    req.user = decoded; // { id, email }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = auth;
```

### `middleware/validate.js`

```js
/**
 * Factory that returns Express middleware for Zod schema validation.
 * @param {import("zod").ZodSchema} schema
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res.status(400).json({ error: "Validation failed", details: errors });
    }
    req.body = result.data; // use cleaned data
    next();
  };
}

module.exports = validate;
```

### `middleware/errorHandler.js`

```js
/**
 * Global error handler — catches unhandled errors.
 */
function errorHandler(err, req, res, _next) {
  console.error("❌ Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
}

module.exports = errorHandler;
```

---

## 📋 Validation Schemas

### `schemas/auth.schema.js`

```js
const { z } = require("zod");

const registerSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email"),
});

module.exports = { registerSchema, loginSchema, forgotPasswordSchema };
```

### `schemas/link.schema.js`

```js
const { z } = require("zod");

const createLinkSchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: z.string().trim().url("Invalid URL").max(2000),
  enabled: z.boolean().optional().default(true),
  position: z.number().int().optional().default(0),
});

const updateLinkSchema = createLinkSchema.partial();

const reorderSchema = z.object({
  order: z.array(z.object({
    id: z.string().uuid(),
    position: z.number().int(),
  })),
});

module.exports = { createLinkSchema, updateLinkSchema, reorderSchema };
```

### `schemas/profile.schema.js`

```js
const { z } = require("zod");

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1).max(100).optional(),
  username: z.string().trim().min(3).max(50).regex(/^[a-z0-9_-]+$/, "Lowercase letters, numbers, hyphens only").optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(128),
});

module.exports = { updateProfileSchema, changePasswordSchema };
```

### `schemas/appearance.schema.js`

```js
const { z } = require("zod");

const appearanceSchema = z.object({
  accent_color: z.string().max(20).optional(),
  bg_style: z.enum(["solid", "gradient", "mesh"]).optional(),
  font_family: z.string().max(50).optional(),
  button_radius: z.enum(["sm", "md", "lg", "full"]).optional(),
  dark_mode: z.boolean().optional(),
  show_avatar: z.boolean().optional(),
});

module.exports = { appearanceSchema };
```

### `schemas/pdfcard.schema.js`

```js
const { z } = require("zod");

const pdfCardSchema = z.object({
  template: z.enum(["classic", "minimal", "bold", "elegant"]).optional(),
  theme: z.enum(["coral", "ocean", "forest", "midnight", "rose", "violet"]).optional(),
  name: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  website: z.string().max(500).optional(),
  bio: z.string().max(300).optional(),
});

module.exports = { pdfCardSchema };
```

---

## 🎮 Controllers

### `controllers/auth.controller.js`

```js
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { signToken } = require("../utils/token");

/**
 * POST /api/auth/register
 * Creates user + profile + default settings rows.
 */
async function register(req, res, next) {
  try {
    const { full_name, email, password } = req.body;

    // Check if email exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at`,
      [full_name, email, password_hash]
    );
    const user = userResult.rows[0];

    // Create related default rows
    await Promise.all([
      pool.query("INSERT INTO profiles (user_id) VALUES ($1)", [user.id]),
      pool.query("INSERT INTO appearance_settings (user_id) VALUES ($1)", [user.id]),
      pool.query("INSERT INTO pdf_card_settings (user_id, name, email) VALUES ($1, $2, $3)", [user.id, full_name, email]),
      pool.query("INSERT INTO notification_preferences (user_id) VALUES ($1)", [user.id]),
    ]);

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT id, email, full_name, password_hash FROM users WHERE email = $1",
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 * In production, send an email with a reset link.
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    // Always return success to prevent email enumeration
    // TODO: Generate reset token, save to DB, send email via nodemailer
    res.json({ message: "If an account exists, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, forgotPassword };
```

### `controllers/profile.controller.js`

```js
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

/** GET /api/profile */
async function getProfile(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.username, 
              p.bio, p.location, p.avatar_url,
              n.email_weekly, n.click_alerts, n.security_alerts
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       LEFT JOIN notification_preferences n ON n.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/profile */
async function updateProfile(req, res, next) {
  try {
    const { full_name, username, bio, location } = req.body;

    if (username) {
      const taken = await pool.query("SELECT id FROM users WHERE username = $1 AND id != $2", [username, req.user.id]);
      if (taken.rows.length > 0) return res.status(409).json({ error: "Username already taken" });
    }

    await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), username = COALESCE($2, username), updated_at = NOW() WHERE id = $3`,
      [full_name, username, req.user.id]
    );
    await pool.query(
      `UPDATE profiles SET bio = COALESCE($1, bio), location = COALESCE($2, location), updated_at = NOW() WHERE user_id = $3`,
      [bio, location, req.user.id]
    );

    res.json({ message: "Profile updated" });
  } catch (err) {
    next(err);
  }
}

/** POST /api/profile/avatar — multipart upload */
async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const avatar_url = `/uploads/${req.file.filename}`;
    await pool.query("UPDATE profiles SET avatar_url = $1, updated_at = NOW() WHERE user_id = $2", [avatar_url, req.user.id]);
    res.json({ avatar_url });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/profile/password */
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hash, req.user.id]);
    res.json({ message: "Password changed" });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/profile/notifications */
async function updateNotifications(req, res, next) {
  try {
    const { email_weekly, click_alerts, security_alerts } = req.body;
    await pool.query(
      `UPDATE notification_preferences 
       SET email_weekly = COALESCE($1, email_weekly),
           click_alerts = COALESCE($2, click_alerts),
           security_alerts = COALESCE($3, security_alerts),
           updated_at = NOW()
       WHERE user_id = $4`,
      [email_weekly, click_alerts, security_alerts, req.user.id]
    );
    res.json({ message: "Notification preferences updated" });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/profile/account */
async function deleteAccount(req, res, next) {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.user.id]);
    res.json({ message: "Account deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, uploadAvatar, changePassword, updateNotifications, deleteAccount };
```

### `controllers/links.controller.js`

```js
const pool = require("../config/db");

/** GET /api/links */
async function getLinks(req, res, next) {
  try {
    const result = await pool.query(
      "SELECT * FROM links WHERE user_id = $1 ORDER BY position ASC, created_at DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

/** POST /api/links */
async function createLink(req, res, next) {
  try {
    const { title, url, enabled, position } = req.body;
    const result = await pool.query(
      `INSERT INTO links (user_id, title, url, enabled, position)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, title, url, enabled, position]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/links/:id */
async function updateLink(req, res, next) {
  try {
    const { title, url, enabled, position } = req.body;
    const result = await pool.query(
      `UPDATE links SET 
        title = COALESCE($1, title), url = COALESCE($2, url),
        enabled = COALESCE($3, enabled), position = COALESCE($4, position),
        updated_at = NOW()
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [title, url, enabled, position, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Link not found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/links/:id */
async function deleteLink(req, res, next) {
  try {
    const result = await pool.query(
      "DELETE FROM links WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Link not found" });
    res.json({ message: "Link deleted" });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/links/reorder */
async function reorderLinks(req, res, next) {
  try {
    const { order } = req.body; // [{ id, position }]
    const queries = order.map(({ id, position }) =>
      pool.query("UPDATE links SET position = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3", [position, id, req.user.id])
    );
    await Promise.all(queries);
    res.json({ message: "Links reordered" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getLinks, createLink, updateLink, deleteLink, reorderLinks };
```

### `controllers/analytics.controller.js`

```js
const pool = require("../config/db");

/** GET /api/analytics/overview */
async function getOverview(req, res, next) {
  try {
    const userId = req.user.id;
    const [views, clicks, qrScans, linkCount] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'view'", [userId]),
      pool.query("SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'click'", [userId]),
      pool.query("SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'qr_scan'", [userId]),
      pool.query("SELECT COUNT(*) FROM links WHERE user_id = $1", [userId]),
    ]);

    res.json({
      total_views: parseInt(views.rows[0].count),
      total_clicks: parseInt(clicks.rows[0].count),
      total_qr_scans: parseInt(qrScans.rows[0].count),
      total_links: parseInt(linkCount.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/analytics/chart?range=7d|4w|6m */
async function getChartData(req, res, next) {
  try {
    const range = req.query.range || "7d";
    let interval, groupBy;

    switch (range) {
      case "4w": interval = "28 days"; groupBy = "DATE_TRUNC('week', created_at)"; break;
      case "6m": interval = "180 days"; groupBy = "DATE_TRUNC('month', created_at)"; break;
      default:   interval = "7 days";  groupBy = "DATE(created_at)"; break;
    }

    const result = await pool.query(
      `SELECT ${groupBy} AS date,
              COUNT(*) FILTER (WHERE event_type = 'view') AS views,
              COUNT(*) FILTER (WHERE event_type = 'click') AS clicks
       FROM analytics_events
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY ${groupBy}
       ORDER BY date ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/analytics/top-links */
async function getTopLinks(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT l.title, l.url, COUNT(a.id) AS clicks
       FROM analytics_events a
       JOIN links l ON l.id = a.link_id
       WHERE a.user_id = $1 AND a.event_type = 'click'
       GROUP BY l.id, l.title, l.url
       ORDER BY clicks DESC LIMIT 10`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/analytics/sources */
async function getSources(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT COALESCE(NULLIF(referrer, ''), 'Direct') AS source, COUNT(*) AS count
       FROM analytics_events
       WHERE user_id = $1 AND event_type = 'view'
       GROUP BY source ORDER BY count DESC LIMIT 6`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverview, getChartData, getTopLinks, getSources };
```

### `controllers/appearance.controller.js`

```js
const pool = require("../config/db");

/** GET /api/appearance */
async function getAppearance(req, res, next) {
  try {
    const result = await pool.query("SELECT * FROM appearance_settings WHERE user_id = $1", [req.user.id]);
    res.json(result.rows[0] || {});
  } catch (err) {
    next(err);
  }
}

/** PUT /api/appearance */
async function updateAppearance(req, res, next) {
  try {
    const { accent_color, bg_style, font_family, button_radius, dark_mode, show_avatar } = req.body;
    await pool.query(
      `UPDATE appearance_settings SET
        accent_color = COALESCE($1, accent_color),
        bg_style = COALESCE($2, bg_style),
        font_family = COALESCE($3, font_family),
        button_radius = COALESCE($4, button_radius),
        dark_mode = COALESCE($5, dark_mode),
        show_avatar = COALESCE($6, show_avatar),
        updated_at = NOW()
       WHERE user_id = $7`,
      [accent_color, bg_style, font_family, button_radius, dark_mode, show_avatar, req.user.id]
    );
    res.json({ message: "Appearance updated" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAppearance, updateAppearance };
```

### `controllers/pdfcard.controller.js`

```js
const pool = require("../config/db");

/** GET /api/pdf-card */
async function getPdfCard(req, res, next) {
  try {
    const result = await pool.query("SELECT * FROM pdf_card_settings WHERE user_id = $1", [req.user.id]);
    res.json(result.rows[0] || {});
  } catch (err) {
    next(err);
  }
}

/** PUT /api/pdf-card */
async function updatePdfCard(req, res, next) {
  try {
    const { template, theme, name, title, email, phone, website, bio } = req.body;
    await pool.query(
      `UPDATE pdf_card_settings SET
        template = COALESCE($1, template), theme = COALESCE($2, theme),
        name = COALESCE($3, name), title = COALESCE($4, title),
        email = COALESCE($5, email), phone = COALESCE($6, phone),
        website = COALESCE($7, website), bio = COALESCE($8, bio),
        updated_at = NOW()
       WHERE user_id = $9`,
      [template, theme, name, title, email, phone, website, bio, req.user.id]
    );
    res.json({ message: "PDF card settings updated" });
  } catch (err) {
    next(err);
  }
}

/** POST /api/pdf-card/photo — multipart upload */
async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const photo_url = `/uploads/${req.file.filename}`;
    await pool.query("UPDATE pdf_card_settings SET photo_url = $1, updated_at = NOW() WHERE user_id = $2", [photo_url, req.user.id]);
    res.json({ photo_url });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPdfCard, updatePdfCard, uploadPhoto };
```

### `controllers/public.controller.js`

```js
const pool = require("../config/db");

/**
 * GET /api/public/:username
 * No auth required — serves the public link page.
 * Also records a 'view' event.
 */
async function getPublicPage(req, res, next) {
  try {
    const { username } = req.params;

    const userResult = await pool.query(
      `SELECT u.id, u.full_name, u.username, p.bio, p.location, p.avatar_url
       FROM users u JOIN profiles p ON p.user_id = u.id
       WHERE u.username = $1`,
      [username]
    );
    if (userResult.rows.length === 0) return res.status(404).json({ error: "Page not found" });

    const user = userResult.rows[0];

    const [links, appearance] = await Promise.all([
      pool.query("SELECT id, title, url FROM links WHERE user_id = $1 AND enabled = TRUE ORDER BY position ASC", [user.id]),
      pool.query("SELECT * FROM appearance_settings WHERE user_id = $1", [user.id]),
    ]);

    // Record page view
    await pool.query(
      `INSERT INTO analytics_events (user_id, event_type, referrer, user_agent, ip_address)
       VALUES ($1, 'view', $2, $3, $4)`,
      [user.id, req.headers.referer || "", req.headers["user-agent"] || "", req.ip]
    );

    res.json({
      profile: user,
      links: links.rows,
      appearance: appearance.rows[0] || {},
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/public/:username/click
 * Records a link click event.
 */
async function recordClick(req, res, next) {
  try {
    const { username } = req.params;
    const { link_id } = req.body;

    const userResult = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: "Page not found" });

    await pool.query(
      `INSERT INTO analytics_events (user_id, link_id, event_type, referrer, user_agent, ip_address)
       VALUES ($1, $2, 'click', $3, $4, $5)`,
      [userResult.rows[0].id, link_id, req.headers.referer || "", req.headers["user-agent"] || "", req.ip]
    );
    res.json({ message: "Click recorded" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPublicPage, recordClick };
```

---

## 🛣️ Routes

### `routes/auth.routes.js`

```js
const router = require("express").Router();
const { register, login, forgotPassword } = require("../controllers/auth.controller");
const validate = require("../middleware/validate");
const { registerSchema, loginSchema, forgotPasswordSchema } = require("../schemas/auth.schema");

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

module.exports = router;
```

### `routes/profile.routes.js`

```js
const router = require("express").Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const upload = require("../utils/upload");
const { updateProfileSchema, changePasswordSchema } = require("../schemas/profile.schema");
const ctrl = require("../controllers/profile.controller");

router.get("/", auth, ctrl.getProfile);
router.put("/", auth, validate(updateProfileSchema), ctrl.updateProfile);
router.post("/avatar", auth, upload.single("avatar"), ctrl.uploadAvatar);
router.put("/password", auth, validate(changePasswordSchema), ctrl.changePassword);
router.put("/notifications", auth, ctrl.updateNotifications);
router.delete("/account", auth, ctrl.deleteAccount);

module.exports = router;
```

### `routes/links.routes.js`

```js
const router = require("express").Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createLinkSchema, updateLinkSchema, reorderSchema } = require("../schemas/link.schema");
const ctrl = require("../controllers/links.controller");

router.get("/", auth, ctrl.getLinks);
router.post("/", auth, validate(createLinkSchema), ctrl.createLink);
router.put("/reorder", auth, validate(reorderSchema), ctrl.reorderLinks);
router.put("/:id", auth, validate(updateLinkSchema), ctrl.updateLink);
router.delete("/:id", auth, ctrl.deleteLink);

module.exports = router;
```

### `routes/analytics.routes.js`

```js
const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/analytics.controller");

router.get("/overview", auth, ctrl.getOverview);
router.get("/chart", auth, ctrl.getChartData);
router.get("/top-links", auth, ctrl.getTopLinks);
router.get("/sources", auth, ctrl.getSources);

module.exports = router;
```

### `routes/appearance.routes.js`

```js
const router = require("express").Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { appearanceSchema } = require("../schemas/appearance.schema");
const ctrl = require("../controllers/appearance.controller");

router.get("/", auth, ctrl.getAppearance);
router.put("/", auth, validate(appearanceSchema), ctrl.updateAppearance);

module.exports = router;
```

### `routes/pdfcard.routes.js`

```js
const router = require("express").Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const upload = require("../utils/upload");
const { pdfCardSchema } = require("../schemas/pdfcard.schema");
const ctrl = require("../controllers/pdfcard.controller");

router.get("/", auth, ctrl.getPdfCard);
router.put("/", auth, validate(pdfCardSchema), ctrl.updatePdfCard);
router.post("/photo", auth, upload.single("photo"), ctrl.uploadPhoto);

module.exports = router;
```

### `routes/public.routes.js`

```js
const router = require("express").Router();
const ctrl = require("../controllers/public.controller");

// No auth — public endpoints
router.get("/:username", ctrl.getPublicPage);
router.post("/:username/click", ctrl.recordClick);

module.exports = router;
```

---

## 🚀 Server Entry Point — `server.js`

```js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// --------------- Middleware ---------------
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --------------- Routes ---------------
app.use("/api/auth",       require("./routes/auth.routes"));
app.use("/api/profile",    require("./routes/profile.routes"));
app.use("/api/links",      require("./routes/links.routes"));
app.use("/api/analytics",  require("./routes/analytics.routes"));
app.use("/api/appearance", require("./routes/appearance.routes"));
app.use("/api/pdf-card",   require("./routes/pdfcard.routes"));
app.use("/api/public",     require("./routes/public.routes"));

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

// --------------- Error Handler ---------------
app.use(errorHandler);

// --------------- Start ---------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
```

---

## 🔗 Frontend Integration Guide

### Step 1: Create an API client

Create `src/lib/api.ts` in your Lovable frontend:

```ts
const API_BASE = "https://your-backend-url.com/api";

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  // Auth
  register: (data: any) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login:    (data: any) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  // Profile
  getProfile:     () => request("/profile"),
  updateProfile:  (data: any) => request("/profile", { method: "PUT", body: JSON.stringify(data) }),

  // Links
  getLinks:    () => request("/links"),
  createLink:  (data: any) => request("/links", { method: "POST", body: JSON.stringify(data) }),
  updateLink:  (id: string, data: any) => request(`/links/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLink:  (id: string) => request(`/links/${id}`, { method: "DELETE" }),

  // Analytics
  getOverview:  () => request("/analytics/overview"),
  getChart:     (range: string) => request(`/analytics/chart?range=${range}`),
  getTopLinks:  () => request("/analytics/top-links"),

  // Appearance
  getAppearance:    () => request("/appearance"),
  updateAppearance: (data: any) => request("/appearance", { method: "PUT", body: JSON.stringify(data) }),

  // PDF Card
  getPdfCard:    () => request("/pdf-card"),
  updatePdfCard: (data: any) => request("/pdf-card", { method: "PUT", body: JSON.stringify(data) }),
};
```

### Step 2: Files to update in the frontend

| Frontend File | Changes Needed |
|---|---|
| `LoginPage.tsx` | Replace `setTimeout` → `api.login()`, store token in localStorage, redirect to `/dashboard` |
| `RegisterPage.tsx` | Replace `setTimeout` → `api.register()`, store token, redirect |
| `ForgotPasswordPage.tsx` | Replace `setTimeout` → `api.forgotPassword()` |
| `LinksPage.tsx` | Replace `useState(initialLinks)` → `useQuery` + `api.getLinks()`, mutations for CRUD |
| `DashboardPage.tsx` | Replace hardcoded stats → `useQuery` + `api.getOverview()` + `api.getTopLinks()` |
| `AnalyticsPage.tsx` | Replace mock data → `useQuery` + `api.getChart(range)` + `api.getSources()` |
| `AppearancePage.tsx` | Load saved settings → `api.getAppearance()`, save → `api.updateAppearance()` |
| `SettingsPage.tsx` | Load profile → `api.getProfile()`, save → `api.updateProfile()` |
| `PdfCardPage.tsx` | Load settings → `api.getPdfCard()`, save → `api.updatePdfCard()` |
| `PublicLinkPage.tsx` | Fetch from `api.getPublicPage(username)`, track clicks |

### Step 3: Deploy the backend

```bash
# 1. Clone/create your backend project
mkdir linkpage-backend && cd linkpage-backend

# 2. Copy all files from this guide

# 3. Install dependencies
npm install

# 4. Set up PostgreSQL and run migrations
psql $DATABASE_URL -f migrations/001_initial_schema.sql

# 5. Create .env from .env.example

# 6. Start
npm run dev

# 7. Deploy to Railway / Render / Fly.io / Vercel
```

---

## 📝 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Login |
| POST | `/api/auth/forgot-password` | ❌ | Request reset |
| GET | `/api/profile` | ✅ | Get profile |
| PUT | `/api/profile` | ✅ | Update profile |
| POST | `/api/profile/avatar` | ✅ | Upload avatar |
| PUT | `/api/profile/password` | ✅ | Change password |
| PUT | `/api/profile/notifications` | ✅ | Update notification prefs |
| DELETE | `/api/profile/account` | ✅ | Delete account |
| GET | `/api/links` | ✅ | List all links |
| POST | `/api/links` | ✅ | Create link |
| PUT | `/api/links/:id` | ✅ | Update link |
| DELETE | `/api/links/:id` | ✅ | Delete link |
| PUT | `/api/links/reorder` | ✅ | Reorder links |
| GET | `/api/analytics/overview` | ✅ | Stats summary |
| GET | `/api/analytics/chart?range=` | ✅ | Time-series data |
| GET | `/api/analytics/top-links` | ✅ | Top performing links |
| GET | `/api/analytics/sources` | ✅ | Traffic sources |
| GET | `/api/appearance` | ✅ | Get settings |
| PUT | `/api/appearance` | ✅ | Update settings |
| GET | `/api/pdf-card` | ✅ | Get card settings |
| PUT | `/api/pdf-card` | ✅ | Update card settings |
| POST | `/api/pdf-card/photo` | ✅ | Upload card photo |
| GET | `/api/public/:username` | ❌ | Public link page |
| POST | `/api/public/:username/click` | ❌ | Record click |
| GET | `/api/health` | ❌ | Health check |
