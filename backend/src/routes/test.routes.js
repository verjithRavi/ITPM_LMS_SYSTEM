const router = require("express").Router();
const { Chat, Message } = require("../models/Chat");
const User = require("../models/User");

// Test endpoint to check database state
router.get("/chats", async (req, res) => {
  try {
    // Check if any chats exist
    const totalChats = await Chat.countDocuments();
    const totalMessages = await Message.countDocuments();
    const totalUsers = await User.countDocuments();
    
    // Get all chats without auth for testing
    const allChats = await Chat.find({})
      .populate("participants.user", "fullName email userId role")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 });
    
    res.json({
      stats: {
        totalChats,
        totalMessages,
        totalUsers
      },
      chats: allChats
    });
  } catch (error) {
    console.error("Test endpoint error:", error);
    res.status(500).json({ message: "Test endpoint failed" });
  }
});

module.exports = router;
