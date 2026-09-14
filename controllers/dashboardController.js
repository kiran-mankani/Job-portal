const User = require("../models/User");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const Job = require("../models/Job");

// ======================================================
// Shared populate configs
//
// Job only stores a `companyId` reference (Company._id) — it
// has no inline `company` field. Every query below that needs
// a job's company name must populate `companyId`.
// ======================================================

const jobCompanyPopulate = {
  path: "companyId",
  select: "name logo location website",
};

// ======================================================
// Helpers
// ======================================================

const sendServerError = (
  res,
  message,
  error
) => {
  console.error(message, error);

  return res.status(500).json({
    success: false,
    message,
  });
};

const getIdString = (value) => {
  if (!value) {
    return null;
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (value?._id) {
    return value._id.toString();
  }

  return value.toString
    ? value.toString()
    : null;
};

const buildLast7DaysOverview = (
  applications
) => {
  const days = [];

  for (
    let i = 6;
    i >= 0;
    i -= 1
  ) {
    const date = new Date();

    date.setHours(
      0,
      0,
      0,
      0
    );

    date.setDate(
      date.getDate() - i
    );

    days.push({
      date,
      label:
        date.toISOString().slice(0, 10),
      count: 0,
    });
  }

  applications.forEach(
    (application) => {
      if (!application?.createdAt) {
        return;
      }

      const date = new Date(
        application.createdAt
      );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return;
      }

      date.setHours(
        0,
        0,
        0,
        0
      );

      const key =
        date
          .toISOString()
          .slice(0, 10);

      const day =
        days.find(
          (item) =>
            item.label === key
        );

      if (day) {
        day.count += 1;
      }
    }
  );

  return days;
};

const buildActivity = ({
  recentApplications = [],
  upcomingInterviews = [],
  recentJobs = [],
}) => {
  const activities = [];

  recentApplications.forEach(
    (application) => {
      const candidate =
        application?.candidate || {};

      const job =
        application?.job || {};

      if (
        application?.createdAt
      ) {
        activities.push({
          id:
            `application-${getIdString(
              application._id
            )}`,

          type: "application",

          title: `${
            candidate.name ||
            "Candidate"
          } applied for ${
            job.title ||
            "your job"
          }`,

          date:
            application.createdAt,
        });
      }
    }
  );

  upcomingInterviews.forEach(
    (interview) => {
      const candidate =
        interview?.candidate || {};

      if (interview?.date) {
        activities.push({
          id:
            `interview-${getIdString(
              interview._id
            )}`,

          type: "interview",

          title: `Interview scheduled with ${
            candidate.name ||
            "candidate"
          }`,

          date:
            interview.date,
        });
      }
    }
  );

  recentJobs.forEach(
    (job) => {
      if (job?.createdAt) {
        activities.push({
          id:
            `job-${getIdString(
              job._id
            )}`,

          type: "job",

          title: `New job posted: ${
            job.title ||
            "Untitled Job"
          }`,

          date:
            job.createdAt,
        });
      }
    }
  );

  return activities
    .sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    )
    .slice(0, 8);
};

// ======================================================
// Candidate Dashboard
// GET /api/dashboard/candidate
// ======================================================

const getCandidateDashboard =
  async (
    req,
    res
  ) => {
    try {
      if (
        req.user?.role !==
        "candidate"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only candidates can access the candidate dashboard",
        });
      }

      const candidateId =
        getIdString(
          req.user
        );

      if (!candidateId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated candidate is required",
        });
      }

      const now =
        new Date();

      const candidate =
        await User.findById(
          candidateId
        ).select("-password");

      if (!candidate) {
        return res.status(404).json({
          success: false,
          message:
            "Candidate not found",
        });
      }

      const [
        totalApplications,
        pendingApplications,
        reviewingApplications,
        shortlistedApplications,
        rejectedApplications,
        hiredApplications,
        withdrawnApplications,
        totalInterviews,
        scheduledInterviews,
        recentApplications,
        upcomingInterviews,
      ] = await Promise.all([
        Application.countDocuments({
          candidate:
            candidateId,
        }),

        Application.countDocuments({
          candidate:
            candidateId,
          status:
            "pending",
        }),

        Application.countDocuments({
          candidate:
            candidateId,
          status:
            "reviewing",
        }),

        Application.countDocuments({
          candidate:
            candidateId,
          status:
            "shortlisted",
        }),

        Application.countDocuments({
          candidate:
            candidateId,
          status:
            "rejected",
        }),

        Application.countDocuments({
          candidate:
            candidateId,
          status:
            "hired",
        }),

        Application.countDocuments({
          candidate:
            candidateId,
          status:
            "withdrawn",
        }),

        Interview.countDocuments({
          candidate:
            candidateId,
        }),

        Interview.countDocuments({
          candidate:
            candidateId,
          status:
            "scheduled",
        }),

        Application.find({
          candidate:
            candidateId,
        })
          .populate({
            path: "job",
            select:
              "title companyId location salary jobType category experienceLevel",
            populate: jobCompanyPopulate,
          })
          .sort({
            createdAt:
              -1,
          })
          .limit(5),

        Interview.find({
          candidate:
            candidateId,
          status:
            "scheduled",
          date: {
            $gte: now,
          },
        })
          .populate({
            path:
              "application",

            populate: {
              path:
                "job",

              select:
                "title companyId location salary jobType",

              populate: jobCompanyPopulate,
            },
          })
          .populate({
            path: "recruiter",
            select: "name email companyId",
            populate: jobCompanyPopulate,
          })
          .sort({
            date: 1,
          })
          .limit(5),
      ]);

      const profileCompletion =
        calculateProfileCompletion(
          candidate
        );

      const upcomingInterviewData =
        upcomingInterviews.map(
          (interview) => {
            const interviewObject =
              interview.toObject();

            return {
              ...interviewObject,

              job:
                interview
                  .application
                  ?.job ||
                null,

              application:
                interview.application ||
                null,
            };
          }
        );

      return res.status(200).json({
        success: true,

        message:
          "Candidate dashboard fetched successfully",

        dashboard: {
          candidate,

          statistics: {
            totalApplications,
            pendingApplications,
            reviewingApplications,
            shortlistedApplications,
            rejectedApplications,
            hiredApplications,
            withdrawnApplications,
            totalInterviews,
            scheduledInterviews,
          },

          totalApplications,

          applicationsCount:
            totalApplications,

          interviews:
            scheduledInterviews,

          interviewsCount:
            scheduledInterviews,

          scheduledInterviews,

          profileCompletion,

          profileViews:
            Number(
              candidate.profileViews
            ) || 0,

          savedJobs:
            Array.isArray(
              candidate.savedJobs
            )
              ? candidate.savedJobs.length
              : 0,

          recentApplications,

          upcomingInterviews:
            upcomingInterviewData,

          notifications: [],
        },
      });
    } catch (error) {
      return sendServerError(
        res,
        "Failed to fetch candidate dashboard",
        error
      );
    }
  };

// ======================================================
// Recruiter Dashboard
// GET /api/dashboard/recruiter
// ======================================================

const getRecruiterDashboard =
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
            "Only recruiters can access the recruiter dashboard",
        });
      }

      const recruiterId =
        getIdString(
          req.user
        );

      if (!recruiterId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated recruiter is required",
        });
      }

      const now =
        new Date();

      const recruiter =
        await User.findById(
          recruiterId
        ).select("-password");

      if (!recruiter) {
        return res.status(404).json({
          success: false,
          message:
            "Recruiter not found",
        });
      }

      // --------------------------------------------------
      // Recruiter's jobs
      // --------------------------------------------------

      const recruiterJobs =
        await Job.find({
          recruiter:
            recruiterId,
        })
          .sort({
            createdAt:
              -1,
          })
          .select(
            "_id title companyId location status jobType category experienceLevel createdAt"
          )
          .populate(jobCompanyPopulate);

      const jobIds =
        recruiterJobs.map(
          (job) =>
            job._id
        );

      // --------------------------------------------------
      // Application / interview data
      // --------------------------------------------------

      const [
        totalJobs,
        activeJobs,
        closedJobs,

        totalApplications,
        pendingApplications,
        reviewingApplications,
        shortlistedApplications,
        rejectedApplications,
        hiredApplications,
        withdrawnApplications,

        totalInterviews,
        scheduledInterviews,
        completedInterviews,
        cancelledInterviews,

        recentApplications,
        upcomingInterviews,

        overviewApplications,

        applicationCountsByJob,
      ] = await Promise.all([
        Job.countDocuments({
          recruiter:
            recruiterId,
        }),

        Job.countDocuments({
          recruiter:
            recruiterId,
          status:
            "active",
        }),

        Job.countDocuments({
          recruiter:
            recruiterId,
          status:
            "closed",
        }),

        Application.countDocuments({
          job: {
            $in:
              jobIds,
          },
        }),

        Application.countDocuments({
          job: {
            $in:
              jobIds,
          },
          status:
            "pending",
        }),

        Application.countDocuments({
          job: {
            $in:
              jobIds,
          },
          status:
            "reviewing",
        }),

        Application.countDocuments({
          job: {
            $in:
              jobIds,
          },
          status:
            "shortlisted",
        }),

        Application.countDocuments({
          job: {
            $in:
              jobIds,
          },
          status:
            "rejected",
        }),

        Application.countDocuments({
          job: {
            $in:
              jobIds,
          },
          status:
            "hired",
        }),

        Application.countDocuments({
          job: {
            $in:
              jobIds,
          },
          status:
            "withdrawn",
        }),

        Interview.countDocuments({
          recruiter:
            recruiterId,
        }),

        Interview.countDocuments({
          recruiter:
            recruiterId,
          status:
            "scheduled",
        }),

        Interview.countDocuments({
          recruiter:
            recruiterId,
          status:
            "completed",
        }),

        Interview.countDocuments({
          recruiter:
            recruiterId,
          status:
            "cancelled",
        }),

        Application.find({
          job: {
            $in:
              jobIds,
          },
        })
          .populate(
            "candidate",
            "name email phone profileImage"
          )
          .populate({
            path: "job",
            select: "title companyId location jobType",
            populate: jobCompanyPopulate,
          })
          .sort({
            createdAt:
              -1,
          })
          .limit(8),

        Interview.find({
          recruiter:
            recruiterId,
          status:
            "scheduled",
          date: {
            $gte:
              now,
          },
        })
          .populate(
            "candidate",
            "name email phone profileImage"
          )
          .populate({
            path:
              "application",

            populate: {
              path:
                "job",

              select:
                "title companyId location jobType",

              populate: jobCompanyPopulate,
            },
          })
          .sort({
            date: 1,
          })
          .limit(8),

        Application.find({
          job: {
            $in:
              jobIds,
          },
        })
          .select(
            "_id createdAt status job"
          )
          .sort({
            createdAt:
              1,
          }),

        Application.aggregate([
          {
            $match: {
              job: {
                $in:
                  jobIds,
              },
            },
          },

          {
            $group: {
              _id:
                "$job",

              count: {
                $sum: 1,
              },
            },
          },
        ]),
      ]);

      // --------------------------------------------------
      // Job application counts
      // --------------------------------------------------

      const countMap =
        new Map();

      applicationCountsByJob.forEach(
        (item) => {
          countMap.set(
            getIdString(
              item._id
            ),
            item.count
          );
        }
      );

      const recentJobs =
        recruiterJobs
          .slice(0, 5)
          .map(
            (job) => {
              const jobObject =
                job.toObject();

              return {
                ...jobObject,

                applicationCount:
                  countMap.get(
                    getIdString(
                      job._id
                    )
                  ) || 0,
              };
            }
          );

      // --------------------------------------------------
      // Interview normalization
      // --------------------------------------------------

      const normalizedInterviews =
        upcomingInterviews.map(
          (interview) => {
            const object =
              interview.toObject();

            return {
              ...object,

              job:
                interview
                  .application
                  ?.job ||
                null,

              application:
                interview.application ||
                null,
            };
          }
        );

      // --------------------------------------------------
      // Overview
      // --------------------------------------------------

      const applicationOverview =
        buildLast7DaysOverview(
          overviewApplications
        );

      // --------------------------------------------------
      // Activity
      // --------------------------------------------------

      const recentActivity =
        buildActivity({
          recentApplications:
            recentApplications.slice(
              0,
              6
            ),

          upcomingInterviews:
            normalizedInterviews.slice(
              0,
              6
            ),

          recentJobs:
            recentJobs.slice(
              0,
              5
            ),
        });

      return res.status(200).json({
        success: true,

        message:
          "Recruiter dashboard fetched successfully",

        dashboard: {
          recruiter,

          // --------------------------------------------
          // Flat values
          // --------------------------------------------

          totalJobs,

          activeJobs,

          closedJobs,

          totalApplications,

          pendingApplications,

          reviewingApplications,

          shortlistedApplications,

          rejectedApplications,

          hiredApplications,

          withdrawnApplications,

          totalInterviews,

          scheduledInterviews,

          completedInterviews,

          cancelledInterviews,

          // --------------------------------------------
          // Statistics
          // --------------------------------------------

          statistics: {
            totalJobs,
            activeJobs,
            closedJobs,

            totalApplications,
            pendingApplications,
            reviewingApplications,
            shortlistedApplications,
            rejectedApplications,
            hiredApplications,
            withdrawnApplications,

            totalInterviews,
            scheduledInterviews,
            completedInterviews,
            cancelledInterviews,
          },

          // --------------------------------------------
          // Job counts
          // --------------------------------------------

          jobCounts: {
            total:
              totalJobs,

            active:
              activeJobs,

            closed:
              closedJobs,
          },

          // --------------------------------------------
          // Application counts
          // --------------------------------------------

          applicationCounts: {
            total:
              totalApplications,

            pending:
              pendingApplications,

            reviewing:
              reviewingApplications,

            shortlisted:
              shortlistedApplications,

            rejected:
              rejectedApplications,

            hired:
              hiredApplications,

            withdrawn:
              withdrawnApplications,
          },

          // --------------------------------------------
          // Interview counts
          // --------------------------------------------

          interviewCounts: {
            total:
              totalInterviews,

            scheduled:
              scheduledInterviews,

            completed:
              completedInterviews,

            cancelled:
              cancelledInterviews,
          },

          // --------------------------------------------
          // Main UI data
          // --------------------------------------------

          recentJobs,

          recentJobPostings:
            recentJobs,

          recentApplications:
            recentApplications.slice(
              0,
              5
            ),

          upcomingInterviews:
            normalizedInterviews.slice(
              0,
              5
            ),

          // --------------------------------------------
          // Charts / activity
          // --------------------------------------------

          applicationOverview,

          applicationChart:
            applicationOverview,

          recentActivity,

          activity:
            recentActivity,

          notifications:
            recentActivity,
        },
      });
    } catch (error) {
      return sendServerError(
        res,
        "Failed to fetch recruiter dashboard",
        error
      );
    }
  };

// ======================================================
// Admin Dashboard
// GET /api/dashboard/admin
// ======================================================

const getAdminDashboard =
  async (
    req,
    res
  ) => {
    try {
      if (
        req.user?.role !==
        "admin"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only admins can access the admin dashboard",
        });
      }

      const now =
        new Date();

      const [
        totalUsers,
        totalCandidates,
        totalRecruiters,
        totalAdmins,

        totalJobs,
        activeJobs,
        closedJobs,

        totalApplications,
        pendingApplications,
        reviewingApplications,
        shortlistedApplications,
        rejectedApplications,
        hiredApplications,
        withdrawnApplications,

        totalInterviews,
        scheduledInterviews,
        completedInterviews,
        cancelledInterviews,

        recentUsers,
        recentJobs,
        recentApplications,
        upcomingInterviews,
      ] = await Promise.all([
        // --------------------------------------------------
        // Users
        // --------------------------------------------------

        User.countDocuments(),

        User.countDocuments({
          role:
            "candidate",
        }),

        User.countDocuments({
          role:
            "recruiter",
        }),

        User.countDocuments({
          role:
            "admin",
        }),

        // --------------------------------------------------
        // Jobs
        // --------------------------------------------------

        Job.countDocuments(),

        Job.countDocuments({
          status:
            "active",
        }),

        Job.countDocuments({
          status:
            "closed",
        }),

        // --------------------------------------------------
        // Applications
        // --------------------------------------------------

        Application.countDocuments(),

        Application.countDocuments({
          status:
            "pending",
        }),

        Application.countDocuments({
          status:
            "reviewing",
        }),

        Application.countDocuments({
          status:
            "shortlisted",
        }),

        Application.countDocuments({
          status:
            "rejected",
        }),

        Application.countDocuments({
          status:
            "hired",
        }),

        Application.countDocuments({
          status:
            "withdrawn",
        }),

        // --------------------------------------------------
        // Interviews
        // --------------------------------------------------

        Interview.countDocuments(),

        Interview.countDocuments({
          status:
            "scheduled",
        }),

        Interview.countDocuments({
          status:
            "completed",
        }),

        Interview.countDocuments({
          status:
            "cancelled",
        }),

        // --------------------------------------------------
        // Recent users
        // --------------------------------------------------

        User.find()
          .select(
            "-password"
          )
          .sort({
            createdAt:
              -1,
          })
          .limit(5),

        // --------------------------------------------------
        // Recent jobs
        // --------------------------------------------------

        Job.find()
          .populate(
            "recruiter",
            "name email"
          )
          .populate(jobCompanyPopulate)
          .sort({
            createdAt:
              -1,
          })
          .limit(5),

        // --------------------------------------------------
        // Recent applications
        // --------------------------------------------------

        Application.find()
          .populate(
            "candidate",
            "name email"
          )
          .populate({
            path: "job",
            select: "title companyId location",
            populate: jobCompanyPopulate,
          })
          .sort({
            createdAt:
              -1,
          })
          .limit(5),

        // --------------------------------------------------
        // Upcoming interviews
        // --------------------------------------------------

        Interview.find({
          status:
            "scheduled",

          date: {
            $gte:
              now,
          },
        })
          .populate(
            "candidate",
            "name email"
          )
          .populate({
            path:
              "application",

            populate: {
              path:
                "job",

              select:
                "title companyId location",

              populate: jobCompanyPopulate,
            },
          })
          .populate(
            "recruiter",
            "name email"
          )
          .sort({
            date: 1,
          })
          .limit(5),
      ]);

      // --------------------------------------------------
      // Normalize interviews
      // --------------------------------------------------

      const normalizedInterviews =
        upcomingInterviews.map(
          (interview) => {
            const interviewObject =
              interview.toObject();

            return {
              ...interviewObject,

              job:
                interview
                  .application
                  ?.job ||
                null,

              application:
                interview.application ||
                null,
            };
          }
        );

      return res.status(200).json({
        success: true,

        message:
          "Admin dashboard fetched successfully",

        dashboard: {
          statistics: {
            totalUsers,
            totalCandidates,
            totalRecruiters,
            totalAdmins,

            totalJobs,
            activeJobs,
            closedJobs,

            totalApplications,
            pendingApplications,
            reviewingApplications,
            shortlistedApplications,
            rejectedApplications,
            hiredApplications,
            withdrawnApplications,

            totalInterviews,
            scheduledInterviews,
            completedInterviews,
            cancelledInterviews,
          },

          // Flat values for compatibility
          totalUsers,
          totalCandidates,
          totalRecruiters,
          totalAdmins,

          totalJobs,
          activeJobs,
          closedJobs,

          totalApplications,
          pendingApplications,
          reviewingApplications,
          shortlistedApplications,
          rejectedApplications,
          hiredApplications,
          withdrawnApplications,

          totalInterviews,
          scheduledInterviews,
          completedInterviews,
          cancelledInterviews,

          recentUsers,

          recentJobs,

          recentApplications,

          upcomingInterviews:
            normalizedInterviews,
        },
      });
    } catch (error) {
      return sendServerError(
        res,
        "Failed to fetch admin dashboard",
        error
      );
    }
  };

// ======================================================
// Profile Completion
// ======================================================

function calculateProfileCompletion(
  user
) {
  if (!user) {
    return 0;
  }

  const checks = [
    Boolean(
      user.name ||
        user.fullName ||
        user.username
    ),

    Boolean(
      user.email
    ),

    Boolean(
      user.phone
    ),

    Boolean(
      user.profileImage ||
        user.avatar ||
        user.photo
    ),

    Boolean(
      Array.isArray(
        user.skills
      )
        ? user.skills.length > 0
        : user.skills
    ),

    Boolean(
      user.education
    ),

    Boolean(
      user.experience ||
        user.workExperience
    ),

    Boolean(
      user.resume ||
        user.cv ||
        user.resumeUrl
    ),
  ];

  const completed =
    checks.filter(
      Boolean
    ).length;

  return Math.round(
    (completed /
      checks.length) *
      100
  );
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getCandidateDashboard,
  getRecruiterDashboard,
  getAdminDashboard,
};