const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");

// ======================================================
// GET MY NOTIFICATIONS
// GET /api/notifications
// ======================================================

router.get(
  "/",
  protect,
  getNotifications
);

// ======================================================
// GET UNREAD COUNT
// GET /api/notifications/unread-count
// ======================================================

router.get(
  "/unread-count",
  protect,
  getUnreadNotificationCount
);

// ======================================================
// MARK ALL AS READ
// PATCH /api/notifications/read-all
// ======================================================

router.patch(
  "/read-all",
  protect,
  markAllNotificationsAsRead
);

// ======================================================
// MARK ONE AS READ
// PATCH /api/notifications/:id/read
// ======================================================

router.patch(
  "/:id/read",
  protect,
  markNotificationAsRead
);

module.exports = router;