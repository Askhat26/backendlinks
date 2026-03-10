const PLAN_LIMITS = {
  starter: {
    maxLinks: 5,
    themes: ['neon-cyber', 'glass-morph', 'minimal-creator', 'creator-dark', 'minimal-mono'],
    layouts: ['classic-glass', 'minimal', 'bordered'],
    hasCard: false,
    hasQR: false,
    hasAdvancedAnalytics: false,
    showBranding: true,
  },
  pro: {
    maxLinks: Infinity,
    themes: 'all',
    layouts: 'all',
    hasCard: true,
    hasQR: true,
    hasAdvancedAnalytics: true,
    showBranding: false,
  },
  premium: {
    maxLinks: Infinity,
    themes: 'all',
    layouts: 'all',
    hasCard: true,
    hasQR: true,
    hasAdvancedAnalytics: true,
    showBranding: false,
  },
};

function requireFeature(feature) {
  return (req, res, next) => {
    const limits = PLAN_LIMITS[req.user.plan] || PLAN_LIMITS.starter;
    if (!limits[feature]) {
      return res.status(403).json({
        error: `Feature "${feature}" requires a plan upgrade`,
        currentPlan: req.user.plan,
      });
    }
    next();
  };
}

function getLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
}

module.exports = { requireFeature, getLimits, PLAN_LIMITS };