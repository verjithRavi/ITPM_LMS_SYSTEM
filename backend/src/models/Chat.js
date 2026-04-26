const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  readAt: {
    type: Date,
    default: null,
  },
});

const chatSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["STUDENT", "ADMIN"],
      required: true,
    },
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  studentUnreadCount: {
    type: Number,
    default: 0,
  },
  adminUnreadCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
chatSchema.index({ "participants.user": 1 });
chatSchema.index({ lastMessageAt: -1 });

// Virtual for messages
chatSchema.virtual("messages", {
  ref: "Message",
  localField: "_id",
  foreignField: "chat",
});

// Set toJSON option to include virtuals
chatSchema.set("toJSON", { virtuals: true });
chatSchema.set("toObject", { virtuals: true });


const Chat = mongoose.model("Chat", chatSchema);
const Message = mongoose.model("Message", messageSchema);

module.exports = { Chat, Message };
