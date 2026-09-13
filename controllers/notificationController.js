
const Notification = require("../models/Notification");

// ======================================================
// HELPERS
// ======================================================

const getUserId = (req) => {
  return req.user?._id || req.user?.id || null;
};

const sendServerError = (res, message) => {
  return res.status(500).json({
    success: false,
    message,
  });
};

// ======================================================
// CREATE IN-APP NOTIFICATION
// ======================================================

const createNotification = async ({
  userId,
  type = "system",
  title,
  message,
  relatedId = null,
  relatedType = null,
}) => {
  try {
    if (!userId || !title || !message) {
      return null;
    }

    return await Notification.create({
      user: userId,
      type,
      title,
      message,
      relatedId,
      relatedType,
    });
  } catch (error) {
    console.error("Create Notification Error:", error);
    return null;
  }
};

// ======================================================
// GET MY NOTIFICATIONS
// GET /api/notifications?page=1&limit=10
// ======================================================

const getNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // --------------------------------------------------
    // Pagination
    // --------------------------------------------------

    const parsedPage = parseInt(req.query.page, 10);
    const parsedLimit = parseInt(req.query.limit, 10);

    const page = Math.max(
      Number.isNaN(parsedPage) ? 1 : parsedPage,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.isNaN(parsedLimit) ? 10 : parsedLimit,
        1
      ),
      50
    );

    const skip = (page - 1) * limit;

    // --------------------------------------------------
    // Filter
    // --------------------------------------------------

    const filter = {
      user: userId,
    };

    // --------------------------------------------------
    // Total notifications
    // --------------------------------------------------

    const total = await Notification.countDocuments(filter);

    // --------------------------------------------------
    // Paginated notifications
    // --------------------------------------------------

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // --------------------------------------------------
    // Unread count
    // --------------------------------------------------

    const unreadCount = await Notification.countDocuments({
      user: userId,
      read: false,
    });

    // --------------------------------------------------
    // Pagination metadata
    // --------------------------------------------------

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          totalPages > 0 && page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);

    return sendServerError(
      res,
      "Failed to fetch notifications"
    );
  }
};

// ======================================================
// GET UNREAD COUNT
// GET /api/notifications/unread-count
// ======================================================

const getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const unreadCount = await Notification.countDocuments({
      user: userId,
      read: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error(
      "Get Unread Notification Count Error:",
      error
    );

    return sendServerError(
      res,
      "Failed to fetch unread notification count"
    );
  }
};

// ======================================================
// MARK ONE NOTIFICATION AS READ
// PATCH /api/notifications/:id/read
// ======================================================

const markNotificationAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        user: userId,
      },
      {
        read: true,
      },
      {
        new: true,
      }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error(
      "Mark Notification Read Error:",
      error
    );

    return sendServerError(
      res,
      "Failed to mark notification as read"
    );
  }
};

// ======================================================
// MARK ALL NOTIFICATIONS AS READ
// PATCH /api/notifications/read-all
// ======================================================

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await Notification.updateMany(
      {
        user: userId,
        read: false,
      },
      {
        read: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error(
      "Mark All Notifications Read Error:",
      error
    );

    return sendServerError(
      res,
      "Failed to mark all notifications as read"
    );
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};

