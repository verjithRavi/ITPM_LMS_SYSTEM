const router = require("express").Router();
const { Chat, Message } = require("../models/Chat");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

// Get all chats for current user
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const chats = await Chat.find({
      "participants.user": userId,
      isActive: true
    })
    .populate("participants.user", "fullName email userId role")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "fullName userId role"
      }
    })
    .sort({ lastMessageAt: -1 });

    // Calculate unread count for current user
    const chatsWithUnread = chats.map(chat => {
      const chatObj = chat.toObject();
      const userRole = chat.participants.find(p => p.user.toString() === userId)?.role;
      
      if (userRole === "STUDENT") {
        chatObj.unreadCount = chat.studentUnreadCount;
      } else if (userRole === "ADMIN") {
        chatObj.unreadCount = chat.adminUnreadCount;
      }
      
      return chatObj;
    });

    res.json(chatsWithUnread);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: "Failed to fetch chats" });
  }
});

// Get or create chat between student and admin
router.post("/start", verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only students can start chats with admins
    if (user.role !== "STUDENT") {
      return res.status(403).json({ message: "Only students can start chats" });
    }

    // Find an available admin
    const admin = await User.findOne({ role: "ADMIN" });
    if (!admin) {
      return res.status(404).json({ message: "No admin available" });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      "participants.user": { $all: [userId, admin._id] },
      isActive: true
    })
    .populate("participants.user", "fullName email userId role")
    .populate("lastMessage");

    if (!chat) {
      // Create new chat
      const participants = [
        { user: userId, role: "STUDENT" },
        { user: admin._id, role: "ADMIN" }
      ];
      
      // Validate participants
      if (participants.length !== 2) {
        return res.status(400).json({ message: "Chat must have exactly 2 participants" });
      }
      
      const participantIds = participants.map(p => p.user.toString());
      if (participantIds[0] === participantIds[1]) {
        return res.status(400).json({ message: "Chat participants must be different users" });
      }
      
      chat = new Chat({ participants });
      await chat.save();
      
      // Repopulate for response
      chat = await Chat.findById(chat._id)
        .populate("participants.user", "fullName email userId role")
        .populate({
          path: "lastMessage",
          populate: {
            path: "sender",
            select: "fullName userId role"
          }
        });
    }

    res.json(chat);
  } catch (error) {
    console.error("Error starting chat:", error);
    res.status(500).json({ message: "Failed to start chat" });
  }
});

// Get messages for a specific chat
router.get("/:chatId/messages", verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { chatId } = req.params;

    // Verify user is part of this chat
    const chat = await Chat.findOne({
      _id: chatId,
      "participants.user": userId,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const messages = await Message.find({ chat: chatId })
      .populate("sender", "fullName userId role")
      .sort({ timestamp: 1 })
      .lean();

    // Mark messages as read for current user
    const user = await User.findById(userId);
    const userRole = chat.participants.find(p => p.user.toString() === userId)?.role;
    
    await Message.updateMany(
      { 
        chat: chatId, 
        sender: { $ne: userId },
        readAt: null 
      },
      { readAt: new Date() }
    );

    // Reset unread count
    if (userRole === "STUDENT") {
      chat.studentUnreadCount = 0;
    } else if (userRole === "ADMIN") {
      chat.adminUnreadCount = 0;
    }
    await chat.save();

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Send a message
router.post("/:chatId/messages", verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { chatId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Message content is required" });
    }

    // Verify user is part of this chat
    const chat = await Chat.findOne({
      _id: chatId,
      "participants.user": userId,
      isActive: true
    }).populate("participants.user");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Create new message
    const message = new Message({
      chat: chatId,
      sender: userId,
      content: content.trim()
    });
    await message.save();

    // Update chat with last message
    chat.lastMessage = message._id;
    chat.lastMessageAt = new Date();

    // Update unread count for recipient
    const sender = chat.participants.find(p => p.user.toString() === userId);
    const recipient = chat.participants.find(p => p.user.toString() !== userId);
    
    if (recipient.role === "STUDENT") {
      chat.studentUnreadCount += 1;
    } else if (recipient.role === "ADMIN") {
      chat.adminUnreadCount += 1;
    }

    await chat.save();

    // Populate message details for response
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "fullName userId role");

    res.json(populatedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// Get unread message count for current user
router.get("/unread/count", verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const chats = await Chat.find({
      "participants.user": userId,
      isActive: true
    });

    let totalUnread = 0;
    chats.forEach(chat => {
      const userRole = chat.participants.find(p => p.user.toString() === userId)?.role;
      if (userRole === "STUDENT") {
        totalUnread += chat.studentUnreadCount;
      } else if (userRole === "ADMIN") {
        totalUnread += chat.adminUnreadCount;
      }
    });

    res.json({ unreadCount: totalUnread });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
});

module.exports = router;
