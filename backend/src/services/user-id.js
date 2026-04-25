const User = require("../models/User");

const ROLE_PREFIX = {
  STUDENT: "S",
  TUTOR: "T",
  ADMIN: "A",
};

async function generateNextUserId(role) {
  const prefix = ROLE_PREFIX[role];
  if (!prefix) throw new Error("Invalid role.");

  const latestUser = await User.findOne({
    userId: { $regex: `^${prefix}[0-9]{5}$` },
  })
    .sort({ userId: -1 })
    .select("userId");

  const latestNumber = latestUser ? Number(latestUser.userId.slice(1)) : 0;
  const nextNumber = latestNumber + 1;

  if (nextNumber > 99999) {
    throw new Error(`User ID limit reached for role ${role}.`);
  }

  return `${prefix}${String(nextNumber).padStart(5, "0")}`;
}

async function createUserWithGeneratedId(payload) {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const userId = await generateNextUserId(payload.role);

    try {
      return await User.create({
        ...payload,
        userId,
      });
    } catch (err) {
      if (err?.code === 11000 && err?.keyPattern?.userId) {
        continue;
      }
      throw err;
    }
  }

  throw new Error("Could not generate a unique user ID. Please try again.");
}

module.exports = {
  createUserWithGeneratedId,
  generateNextUserId,
};
