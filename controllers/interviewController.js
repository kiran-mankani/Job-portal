const Interview = require("../models/Interview");
const Application = require("../models/Application");

// ==========================================
// 25. RECRUITER SCHEDULE INTERVIEW
// POST /api/interviews
// ==========================================

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

    // Check required fields
    if (!applicationId || !candidateId || !date || !mode) {
      return res.status(400).json({
        success: false,
        message:
          "applicationId, candidateId, date and mode are required",
      });
    }

    // Check application
    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Create interview
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

    return res.status(201).json({
      success: true,
      message: "Interview scheduled successfully",
      interview,
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

// ==========================================
// 26. CANDIDATE VIEW INTERVIEWS
// GET /api/interviews/my-interviews
// ==========================================

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

// ==========================================
// 27. RECRUITER VIEW INTERVIEWS
// GET /api/interviews/recruiter-interviews
// ==========================================

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

// ==========================================
// 28. UPDATE / RESCHEDULE INTERVIEW
// PUT /api/interviews/:id
// ==========================================

const updateInterview = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      scheduledAt,
      duration,
      meetingLink,
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

    // Only the recruiter who created the interview can update it
    if (
      interview.recruiter &&
      interview.recruiter.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this interview",
      });
    }

    // Interview model uses "date", not "scheduledAt"
    if (scheduledAt !== undefined) {
      interview.date = scheduledAt;
    }

    if (duration !== undefined) {
      interview.duration = duration;
    }

    if (meetingLink !== undefined) {
      interview.meetingLink = meetingLink;
    }

    if (notes !== undefined) {
      interview.notes = notes;
    }

    if (status !== undefined) {
      interview.status = status;
    }

    const updatedInterview = await interview.save();

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

// ==========================================
// 29. CANCEL INTERVIEW
// PATCH /api/interviews/:id/cancel
// ==========================================

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

    // Only the recruiter who created the interview can cancel it
    if (
      interview.recruiter &&
      interview.recruiter.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this interview",
      });
    }

    interview.status = "cancelled";

    const cancelledInterview = await interview.save();

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

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  scheduleInterview,
  getCandidateInterviews,
  getRecruiterInterviews,
  updateInterview,
  cancelInterview,
};