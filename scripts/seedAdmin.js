require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const email = 'admin@linkora.com';
  const existing = await User.findOne({ email });

  if (existing) {
    existing.role = 'admin';
    existing.plan = 'premium';
    await existing.save();
    console.log('Updated existing user to admin:', existing.email);
  } else {
    const admin = await User.create({
      name: 'Admin',
      email,
      username: 'admin',
      password: 'Admin@12345', // change after first login
      role: 'admin',
      plan: 'premium',
    });
    console.log('Created admin:', admin.email);
  }

  await mongoose.disconnect();
  process.exit(0);
})();