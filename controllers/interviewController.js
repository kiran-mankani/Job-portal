const Interview = require("../models/Interview");
const Application = require("../models/Application");
const Job = require("../models/Job");

// 25. RECRUITER SCHEDULE INTERVIEW
// POST /api/interviews
const scheduleInterview = async (req, res) => {
  try {
    const {
      applicationId,
      candidateId,
      date,
      duration,
      mode,
      meetingLink,
      location,
      notes,
    } = req.body;

    if (!applicationId || !candidateId || !date || !mode) {
      return res.status(400).json({
        success: false,
        message: "applicationId, candidateId, date and mode are required",
      });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.candidate.toString() !== candidateId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Candidate does not match the application",
      });
    }

    const job = await Job.findById(application.job);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to schedule interview for this application",
      });
    }

    const interview = await Interview.create({
      application: applicationId,
      candidate: candidateId,
      recruiter: req.user._id,
      date,
      duration: duration || 30,
      mode,
      meetingLink: meetingLink || "",
      location: location || "",
      notes: notes || "",
      status: "scheduled",
    });

    const populatedInterview = await Interview.findById(interview._id)
      .populate("application")
      .populate("candidate", "-password")
      .populate("recruiter", "-password");

    return res.status(201).json({
      success: true,
      message: "Interview scheduled successfully",
      interview: populatedInterview,
    });
  } catch (error) {
    console.error("Schedule Interview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to schedule interview",
      error: error.message,
    });
  }
};

// 26. CANDIDATE VIEW INTERVIEWS
// GET /api/interviews/my-interviews
const getCandidateInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({
      candidate: req.user._id,
    })
      .populate("application")
      .populate("recruiter", "-password")
      .sort({ date: 1 });

    return res.status(200).json({
      success: true,
      message: "Candidate interviews fetched successfully",
      count: interviews.length,
      interviews,
    });
  } catch (error) {
    console.error("Get Candidate Interviews Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch candidate interviews",
      error: error.message,
    });
  }
};

// 27. RECRUITER VIEW INTERVIEWS
// GET /api/interviews/recruiter-interviews
const getRecruiterInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({
      recruiter: req.user._id,
    })
      .populate("candidate", "-password")
      .populate("application")
      .sort({ date: 1 });

    return res.status(200).json({
      success: true,
      message: "Recruiter interviews fetched successfully",
      count: interviews.length,
      interviews,
    });
  } catch (error) {
    console.error("Get Recruiter Interviews Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch recruiter interviews",
      error: error.message,
    });
  }
};

// 28. UPDATE / RESCHEDULE INTERVIEW
// PUT /api/interviews/:id
const updateInterview = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      scheduledAt,
      duration,
      meetingLink,
      location,
      notes,
      status,
    } = req.body;

    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (
      interview.recruiter &&
      interview.recruiter.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this interview",
      });
    }

    if (scheduledAt !== undefined) {
      interview.date = scheduledAt;
    }

    if (duration !== undefined) {
      interview.duration = duration;
    }

    if (meetingLink !== undefined) {
      interview.meetingLink = meetingLink;
    }

    if (location !== undefined) {
      interview.location = location;
    }

    if (notes !== undefined) {
      interview.notes = notes;
    }

    if (status !== undefined) {
      const allowedStatuses = [
        "scheduled",
        "completed",
        "cancelled",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Allowed values: scheduled, completed, cancelled",
        });
      }

      interview.status = status;
    }

    await interview.save();

    const updatedInterview = await Interview.findById(interview._id)
      .populate("application")
      .populate("candidate", "-password")
      .populate("recruiter", "-password");

    return res.status(200).json({
      success: true,
      message: "Interview updated/rescheduled successfully",
      interview: updatedInterview,
    });
  } catch (error) {
    console.error("Update Interview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update interview",
      error: error.message,
    });
  }
};

// 29. CANCEL INTERVIEW
// PATCH /api/interviews/:id/cancel
const cancelInterview = async (req, res) => {
  try {
    const { id } = req.params;

    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (
      interview.recruiter &&
      interview.recruiter.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this interview",
      });
    }

    if (interview.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Interview is already cancelled",
      });
    }

    if (interview.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed interview cannot be cancelled",
      });
    }

    interview.status = "cancelled";

    await interview.save();

    const cancelledInterview = await Interview.findById(interview._id)
      .populate("application")
      .populate("candidate", "-password")
      .populate("recruiter", "-password");

    return res.status(200).json({
      success: true,
      message: "Interview cancelled successfully",
      interview: cancelledInterview,
    });
  } catch (error) {
    console.error("Cancel Interview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel interview",
      error: error.message,
    });
  }
};

module.exports = {
  scheduleInterview,
  getCandidateInterviews,
  getRecruiterInterviews,
  updateInterview,
  cancelInterview,
};