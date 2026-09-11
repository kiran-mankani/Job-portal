const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");

// ==========================================
// HELPERS
// ==========================================

const getUserId = (req) => {
  return req.user?._id || req.user?.id || null;
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const normalizePagination = (page, limit) => {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  const safePage =
    Number.isInteger(parsedPage) && parsedPage > 0
      ? parsedPage
      : 1;

  const safeLimit =
    Number.isInteger(parsedLimit) &&
    parsedLimit > 0 &&
    parsedLimit <= 100
      ? parsedLimit
      : 20;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const serializeUser = (user) => {
  if (!user) return null;

  return {
    id: user._id,
    _id: user._id,
    name: user.name || "",
    email: user.email || "",
    role: user.role || "",
    profileImage: user.profileImage || "",
    company: user.company || "",
  };
};

const serializeMessage = (message) => {
  if (!message) return null;

  return {
    id: message._id,
    _id: message._id,

    sender: message.sender
      ? serializeUser(message.sender)
      : null,

    receiver: message.receiver
      ? serializeUser(message.receiver)
      : null,

    text: message.text || "",
    read: Boolean(message.read),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
};

const sendServerError = (res, message) => {
  return res.status(500).json({
    success: false,
    message,
  });
};

// ==========================================
// SEND MESSAGE
// POST /api/messages
// ==========================================

const sendMessage = async (req, res) => {
  try {
    const senderId = getUserId(req);

    if (!senderId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { receiverId, text } = req.body || {};

    const cleanReceiverId = String(
      receiverId || ""
    ).trim();

    const cleanText = String(text || "").trim();

    if (!cleanReceiverId) {
      return res.status(400).json({
        success: false,
        message: "Receiver ID is required",
      });
    }

    if (!isValidObjectId(cleanReceiverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid receiver ID",
      });
    }

    if (!cleanText) {
      return res.status(400).json({
        success: false,
        message: "Message text is required",
      });
    }

    if (cleanText.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 5000 characters",
      });
    }

    if (String(senderId) === cleanReceiverId) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a message to yourself",
      });
    }

    const receiver = await User.findById(
      cleanReceiverId
    ).select(
      "_id name email role profileImage company isBlocked isActive"
    );

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    if (receiver.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "This user is currently blocked",
      });
    }

    if (receiver.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "This user account is inactive",
      });
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiver._id,
      text: cleanText,
      read: false,
    });

    const populatedMessage = await Message.findById(
      message._id
    )
      .populate(
        "sender",
        "name email role profileImage company"
      )
      .populate(
        "receiver",
        "name email role profileImage company"
      )
      .lean();

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: serializeMessage(populatedMessage),
    });
  } catch (error) {
    console.error("Send Message Error:", error);

    return sendServerError(
      res,
      "Server error while sending message"
    );
  }
};

// ==========================================
// GET CONVERSATION
// GET /api/messages/conversation/:userId
// ==========================================

const getConversation = async (req, res) => {
  try {
    const currentUserId = getUserId(req);

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const otherUserId = String(
      req.params.userId || ""
    ).trim();

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!isValidObjectId(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (String(currentUserId) === otherUserId) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot open a conversation with yourself",
      });
    }

    const otherUser = await User.findById(
      otherUserId
    )
      .select(
        "_id name email role profileImage company isBlocked isActive"
      )
      .lean();

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { page, limit, skip } =
      normalizePagination(
        req.query.page,
        req.query.limit
      );

    const filter = {
      $or: [
        {
          sender: currentUserId,
          receiver: otherUser._id,
        },
        {
          sender: otherUser._id,
          receiver: currentUserId,
        },
      ],
    };

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .populate(
          "sender",
          "name email role profileImage company"
        )
        .populate(
          "receiver",
          "name email role profileImage company"
        )
        .sort({
          createdAt: 1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Message.countDocuments(filter),
    ]);

    await Message.updateMany(
      {
        sender: otherUser._id,
        receiver: currentUserId,
        read: false,
      },
      {
        $set: {
          read: true,
        },
      }
    );

    return res.status(200).json({
      success: true,

      conversationWith:
        serializeUser(otherUser),

      data: messages.map(serializeMessage),

      pagination: {
        page,
        limit,
        total,
        totalPages:
          total > 0
            ? Math.ceil(total / limit)
            : 0,

        hasNextPage:
          skip + messages.length < total,
      },
    });
  } catch (error) {
    console.error(
      "Get Conversation Error:",
      error
    );

    return sendServerError(
      res,
      "Server error while fetching conversation"
    );
  }
};

// ==========================================
// GET INBOX / CONVERSATIONS
// GET /api/messages
// ==========================================

const getInbox = async (req, res) => {
  try {
    const currentUserId = getUserId(req);

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      page,
      limit,
      skip,
    } = normalizePagination(
      req.query.page,
      req.query.limit
    );

    const search = String(
      req.query.search || ""
    ).trim();

    const searchRegex = search
      ? new RegExp(
          search.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          ),
          "i"
        )
      : null;

    const currentUserObjectId =
      new mongoose.Types.ObjectId(
        currentUserId
      );

    const pipeline = [
      {
        $match: {
          $or: [
            {
              sender: currentUserObjectId,
            },
            {
              receiver: currentUserObjectId,
            },
          ],
        },
      },

      {
        $addFields: {
          otherUserId: {
            $cond: [
              {
                $eq: [
                  "$sender",
                  currentUserObjectId,
                ],
              },
              "$receiver",
              "$sender",
            ],
          },
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $group: {
          _id: "$otherUserId",

          lastMessage: {
            $first: "$$ROOT",
          },
        },
      },

      {
        $lookup: {
          from: "users",

          localField: "_id",

          foreignField: "_id",

          as: "user",
        },
      },

      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false,
        },
      },

      ...(searchRegex
        ? [
            {
              $match: {
                $or: [
                  {
                    "user.name":
                      searchRegex,
                  },

                  {
                    "user.company":
                      searchRegex,
                  },

                  {
                    "lastMessage.text":
                      searchRegex,
                  },
                ],
              },
            },
          ]
        : []),

      {
        $lookup: {
          from: "messages",

          let: {
            otherUserId: "$_id",
          },

          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$sender",
                        "$$otherUserId",
                      ],
                    },

                    {
                      $eq: [
                        "$receiver",
                        currentUserObjectId,
                      ],
                    },

                    {
                      $eq: [
                        "$read",
                        false,
                      ],
                    },
                  ],
                },
              },
            },

            {
              $count: "count",
            },
          ],

          as: "unread",
        },
      },

      {
        $addFields: {
          unreadCount: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$unread.count",
                  0,
                ],
              },
              0,
            ],
          },
        },
      },

      {
        $sort: {
          "lastMessage.createdAt": -1,
        },
      },

      {
        $facet: {
          metadata: [
            {
              $count: "total",
            },
          ],

          conversations: [
            {
              $skip: skip,
            },

            {
              $limit: limit,
            },
          ],
        },
      },
    ];

    const [result] =
      await Message.aggregate(
        pipeline
      );

    const total =
      result?.metadata?.[0]?.total || 0;

    const conversationRows =
      result?.conversations || [];

    const conversations =
      conversationRows.map(
        (row) => {
          const user = row.user;
          const lastMessage =
            row.lastMessage;

          return {
            user: serializeUser(user),

            lastMessage:
              serializeMessage({
                ...lastMessage,
                sender: null,
                receiver: null,
              }),

            unreadCount:
              Number(
                row.unreadCount
              ) || 0,
          };
        }
      );

    const senderIds = [];
    const receiverIds = [];

    for (
      const conversation of conversationRows
    ) {
      if (
        conversation.lastMessage?.sender
      ) {
        senderIds.push(
          conversation.lastMessage.sender
        );
      }

      if (
        conversation.lastMessage?.receiver
      ) {
        receiverIds.push(
          conversation.lastMessage.receiver
        );
      }
    }

    const userIds = [
      ...new Set(
        [
          ...senderIds,
          ...receiverIds,
        ].map(String)
      ),
    ];

    const populatedUsers =
      userIds.length > 0
        ? await User.find({
            _id: {
              $in: userIds,
            },
          })
            .select(
              "_id name email role profileImage company"
            )
            .lean()
        : [];

    const userMap = new Map(
      populatedUsers.map(
        (user) => [
          String(user._id),
          user,
        ]
      )
    );

    const finalConversations =
      conversations.map(
        (
          conversation,
          index
        ) => {
          const row =
            conversationRows[index];

          const rawLastMessage =
            row.lastMessage;

          return {
            user:
              conversation.user,

            lastMessage:
              serializeMessage({
                ...rawLastMessage,

                sender:
                  userMap.get(
                    String(
                      rawLastMessage.sender
                    )
                  ) || null,

                receiver:
                  userMap.get(
                    String(
                      rawLastMessage.receiver
                    )
                  ) || null,
              }),

            unreadCount:
              conversation.unreadCount,
          };
        }
      );

    return res.status(200).json({
      success: true,

      data: finalConversations,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          total > 0
            ? Math.ceil(
                total / limit
              )
            : 0,

        hasNextPage:
          skip +
            finalConversations.length <
          total,
      },
    });
  } catch (error) {
    console.error(
      "Get Inbox Error:",
      error
    );

    return sendServerError(
      res,
      "Server error while fetching messages"
    );
  }
};

// ==========================================
// GET UNREAD MESSAGE COUNT
// GET /api/messages/unread-count
// ==========================================

const getUnreadCount = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const count =
      await Message.countDocuments({
        receiver: userId,
        read: false,
      });

    return res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error(
      "Get Unread Message Count Error:",
      error
    );

    return sendServerError(
      res,
      "Server error while fetching unread message count"
    );
  }
};

// ==========================================
// MARK CONVERSATION AS READ
// PATCH /api/messages/read/:userId
// ==========================================

const markConversationAsRead =
  async (req, res) => {
    try {
      const currentUserId =
        getUserId(req);

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      const otherUserId = String(
        req.params.userId || ""
      ).trim();

      if (!otherUserId) {
        return res.status(400).json({
          success: false,
          message:
            "User ID is required",
        });
      }

      if (!isValidObjectId(otherUserId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID",
        });
      }

      if (
        String(currentUserId) ===
        otherUserId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid conversation user",
        });
      }

      const result =
        await Message.updateMany(
          {
            sender: otherUserId,
            receiver: currentUserId,
            read: false,
          },
          {
            $set: {
              read: true,
            },
          }
        );

      return res.status(200).json({
        success: true,

        message:
          "Conversation marked as read",

        modifiedCount:
          result.modifiedCount || 0,
      });
    } catch (error) {
      console.error(
        "Mark Conversation Read Error:",
        error
      );

      return sendServerError(
        res,
        "Server error while marking messages as read"
      );
    }
  };

// ==========================================
// DELETE MESSAGE
// DELETE /api/messages/:id
// ==========================================

const deleteMessage = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const messageId = String(
      req.params.id || ""
    ).trim();

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: "Message ID is required",
      });
    }

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
    }

    const message =
      await Message.findById(
        messageId
      ).lean();

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (
      String(message.sender) !==
      String(userId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only delete your own messages",
      });
    }

    await Message.findByIdAndDelete(
      message._id
    );

    return res.status(200).json({
      success: true,
      message:
        "Message deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Message Error:",
      error
    );

    return sendServerError(
      res,
      "Server error while deleting message"
    );
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  sendMessage,
  getConversation,
  getInbox,
  getUnreadCount,
  markConversationAsRead,
  deleteMessage,
};