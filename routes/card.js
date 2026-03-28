const router = require("express").Router();
const Card = require("../models/Card");
const auth = require("../middleware/auth");
const { requireFeature } = require("../middleware/planGate");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

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
  const map = {
    "minimal-white": {
      front: { bg1: "#ffffff", bg2: "#f5f7ff", text: "#0f172a", sub: "#475569", accent: "#0f172a" },
      back: { bg1: "#0f172a", bg2: "#111827", text: "#e2e8f0", sub: "#cbd5e1", accent: "#0f172a" },
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
}

function drawGradientBg(doc, w, h, c1, c2) {
  const g = doc.linearGradient(0, 0, w, h);
  g.stop(0, c1);
  g.stop(1, c2);
  doc.save();
  doc.rect(0, 0, w, h).fill(g);
  doc.restore();
}

function drawSplitBg(doc, w, h, left, right, at = 0.5) {
  const x = Math.round(w * at);
  doc.save();
  doc.rect(0, 0, x, h).fill(left);
  doc.rect(x, 0, w - x, h).fill(right);
  doc.restore();
}

router.get("/", auth, requireFeature("hasCard"), async (req, res) => {
  try {
    let card = await Card.findOne({ userId: req.user._id });

    if (!card) {
      card = await Card.create({
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        template: "luxury-dark-gold",
      });
    }

    res.json({ card });
  } catch (err) {
    console.error("Get card error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/", auth, requireFeature("hasCard"), async (req, res) => {
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

    if (template !== undefined && !ALLOWED_TEMPLATES.has(template)) {
      return res.status(400).json({ error: "Invalid template id" });
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
    console.error("Update card error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/pdf", auth, requireFeature("hasCard"), async (req, res) => {
  try {
    const card = await Card.findOne({ userId: req.user._id });
    if (!card) {
      return res.status(404).json({ error: "Card not found. Create one first." });
    }

    const baseUrl = process.env.BASE_URL || "https://linkshub-lake.vercel.app";
    const profileUrl = `${baseUrl}/${req.user.username}`;

    const qrDataUrl = await QRCode.toDataURL(profileUrl, {
      width: 300,
      margin: 1,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

    const W = 350;
    const H = 200;

    const doc = new PDFDocument({
      size: [W, H],
      margin: 0,
      autoFirstPage: true,
    });

    const safeName = sanitizeFilename(card.name || card.brandName || "business");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${safeName}-card.pdf`
    );

    doc.pipe(res);

    const theme = getPdfTheme(card.template);

    // FRONT
    if (theme.front.split) {
      drawSplitBg(doc, W, H, theme.front.bg1, theme.front.bg2, theme.front.splitAt || 0.5);
    } else {
      drawGradientBg(doc, W, H, theme.front.bg1, theme.front.bg2);
    }

    const displayName = card.brandName || card.name || "Your Brand";
    const displaySub = card.brandName ? (card.tagline || "") : (card.role || "");
    const initial = displayName.charAt(0).toUpperCase();

    const iconSize = 34;
    const iconX = (W - iconSize) / 2;
    const iconY = 22;

    doc.save();
    doc.fillOpacity(0.18);
    doc.roundedRect(iconX, iconY, iconSize, iconSize, 8).fill(theme.front.accent);
    doc.restore();

    doc.save();
    doc.lineWidth(1.2);
    doc.strokeOpacity(0.45);
    doc.roundedRect(iconX, iconY, iconSize, iconSize, 8).stroke(theme.front.accent);
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(17).fillColor(theme.front.accent);
    doc.text(initial, iconX, iconY + 8, {
      width: iconSize,
      align: "center",
      lineBreak: false,
    });

    const nameY = iconY + iconSize + 14;
    doc.font("Helvetica-Bold").fontSize(16).fillColor(theme.front.accent);
    doc.text(displayName.toUpperCase(), 0, nameY, {
      width: W,
      align: "center",
      lineBreak: false,
      characterSpacing: 1.3,
    });

    if (displaySub) {
      doc.font("Helvetica-Oblique").fontSize(10).fillColor(theme.front.text);
      doc.text(displaySub, 0, nameY + 22, {
        width: W,
        align: "center",
        lineBreak: false,
      });
    }

    const lineW = 60;
    const lineY = displaySub ? nameY + 38 : nameY + 24;

    doc.save();
    doc.fillOpacity(0.5);
    doc.rect((W - lineW) / 2, lineY, lineW, 1).fill(theme.front.accent);
    doc.restore();

    if (card.brandName && (card.name || card.role)) {
      const parts = [card.name, card.role].filter(Boolean).join("  ·  ");
      doc.font("Helvetica").fontSize(8).fillColor(theme.front.sub);
      doc.text(parts, 0, H - 26, {
        width: W,
        align: "center",
        lineBreak: false,
      });
    }

    // BACK
    doc.addPage({ size: [W, H], margin: 0 });
    drawGradientBg(doc, W, H, theme.back.bg1, theme.back.bg2);

    const items = [];
    if (card.phone) items.push({ icon: "P", label: "Phone Number :", value: card.phone });
    if (card.website) items.push({ icon: "W", label: "Website :", value: card.website });
    if (card.email) items.push({ icon: "E", label: "Email Address :", value: card.email });
    if (card.location) items.push({ icon: "A", label: "Address :", value: card.location });

    const leftX = 20;
    const circleR = 9;
    const itemGap = 38;
    const totalH = items.length > 0 ? (items.length - 1) * itemGap + 22 : 0;
    const startY = Math.max(18, (H - totalH) / 2);

    items.forEach((item, i) => {
      const y = startY + i * itemGap;
      const cx = leftX + circleR;
      const cy = y + circleR;

      doc.save();
      doc.fillOpacity(0.28);
      doc.circle(cx, cy, circleR).fill(theme.back.accent);
      doc.restore();

      doc.save();
      doc.strokeOpacity(0.45);
      doc.lineWidth(0.5);
      doc.circle(cx, cy, circleR).stroke(theme.back.accent);
      doc.restore();

      doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
      doc.text(item.icon, cx - circleR, cy - 5, {
        width: circleR * 2,
        align: "center",
        lineBreak: false,
      });

      const textX = leftX + circleR * 2 + 8;
      doc.font("Helvetica").fontSize(7).fillColor(theme.back.sub);
      doc.text(item.label, textX, y, { width: 140, lineBreak: false });

      doc.font("Helvetica-Bold").fontSize(9).fillColor(theme.back.text);
      doc.text(item.value, textX, y + 10, { width: 140, lineBreak: false });
    });

    const qrBoxX = 208;
    const qrBoxY = 16;
    const qrBoxW = 125;
    const qrBoxH = 145;

    doc.save();
    doc.fillOpacity(0.18);
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 12).fill(theme.back.accent);
    doc.restore();

    doc.save();
    doc.strokeOpacity(0.35);
    doc.lineWidth(0.5);
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 12).stroke(theme.back.accent);
    doc.restore();

    const qrOuterPad = 12;
    const qrWhiteSize = qrBoxW - qrOuterPad * 2;
    const qrWhiteX = qrBoxX + qrOuterPad;
    const qrWhiteY = qrBoxY + qrOuterPad;

    doc.save();
    doc.roundedRect(qrWhiteX, qrWhiteY, qrWhiteSize, qrWhiteSize, 8).fill("#ffffff");
    doc.restore();

    const qrImagePad = 8;
    const qrImageSize = qrWhiteSize - qrImagePad * 2;

    doc.image(qrBuffer, qrWhiteX + qrImagePad, qrWhiteY + qrImagePad, {
      width: qrImageSize,
      height: qrImageSize,
    });

    const logoSize = 18;
    const logoX = qrWhiteX + (qrWhiteSize - logoSize) / 2;
    const logoY = qrWhiteY + (qrWhiteSize - logoSize) / 2;

    doc.save();
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 4).fill(theme.back.accent);
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
    doc.text("L", logoX, logoY + 4.5, {
      width: logoSize,
      align: "center",
      lineBreak: false,
    });

    const scanY = qrWhiteY + qrWhiteSize + 8;
    doc.font("Helvetica").fontSize(9).fillColor(theme.back.text);
    doc.text("Scan Me", qrBoxX, scanY, {
      width: qrBoxW,
      align: "center",
      lineBreak: false,
    });

    if (card.brandName) {
      doc.save();
      doc.fillOpacity(0.55);
      doc.font("Helvetica").fontSize(7).fillColor(theme.back.sub);
      doc.text(card.brandName, qrBoxX, H - 18, {
        width: qrBoxW,
        align: "center",
        lineBreak: false,
      });
      doc.restore();
    }

    doc.end();
  } catch (err) {
    console.error("PDF generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  }
});

module.exports = router;