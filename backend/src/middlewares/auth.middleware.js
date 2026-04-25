const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ message: "Missing or invalid Authorization header." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) return res.status(401).json({ message: "User not found." });

    req.user = user; // attach logged-in user
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized." });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: not allowed." });
    }
    next();
  };
};