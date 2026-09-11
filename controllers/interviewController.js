const mongoose = require("mongoose");

const Interview = require("../models/Interview");
const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");

const {
  createNotification,
} = require("./notificationController");

// ==========================================
// HELPERS
// ==========================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const getUserId = (user) => {
  if (!user) {
    return null;
  }

  if (user._id) {
    return user._id.toString();
  }

  if (user.id) {
    return user.id.toString();
  }

  return null;
};

const parsePage = (value) => {
  const page = Number(value);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
};

const parseLimit = (value) => {
  const limit = Number(value);

  if (!Number.isFinite(limit) || limit < 1) {
    return 10;
  }

  return Math.min(Math.floor(limit), 100);
};

const buildPagination = (page, limit, total) => {
  const pages =
    total > 0
      ? Math.ceil(total / limit)
      : 0;

  return {
    page,
    limit,
    total,
    pages,
    hasNextPage:
      pages > 0 && page < pages,
    hasPrevPage:
      page > 1,
  };
};

const escapeRegex = (value) => {
  return String(value || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const interviewPopulate = [
  {
    path: "application",
    populate: {
      path: "job",
      populate: {
        path: "recruiter",
        select:
          "name email phone profileImage company companyLogo companyWebsite",
      },
    },
  },
  {
    path: "candidate",
    select:
      "name email phone profileImage bio location headline skills education experience resume cv",
  },
  {
    path: "recruiter",
    select:
      "name email phone profileImage company companyLogo companyWebsite",
  },
];

const allowedModes = [
  "online",
  "offline",
];

const allowedStatuses = [
  "scheduled",
  "completed",
  "cancelled",
];

const normalizeMode = (mode) => {
  return String(mode || "")
    .trim()
    .toLowerCase();
};

const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toLowerCase();
};

// ==========================================
// RECRUITER SCHEDULE INTERVIEW
// POST /api/interviews
// ==========================================

const scheduleInterview = async (req, res) => {
  try {
    if (req.user?.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message:
          "Only recruiters can schedule interviews",
      });
    }

    const recruiterId = getUserId(req.user);

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated recruiter is required",
      });
    }

    const {
      applicationId,
      candidateId,
      date,
      scheduledAt,
      duration = 30,
      mode,
      meetingLink = "",
      location = "",
      notes = "",
    } = req.body || {};

    const interviewDate =
      date || scheduledAt;

    // ------------------------------------------
    // Required fields
    // ------------------------------------------

    if (
      !applicationId ||
      !interviewDate ||
      !mode
    ) {
      return res.status(400).json({
        success: false,
        message:
          "applicationId, date and mode are required",
      });
    }

    // ------------------------------------------
    // Validate application ID
    // ------------------------------------------

    if (!isValidObjectId(applicationId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid application ID",
      });
    }

    // ------------------------------------------
    // Validate optional candidate ID
    // ------------------------------------------

    if (
      candidateId &&
      !isValidObjectId(candidateId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid candidate ID",
      });
    }

    // ------------------------------------------
    // Validate date
    // ------------------------------------------

    const parsedDate =
      new Date(interviewDate);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid interview date",
      });
    }

    if (
      parsedDate.getTime() <=
      Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Interview date must be in the future",
      });
    }

    // ------------------------------------------
    // Validate duration
    // ------------------------------------------

    const parsedDuration =
      Number(duration);

    if (
      !Number.isFinite(
        parsedDuration
      ) ||
      parsedDuration < 15 ||
      parsedDuration > 480
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Interview duration must be between 15 and 480 minutes",
      });
    }

    // ------------------------------------------
    // Validate mode
    // ------------------------------------------

    const normalizedMode =
      normalizeMode(mode);

    if (
      !allowedModes.includes(
        normalizedMode
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid interview mode. Allowed values: online, offline",
      });
    }

    const trimmedMeetingLink =
      String(
        meetingLink || ""
      ).trim();

    const trimmedLocation =
      String(
        location || ""
      ).trim();

    const trimmedNotes =
      String(
        notes || ""
      ).trim();

    if (
      normalizedMode === "online" &&
      !trimmedMeetingLink
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Meeting link is required for online interviews",
      });
    }

    if (
      normalizedMode === "offline" &&
      !trimmedLocation
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Location is required for offline interviews",
      });
    }

    // ------------------------------------------
    // Find application
    // ------------------------------------------

    const application =
      await Application.findById(
        applicationId
      );

    if (!application) {
      return res.status(404).json({
        success: false,
        message:
          "Application not found",
      });
    }

    // ------------------------------------------
    // Get candidate directly from application
    // ------------------------------------------

    const applicationCandidateId =
      application.candidate?.toString();

    if (!applicationCandidateId) {
      return res.status(400).json({
        success: false,
        message:
          "Application does not have a valid candidate",
      });
    }

    if (
      candidateId &&
      applicationCandidateId !==
        String(candidateId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Candidate does not match the application",
      });
    }

    const finalCandidateId =
      applicationCandidateId;

    // ------------------------------------------
    // Check candidate
    // ------------------------------------------

    const candidate =
      await User.findById(
        finalCandidateId
      );

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message:
          "Candidate not found",
      });
    }

    if (
      String(candidate.role)
        .trim()
        .toLowerCase() !==
      "candidate"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected user is not a candidate",
      });
    }

    if (
      candidate.status === "blocked" ||
      candidate.status === "inactive" ||
      candidate.isBlocked
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Candidate account is not active",
      });
    }

    // ------------------------------------------
    // Find job
    // ------------------------------------------

    const job =
      await Job.findById(
        application.job
      );

    if (!job) {
      return res.status(404).json({
        success: false,
        message:
          "Job not found",
      });
    }

    // ------------------------------------------
    // Recruiter ownership
    // ------------------------------------------

    if (
      !job.recruiter ||
      job.recruiter.toString() !==
        recruiterId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to schedule interview for this application",
      });
    }

    // ------------------------------------------
    // Application status validation
    // ------------------------------------------

    if (
      application.status === "rejected" ||
      application.status === "withdrawn"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Interview cannot be scheduled for a rejected or withdrawn application",
      });
    }

    // ------------------------------------------
    // Prevent duplicate active interview
    // ------------------------------------------

    const existingInterview =
      await Interview.findOne({
        application:
          applicationId,
        status:
          "scheduled",
      });

    if (existingInterview) {
      return res.status(409).json({
        success: false,
        message:
          "A scheduled interview already exists for this application",
        interview:
          existingInterview,
      });
    }

    // ------------------------------------------
    // Create interview
    // ------------------------------------------

    const interview =
      await Interview.create({
        application:
          applicationId,
        candidate:
          finalCandidateId,
        recruiter:
          recruiterId,
        date:
          parsedDate,
        duration:
          parsedDuration,
        mode:
          normalizedMode,
        meetingLink:
          trimmedMeetingLink,
        location:
          trimmedLocation,
        notes:
          trimmedNotes,
        status:
          "scheduled",
      });

    // ------------------------------------------
    // Automatically shortlist application
    // ------------------------------------------

    let applicationWasShortlisted =
      false;

    if (
      application.status === "pending" ||
      application.status === "reviewing"
    ) {
      application.status =
        "shortlisted";

      await application.save();

      applicationWasShortlisted =
        true;
    }

    // ------------------------------------------
    // Candidate notifications
    // ------------------------------------------

    try {
      await createNotification({
        userId:
          finalCandidateId,
        type:
          "interview",
        title:
          "Interview Scheduled",
        message:
          `Your interview for "${job.title}" has been scheduled for ${parsedDate.toLocaleString()}.`,
        relatedId:
          interview._id,
        relatedType:
          "Interview",
      });

      if (
        applicationWasShortlisted
      ) {
        await createNotification({
          userId:
            finalCandidateId,
          type:
            "application_status",
          title:
            "Application Shortlisted",
          message:
            `Your application for "${job.title}" has been shortlisted because an interview has been scheduled.`,
          relatedId:
            application._id,
          relatedType:
            "Application",
        });
      }
    } catch (
      notificationError
    ) {
      console.error(
        "Schedule Interview Notification Error:",
        notificationError
      );
    }

    // ------------------------------------------
    // Populate
    // ------------------------------------------

    const populatedInterview =
      await Interview.findById(
        interview._id
      ).populate(
        interviewPopulate
      );

    return res.status(201).json({
      success: true,
      message:
        "Interview scheduled successfully",
      interview:
        populatedInterview,
    });
  } catch (error) {
    console.error(
      "Schedule Interview Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to schedule interview",
    });
  }
};

// ==========================================
// CANDIDATE VIEW INTERVIEWS
// GET /api/interviews/my-interviews
// ==========================================

const getCandidateInterviews = async (
  req,
  res
) => {
  try {
    if (req.user?.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message:
          "Only candidates can view their interviews",
      });
    }

    const candidateId =
      getUserId(req.user);

    if (!candidateId) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated candidate is required",
      });
    }

    const page =
      parsePage(req.query.page);

    const limit =
      parseLimit(req.query.limit);

    const status =
      normalizeStatus(
        req.query.status
      );

    const filter = {
      candidate:
        candidateId,
    };

    if (status) {
      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid interview status",
        });
      }

      filter.status =
        status;
    }

    const total =
      await Interview.countDocuments(
        filter
      );

    const skip =
      (page - 1) * limit;

    const interviews =
      await Interview.find(
        filter
      )
        .populate(
          interviewPopulate
        )
        .sort({
          date: 1,
        })
        .skip(skip)
        .limit(limit);

    return res.status(200).json({
      success: true,
      message:
        "Candidate interviews fetched successfully",
      count:
        interviews.length,
      total,
      interviews,
      pagination:
        buildPagination(
          page,
          limit,
          total
        ),
    });
  } catch (error) {
    console.error(
      "Get Candidate Interviews Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch candidate interviews",
    });
  }
};

// ==========================================
// RECRUITER VIEW INTERVIEWS
// GET /api/interviews/recruiter-interviews
// ==========================================

const getRecruiterInterviews =
  async (
    req,
    res
  ) => {
    try {
      if (
        req.user?.role !==
        "recruiter"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only recruiters can view recruiter interviews",
        });
      }

      const recruiterId =
        getUserId(req.user);

      if (!recruiterId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated recruiter is required",
        });
      }

      const page =
        parsePage(
          req.query.page
        );

      const limit =
        parseLimit(
          req.query.limit
        );

      const status =
        normalizeStatus(
          req.query.status
        );

      const mode =
        normalizeMode(
          req.query.mode
        );

      const search =
        String(
          req.query.search || ""
        ).trim();

      const filter = {
        recruiter:
          recruiterId,
      };

      // ------------------------------------------
      // Status
      // ------------------------------------------

      if (status) {
        if (
          !allowedStatuses.includes(
            status
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid interview status",
          });
        }

        filter.status =
          status;
      }

      // ------------------------------------------
      // Mode
      // ------------------------------------------

      if (mode) {
        if (
          !allowedModes.includes(
            mode
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid interview mode",
          });
        }

        filter.mode =
          mode;
      }

      // ------------------------------------------
      // Search
      // ------------------------------------------

      if (search) {
        const safeSearch =
          escapeRegex(search);

        const regex =
          new RegExp(
            safeSearch,
            "i"
          );

        const [
          candidates,
          jobs,
        ] = await Promise.all([
          User.find({
            role:
              "candidate",
            $or: [
              {
                name: regex,
              },
              {
                email: regex,
              },
              {
                phone: regex,
              },
            ],
          }).select("_id"),

          Job.find({
            recruiter:
              recruiterId,
            $or: [
              {
                title: regex,
              },
              {
                company: regex,
              },
            ],
          }).select("_id"),
        ]);

        const candidateIds =
          candidates.map(
            (candidate) =>
              candidate._id
          );

        const jobIds =
          jobs.map(
            (job) =>
              job._id
          );

        // IMPORTANT:
        // Applications are restricted to
        // this recruiter's jobs only.
        const applications =
          await Application.find({
            job: {
              $in:
                jobIds,
            },
          }).select("_id");

        const applicationIds =
          applications.map(
            (application) =>
              application._id
          );

        filter.$or = [
          {
            candidate: {
              $in:
                candidateIds,
            },
          },
          {
            application: {
              $in:
                applicationIds,
            },
          },
        ];
      }

      const total =
        await Interview.countDocuments(
          filter
        );

      const skip =
        (page - 1) * limit;

      const interviews =
        await Interview.find(
          filter
        )
          .populate(
            interviewPopulate
          )
          .sort({
            date: 1,
          })
          .skip(skip)
          .limit(limit);

      return res.status(200).json({
        success: true,
        message:
          "Recruiter interviews fetched successfully",
        count:
          interviews.length,
        total,
        interviews,
        pagination:
          buildPagination(
            page,
            limit,
            total
          ),
      });
    } catch (error) {
      console.error(
        "Get Recruiter Interviews Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch recruiter interviews",
      });
    }
  };

// ==========================================
// UPDATE / RESCHEDULE INTERVIEW
// PUT /api/interviews/:id
// ==========================================

const updateInterview =
  async (
    req,
    res
  ) => {
    try {
      if (
        req.user?.role !==
        "recruiter"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only recruiters can update interviews",
        });
      }

      const recruiterId =
        getUserId(req.user);

      const { id } =
        req.params;

      if (
        !id ||
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid interview ID",
        });
      }

      const {
        date,
        scheduledAt,
        duration,
        mode,
        meetingLink,
        location,
        notes,
        status,
      } = req.body || {};

      const interview =
        await Interview.findById(
          id
        );

      if (!interview) {
        return res.status(404).json({
          success: false,
          message:
            "Interview not found",
        });
      }

      // ------------------------------------------
      // Ownership
      // ------------------------------------------

      if (
        !interview.recruiter ||
        interview.recruiter.toString() !==
          recruiterId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to update this interview",
        });
      }

      // ------------------------------------------
      // Completed restrictions
      // ------------------------------------------

      if (
        interview.status ===
        "completed"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Completed interview cannot be modified",
        });
      }

      const oldDate =
        interview.date;

      const oldMode =
        interview.mode;

      const oldStatus =
        interview.status;

      // ------------------------------------------
      // Date
      // ------------------------------------------

      const nextDate =
        date !== undefined
          ? date
          : scheduledAt !== undefined
          ? scheduledAt
          : undefined;

      if (
        nextDate !==
        undefined
      ) {
        const parsedDate =
          new Date(nextDate);

        if (
          Number.isNaN(
            parsedDate.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid interview date",
          });
        }

        if (
          parsedDate.getTime() <=
          Date.now()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Interview date must be in the future",
          });
        }

        interview.date =
          parsedDate;
      }

      // ------------------------------------------
      // Duration
      // ------------------------------------------

      if (
        duration !==
        undefined
      ) {
        const parsedDuration =
          Number(duration);

        if (
          !Number.isFinite(
            parsedDuration
          ) ||
          parsedDuration < 15 ||
          parsedDuration > 480
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Interview duration must be between 15 and 480 minutes",
          });
        }

        interview.duration =
          parsedDuration;
      }

      // ------------------------------------------
      // Mode
      // ------------------------------------------

      let nextMode =
        interview.mode;

      if (
        mode !==
        undefined
      ) {
        nextMode =
          normalizeMode(
            mode
          );

        if (
          !allowedModes.includes(
            nextMode
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid interview mode",
          });
        }

        interview.mode =
          nextMode;
      }

      // ------------------------------------------
      // Meeting link
      // ------------------------------------------

      if (
        meetingLink !==
        undefined
      ) {
        interview.meetingLink =
          String(
            meetingLink || ""
          ).trim();
      }

      // ------------------------------------------
      // Location
      // ------------------------------------------

      if (
        location !==
        undefined
      ) {
        interview.location =
          String(
            location || ""
          ).trim();
      }

      // ------------------------------------------
      // Mode-specific validation
      // ------------------------------------------

      if (
        nextMode ===
          "online" &&
        !String(
          interview.meetingLink ||
            ""
        ).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Meeting link is required for online interviews",
        });
      }

      if (
        nextMode ===
          "offline" &&
        !String(
          interview.location ||
            ""
        ).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Location is required for offline interviews",
        });
      }

      // ------------------------------------------
      // Notes
      // ------------------------------------------

      if (
        notes !==
        undefined
      ) {
        interview.notes =
          String(
            notes || ""
          ).trim();
      }

      // ------------------------------------------
      // Status
      // ------------------------------------------

      if (
        status !==
        undefined
      ) {
        const normalizedStatus =
          normalizeStatus(
            status
          );

        if (
          !allowedStatuses.includes(
            normalizedStatus
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid status. Allowed values: scheduled, completed, cancelled",
          });
        }

        if (
          oldStatus ===
            "completed" &&
          normalizedStatus !==
            "completed"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Completed interview status cannot be changed",
          });
        }

        if (
          oldStatus ===
            "cancelled" &&
          normalizedStatus !==
            "scheduled"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Cancelled interview can only be rescheduled",
          });
        }

        interview.status =
          normalizedStatus;
      }

      // ------------------------------------------
      // Cancelled interview must be rescheduled
      // ------------------------------------------

      if (
        oldStatus ===
          "cancelled" &&
        interview.status ===
          "scheduled"
      ) {
        if (
          nextDate ===
          undefined
        ) {
          return res.status(400).json({
            success: false,
            message:
              "A new future date is required to reschedule a cancelled interview",
          });
        }
      }

      await interview.save();

      // ------------------------------------------
      // Get application/job
      // ------------------------------------------

      const application =
        await Application.findById(
          interview.application
        ).populate(
          "job"
        );

      const job =
        application?.job ||
        null;

      // ------------------------------------------
      // Candidate notifications
      // ------------------------------------------

      try {
        const dateChanged =
          oldDate?.getTime() !==
          interview.date?.getTime();

        const modeChanged =
          oldMode !==
          interview.mode;

        const statusChanged =
          oldStatus !==
          interview.status;

        if (
          interview.status ===
            "cancelled" &&
          oldStatus !==
            "cancelled"
        ) {
          await createNotification({
            userId:
              interview.candidate,
            type:
              "interview",
            title:
              "Interview Cancelled",
            message:
              job
                ? `Your interview for "${job.title}" has been cancelled.`
                : "Your scheduled interview has been cancelled.",
            relatedId:
              interview._id,
            relatedType:
              "Interview",
          });
        } else if (
          oldStatus ===
            "cancelled" &&
          interview.status ===
            "scheduled"
        ) {
          await createNotification({
            userId:
              interview.candidate,
            type:
              "interview",
            title:
              "Interview Rescheduled",
            message:
              job
                ? `Your interview for "${job.title}" has been rescheduled for ${interview.date.toLocaleString()}.`
                : `Your interview has been rescheduled for ${interview.date.toLocaleString()}.`,
            relatedId:
              interview._id,
            relatedType:
              "Interview",
          });
        } else if (
          dateChanged ||
          modeChanged
        ) {
          await createNotification({
            userId:
              interview.candidate,
            type:
              "interview",
            title:
              "Interview Updated",
            message:
              job
                ? `Your interview for "${job.title}" has been updated. New schedule: ${interview.date.toLocaleString()}.`
                : `Your interview has been updated. New schedule: ${interview.date.toLocaleString()}.`,
            relatedId:
              interview._id,
            relatedType:
              "Interview",
          });
        } else if (
          statusChanged &&
          interview.status ===
            "completed"
        ) {
          await createNotification({
            userId:
              interview.candidate,
            type:
              "interview",
            title:
              "Interview Completed",
            message:
              job
                ? `Your interview for "${job.title}" has been marked as completed.`
                : "Your interview has been marked as completed.",
            relatedId:
              interview._id,
            relatedType:
              "Interview",
          });
        } else if (
          statusChanged &&
          interview.status ===
            "scheduled"
        ) {
          await createNotification({
            userId:
              interview.candidate,
            type:
              "interview",
            title:
              "Interview Scheduled",
            message:
              job
                ? `Your interview for "${job.title}" is scheduled for ${interview.date.toLocaleString()}.`
                : `Your interview is scheduled for ${interview.date.toLocaleString()}.`,
            relatedId:
              interview._id,
            relatedType:
              "Interview",
          });
        }
      } catch (
        notificationError
      ) {
        console.error(
          "Update Interview Notification Error:",
          notificationError
        );
      }

      // ------------------------------------------
      // Populate response
      // ------------------------------------------

      const updatedInterview =
        await Interview.findById(
          interview._id
        ).populate(
          interviewPopulate
        );

      return res.status(200).json({
        success: true,
        message:
          "Interview updated/rescheduled successfully",
        interview:
          updatedInterview,
      });
    } catch (error) {
      console.error(
        "Update Interview Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update interview",
      });
    }
  };

// ==========================================
// CANCEL INTERVIEW
// PATCH /api/interviews/:id/cancel
// ==========================================

const cancelInterview =
  async (
    req,
    res
  ) => {
    try {
      if (
        req.user?.role !==
        "recruiter"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only recruiters can cancel interviews",
        });
      }

      const recruiterId =
        getUserId(req.user);

      const { id } =
        req.params;

      if (
        !id ||
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid interview ID",
        });
      }

      const interview =
        await Interview.findById(
          id
        );

      if (!interview) {
        return res.status(404).json({
          success: false,
          message:
            "Interview not found",
        });
      }

      // ------------------------------------------
      // Ownership
      // ------------------------------------------

      if (
        !interview.recruiter ||
        interview.recruiter.toString() !==
          recruiterId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to cancel this interview",
        });
      }

      // ------------------------------------------
      // Status validation
      // ------------------------------------------

      if (
        interview.status ===
        "cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Interview is already cancelled",
        });
      }

      if (
        interview.status ===
        "completed"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Completed interview cannot be cancelled",
        });
      }

      // ------------------------------------------
      // Get application/job
      // ------------------------------------------

      const application =
        await Application.findById(
          interview.application
        ).populate(
          "job"
        );

      interview.status =
        "cancelled";

      await interview.save();

      // ------------------------------------------
      // Candidate notification
      // ------------------------------------------

      try {
        const job =
          application?.job ||
          null;

        await createNotification({
          userId:
            interview.candidate,
          type:
            "interview",
          title:
            "Interview Cancelled",
          message:
            job
              ? `Your interview for "${job.title}" has been cancelled.`
              : "Your scheduled interview has been cancelled.",
          relatedId:
            interview._id,
          relatedType:
            "Interview",
        });
      } catch (
        notificationError
      ) {
        console.error(
          "Cancel Interview Notification Error:",
          notificationError
        );
      }

      // ------------------------------------------
      // Populate response
      // ------------------------------------------

      const cancelledInterview =
        await Interview.findById(
          interview._id
        ).populate(
          interviewPopulate
        );

      return res.status(200).json({
        success: true,
        message:
          "Interview cancelled successfully",
        interview:
          cancelledInterview,
      });
    } catch (error) {
      console.error(
        "Cancel Interview Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to cancel interview",
      });
    }
  };

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  scheduleInterview,
  getCandidateInterviews,
  getRecruiterInterviews,
  updateInterview,
  cancelInterview,
};