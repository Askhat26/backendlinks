const router = require('express').Router();
const Card = require('../models/Card'); 
const auth = require('../middleware/auth');
const { requireFeature } = require('../middleware/planGate');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const ALLOWED_TEMPLATES = new Set([
  "minimal-white",
  "premium-black",
  "luxury-dark-gold",
  "geometric-dark",
  "split-modern",
  "gradient-glass",
  "corporate-blue",
  "neon-creator",
  "startup-founder",
  "creative-designer",
  "soft-pastel",
  "elegant-gold",
  "ruby-gradient",
  "tech-dark",
  "midnight-aurora",
]);

function sanitizeFilename(name = "business") {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getPdfTheme(templateId) {
  // Basic themes for PDF (PDFKit can't replicate all CSS patterns)
  const map = {
    "minimal-white": {
      front: { bg1: "#ffffff", bg2: "#f5f7ff", text: "#0f172a", sub: "#475569", accent: "#0f172a" },
      back:  { bg1: "#0f172a", bg2: "#111827", text: "#e2e8f0", sub: "#cbd5e1", accent: "#ffffff" },
    },
    "premium-black": {
      front: { bg1: "#05070d", bg2: "#07101f", text: "#f5d37a", sub: "#d6c28c", accent: "#d4a853" },
      back:  { bg1: "#05070d", bg2: "#07101f", text: "#f5d37a", sub: "#d6c28c", accent: "#d4a853" },
    },
    "luxury-dark-gold": {
      front: { bg1: "#06070c", bg2: "#0b1020", text: "#f0d28a", sub: "#cbb57a", accent: "#d4a853" },
      back:  { bg1: "#06070c", bg2: "#0b1020", text: "#f0d28a", sub: "#cbb57a", accent: "#d4a853" },
    },
    "geometric-dark": {
      front: { bg1: "#030712", bg2: "#050b14", text: "#ffffff", sub: "#cbd5e1", accent: "#22d3ee" },
      back:  { bg1: "#030712", bg2: "#050b14", text: "#ffffff", sub: "#cbd5e1", accent: "#22d3ee" },
    },
    "split-modern": {
      front: { bg1: "#ffffff", bg2: "#081823", text: "#0f172a", sub: "#475569", accent: "#f97316", split: true },
      back:  { bg1: "#081823", bg2: "#0b2130", text: "#ffffff", sub: "#cbd5e1", accent: "#f97316" },
    },
    "gradient-glass": {
      front: { bg1: "#02100e", bg2: "#041312", text: "#ffffff", sub: "#d1fae5", accent: "#22c55e" },
      back:  { bg1: "#02100e", bg2: "#041312", text: "#ffffff", sub: "#d1fae5", accent: "#22c55e" },
    },
    "corporate-blue": {
      front: { bg1: "#facc15", bg2: "#1f232a", text: "#111827", sub: "#334155", accent: "#facc15", split: true, splitAt: 0.45 },
      back:  { bg1: "#1f232a", bg2: "#2b2f36", text: "#ffffff", sub: "#d4d4d8", accent: "#facc15" },
    },
    "neon-creator": {
      front: { bg1: "#1a1a1a", bg2: "#ffffff", text: "#0f172a", sub: "#475569", accent: "#d4a853", split: true, splitAt: 0.62 },
      back:  { bg1: "#0b1020", bg2: "#111827", text: "#ffffff", sub: "#cbd5e1", accent: "#d4a853" },
    },
    "startup-founder": {
      front: { bg1: "#031018", bg2: "#071b24", text: "#f5e9d0", sub: "#d9c8a2", accent: "#c9a46b" },
      back:  { bg1: "#031018", bg2: "#071b24", text: "#f5e9d0", sub: "#d9c8a2", accent: "#c9a46b" },
    },
    "creative-designer": {
      front: { bg1: "#ffffff", bg2: "#fbfdff", text: "#0f172a", sub: "#475569", accent: "#22c55e" },
      back:  { bg1: "#0f172a", bg2: "#111827", text: "#ffffff", sub: "#cbd5e1", accent: "#22c55e" },
    },
    "soft-pastel": {
      front: { bg1: "#ffffff", bg2: "#ffe6ee", text: "#b04b63", sub: "#c06a80", accent: "#e65a7a" },
      back:  { bg1: "#fff4f7", bg2: "#ffe6ee", text: "#b04b63", sub: "#c06a80", accent: "#e65a7a" },
    },
    "elegant-gold": {
      front: { bg1: "#f5d28b", bg2: "#e3b768", text: "#0b2b3a", sub: "#1f3e4d", accent: "#d4a853" },
      back:  { bg1: "#071a24", bg2: "#0b2b3a", text: "#ffffff", sub: "#cbd5e1", accent: "#d4a853" },
    },
    "ruby-gradient": {
      front: { bg1: "#0b1220", bg2: "#111827", text: "#ffffff", sub: "#e2e8f0", accent: "#ef4444" },
      back:  { bg1: "#0a0f1a", bg2: "#0b1220", text: "#ffffff", sub: "#e2e8f0", accent: "#ef4444" },
    },
    "tech-dark": {
      front: { bg1: "#050505", bg2: "#0b0b0b", text: "#d4a853", sub: "#c9b17a", accent: "#d4a853" },
      back:  { bg1: "#050505", bg2: "#0b0b0b", text: "#d4a853", sub: "#c9b17a", accent: "#d4a853" },
    },
    "midnight-aurora": {
      front: { bg1: "#120a22", bg2: "#1a1230", text: "#f5d37a", sub: "#e7d3a2", accent: "#f5d37a" },
      back:  { bg1: "#120a22", bg2: "#1a1230", text: "#f5d37a", sub: "#e7d3a2", accent: "#f5d37a" },
    },
  };

  return map[templateId] || map["minimal-white"];
}

function drawGradientBackground(doc, w, h, bg1, bg2) {
  const g = doc.linearGradient(0, 0, w, h);
  g.stop(0, bg1);
  g.stop(1, bg2);
  doc.save();
  doc.rect(0, 0, w, h).fill(g);
  doc.restore();
}

function drawSplitBackground(doc, w, h, leftColor, rightColor, splitAt = 0.5) {
  const splitX = Math.round(w * splitAt);
  doc.save();
  doc.rect(0, 0, splitX, h).fill(leftColor);
  doc.rect(splitX, 0, w - splitX, h).fill(rightColor);
  doc.restore();
}

// Get business card (Pro/Premium only)
router.get('/', auth, requireFeature('hasCard'), async (req, res) => {
  try {
    let card = await Card.findOne({ userId: req.user._id });

    if (!card) {
      card = await Card.create({
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        template: "luxury-dark-gold", // optional default
      });
    }

    res.json({ card });
  } catch (err) {
    console.error('Get card error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update business card (Pro/Premium only)
router.put('/', auth, requireFeature('hasCard'), async (req, res) => {
  try {
    const {
      name,
      role,
      phone,
      email,
      website,
      location,
      template,
      brandName,
      tagline,
    } = req.body;

    // Optional backend validation for template
    if (template !== undefined && !ALLOWED_TEMPLATES.has(template)) {
      return res.status(400).json({ error: 'Invalid template id' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (location !== undefined) updateData.location = location;
    if (template !== undefined) updateData.template = template;
    if (brandName !== undefined) updateData.brandName = brandName;
    if (tagline !== undefined) updateData.tagline = tagline;

    const card = await Card.findOneAndUpdate(
      { userId: req.user._id },
      updateData,
      { new: true, upsert: true }
    );

    res.json({ card });
  } catch (err) {
    console.error('Update card error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Download business card as PDF with QR code (Pro/Premium only)
router.get('/pdf', auth, requireFeature('hasCard'), async (req, res) => {
  try {
    const card = await Card.findOne({ userId: req.user._id });
    if (!card) {
      return res.status(404).json({ error: 'Card not found. Create one first.' });
    }

    const profileUrl = `${process.env.BASE_URL}/${req.user.username}`;
    const qrDataUrl = await QRCode.toDataURL(profileUrl, {
      width: 200,
      margin: 1,
    });

    const WIDTH = 350;
    const HEIGHT = 200;

    const doc = new PDFDocument({
      size: [WIDTH, HEIGHT],
      margin: 0,
      autoFirstPage: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${(card.name || 'business')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .toLowerCase()}-card.pdf`
    );

    doc.pipe(res);

    const getPdfTheme = (templateId) => {
      const map = {
        "minimal-white": {
          front: { bg1: "#ffffff", bg2: "#f5f7ff", text: "#0f172a", sub: "#475569", accent: "#0f172a" },
          back: { bg1: "#0f172a", bg2: "#111827", text: "#e2e8f0", sub: "#cbd5e1", accent: "#ffffff" },
        },
        "premium-black": {
          front: { bg1: "#05070d", bg2: "#07101f", text: "#f5d37a", sub: "#d6c28c", accent: "#d4a853" },
          back: { bg1: "#05070d", bg2: "#07101f", text: "#f5d37a", sub: "#d6c28c", accent: "#d4a853" },
        },
        "luxury-dark-gold": {
          front: { bg1: "#06070c", bg2: "#0b1020", text: "#f0d28a", sub: "#cbb57a", accent: "#d4a853" },
          back: { bg1: "#06070c", bg2: "#0b1020", text: "#f0d28a", sub: "#cbb57a", accent: "#d4a853" },
        },
        "geometric-dark": {
          front: { bg1: "#030712", bg2: "#050b14", text: "#ffffff", sub: "#cbd5e1", accent: "#22d3ee" },
          back: { bg1: "#030712", bg2: "#050b14", text: "#ffffff", sub: "#cbd5e1", accent: "#22d3ee" },
        },
        "split-modern": {
          front: { bg1: "#ffffff", bg2: "#081823", text: "#0f172a", sub: "#475569", accent: "#f97316", split: true, splitAt: 0.38 },
          back: { bg1: "#081823", bg2: "#0b2130", text: "#ffffff", sub: "#cbd5e1", accent: "#f97316" },
        },
        "gradient-glass": {
          front: { bg1: "#02100e", bg2: "#041312", text: "#ffffff", sub: "#d1fae5", accent: "#22c55e" },
          back: { bg1: "#02100e", bg2: "#041312", text: "#ffffff", sub: "#d1fae5", accent: "#22c55e" },
        },
        "corporate-blue": {
          front: { bg1: "#facc15", bg2: "#1f232a", text: "#111827", sub: "#334155", accent: "#facc15", split: true, splitAt: 0.45 },
          back: { bg1: "#1f232a", bg2: "#2b2f36", text: "#ffffff", sub: "#d4d4d8", accent: "#facc15" },
        },
        "neon-creator": {
          front: { bg1: "#1a1a1a", bg2: "#ffffff", text: "#0f172a", sub: "#475569", accent: "#d4a853", split: true, splitAt: 0.62 },
          back: { bg1: "#0b1020", bg2: "#111827", text: "#ffffff", sub: "#cbd5e1", accent: "#d4a853" },
        },
        "startup-founder": {
          front: { bg1: "#031018", bg2: "#071b24", text: "#f5e9d0", sub: "#d9c8a2", accent: "#c9a46b" },
          back: { bg1: "#031018", bg2: "#071b24", text: "#f5e9d0", sub: "#d9c8a2", accent: "#c9a46b" },
        },
        "creative-designer": {
          front: { bg1: "#ffffff", bg2: "#fbfdff", text: "#0f172a", sub: "#475569", accent: "#22c55e" },
          back: { bg1: "#0f172a", bg2: "#111827", text: "#ffffff", sub: "#cbd5e1", accent: "#22c55e" },
        },
        "soft-pastel": {
          front: { bg1: "#ffffff", bg2: "#ffe6ee", text: "#b04b63", sub: "#c06a80", accent: "#e65a7a" },
          back: { bg1: "#fff4f7", bg2: "#ffe6ee", text: "#b04b63", sub: "#c06a80", accent: "#e65a7a" },
        },
        "elegant-gold": {
          front: { bg1: "#f5d28b", bg2: "#e3b768", text: "#0b2b3a", sub: "#1f3e4d", accent: "#d4a853" },
          back: { bg1: "#071a24", bg2: "#0b2b3a", text: "#ffffff", sub: "#cbd5e1", accent: "#d4a853" },
        },
        "ruby-gradient": {
          front: { bg1: "#0b1220", bg2: "#111827", text: "#ffffff", sub: "#e2e8f0", accent: "#ef4444" },
          back: { bg1: "#0a0f1a", bg2: "#0b1220", text: "#ffffff", sub: "#e2e8f0", accent: "#ef4444" },
        },
        "tech-dark": {
          front: { bg1: "#050505", bg2: "#0b0b0b", text: "#d4a853", sub: "#c9b17a", accent: "#d4a853" },
          back: { bg1: "#050505", bg2: "#0b0b0b", text: "#d4a853", sub: "#c9b17a", accent: "#d4a853" },
        },
        "midnight-aurora": {
          front: { bg1: "#120a22", bg2: "#1a1230", text: "#f5d37a", sub: "#e7d3a2", accent: "#f5d37a" },
          back: { bg1: "#120a22", bg2: "#1a1230", text: "#f5d37a", sub: "#e7d3a2", accent: "#f5d37a" },
        },
      };

      return map[templateId] || map["minimal-white"];
    };

    const drawGradientBackground = (doc, w, h, bg1, bg2) => {
      const g = doc.linearGradient(0, 0, w, h);
      g.stop(0, bg1);
      g.stop(1, bg2);
      doc.save();
      doc.rect(0, 0, w, h).fill(g);
      doc.restore();
    };

    const drawSplitBackground = (doc, w, h, leftColor, rightColor, splitAt = 0.5) => {
      const splitX = Math.round(w * splitAt);
      doc.save();
      doc.rect(0, 0, splitX, h).fill(leftColor);
      doc.rect(splitX, 0, w - splitX, h).fill(rightColor);
      doc.restore();
    };

    const theme = getPdfTheme(card.template);

    // ================= FRONT PAGE =================
    if (theme.front.split) {
      drawSplitBackground(doc, WIDTH, HEIGHT, theme.front.bg1, theme.front.bg2, theme.front.splitAt || 0.5);
    } else {
      drawGradientBackground(doc, WIDTH, HEIGHT, theme.front.bg1, theme.front.bg2);
    }

    const left = 20;
    let y = 18;

    if (card.brandName) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.front.text);
      doc.text(card.brandName, left, y, { width: 140, lineBreak: false });
      y += 14;
    }

    if (card.tagline) {
      doc.font('Helvetica').fontSize(8).fillColor(theme.front.sub);
      doc.text(card.tagline, left, y, { width: 150, lineBreak: false });
      y += 18;
    } else {
      y += 8;
    }

    doc.font('Helvetica-Bold').fontSize(18).fillColor(theme.front.text);
    doc.text(card.name || '', left, 60, { width: 180, lineBreak: false });

    doc.font('Helvetica').fontSize(9).fillColor(theme.front.sub);
    doc.text(card.role || '', left, 82, { width: 180, lineBreak: false });

    doc.save();
    doc.rect(left, 100, 110, 2).fill(theme.front.accent);
    doc.restore();

    let infoY = 112;
    doc.font('Helvetica').fontSize(8).fillColor(theme.front.sub);

    if (card.phone) {
      doc.text(`Phone: ${card.phone}`, left, infoY, { width: 200, lineBreak: false });
      infoY += 14;
    }
    if (card.email) {
      doc.text(`Email: ${card.email}`, left, infoY, { width: 220, lineBreak: false });
      infoY += 14;
    }
    if (card.website) {
      doc.text(`Web: ${card.website}`, left, infoY, { width: 220, lineBreak: false });
      infoY += 14;
    }
    if (card.location) {
      doc.text(`Location: ${card.location}`, left, infoY, { width: 240, lineBreak: false });
    }

    // ================= BACK PAGE =================
    doc.addPage({ size: [WIDTH, HEIGHT], margin: 0 });

    drawGradientBackground(doc, WIDTH, HEIGHT, theme.back.bg1, theme.back.bg2);

    if (card.brandName) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(theme.back.sub);
      doc.text(card.brandName, 100, 12, {
        width: 150,
        align: 'center',
        lineBreak: false,
      });
    }

    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // White QR holder
    doc.save();
    doc.roundedRect(95, 30, 160, 140, 12).fill('#ffffff');
    doc.restore();

    doc.image(qrBuffer, 115, 40, { width: 120, height: 120 });

    doc.font('Helvetica').fontSize(9).fillColor(theme.back.sub);
    doc.text('Scan to open profile', 90, 176, {
      width: 170,
      align: 'center',
      lineBreak: false,
    });

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;