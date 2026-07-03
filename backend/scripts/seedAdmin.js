/**
 * Run once to create an admin login for the dashboard:
 *   npm run seed-admin
 * Uses ADMIN_SEED_USERNAME / ADMIN_SEED_PASSWORD from .env.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

async function main() {
  await connectDB();

  const username = process.env.ADMIN_SEED_USERNAME || "admin";
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!password) {
    console.error("Set ADMIN_SEED_PASSWORD in .env before seeding.");
    process.exit(1);
  }

  const existing = await User.findOne({ username });
  if (existing) {
    console.log(`User "${username}" already exists. Nothing to do.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ username, passwordHash });

  console.log(`Created admin user "${username}". You can now log in from the dashboard.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
