const express = require("express");

const {
  sendMessage,
  getConversation,
  getInbox,
  getUnreadCount,
  markConversationAsRead,
  deleteMessage,
} = require("../controllers/messageController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// GET INBOX / CONVERSATIONS
// GET /api/messages
// ==========================================
router.get("/", protect, getInbox);

// ==========================================
// GET UNREAD MESSAGE COUNT
// GET /api/messages/unread-count
// ==========================================
router.get(
  "/unread-count",
  protect,
  getUnreadCount
);

// ==========================================
// GET CONVERSATION
// GET /api/messages/conversation/:userId
// ==========================================
router.get(
  "/conversation/:userId",
  protect,
  getConversation
);

// ==========================================
// SEND MESSAGE
// POST /api/messages
// ==========================================
router.post(
  "/",
  protect,
  sendMessage
);

// ==========================================
// MARK CONVERSATION AS READ
// PATCH /api/messages/read/:userId
// ==========================================
router.patch(
  "/read/:userId",
  protect,
  markConversationAsRead
);

// ==========================================
// DELETE MESSAGE
// DELETE /api/messages/:id
// ==========================================
router.delete(
  "/:id",
  protect,
  deleteMessage
);

// ==========================================
// EXPORT
// ==========================================
module.exports = router;