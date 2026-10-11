const Announcement = require('../models/Announcement');
const Submission = require('../models/Submission');
const cloudinary = require('../config/cloudinary');

const submitAssignment = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { student } = req.body;

    // Check student
    if (!student) {
      return res.status(400).json({
        message: 'Student is required'
      });
    }

    // Check file
    if (!req.file) {
      return res.status(400).json({
        message: 'Please upload a file'
      });
    }

    // Find announcement
    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found'
      });
    }

    // Check deadline
    if (new Date() > new Date(announcement.deadline)) {
      return res.status(400).json({
        message: 'Submission deadline has passed'
      });
    }

    const existingSubmission = await Submission.findOne({
      announcement: announcementId,
      student
    });

    if (existingSubmission) {
      return res.status(400).json({
        message: 'You have already submitted this assignment',
        submission: existingSubmission
      });
    }

    // Convert file to data URI
    const base64File = req.file.buffer.toString('base64');

    const dataUri = `data:${req.file.mimetype};base64,${base64File}`;

    // Upload to Cloudinary
    const cloudinaryResult = await cloudinary.uploader.upload(
      dataUri,
      {
        folder: 'university-erp/submissions',
        resource_type: 'auto'
      }
    );

    // Save Cloudinary URL in MongoDB
    const submission = await Submission.create({
      announcement: announcementId,
      student,
      file: cloudinaryResult.secure_url
    });

    res.status(201).json({
      message: 'Assignment submitted successfully',
      submission
    });

  } catch (error) {
    console.error('Submit assignment error:', error);

    res.status(500).json({
      message: 'Failed to submit assignment',
      error: error.message
    });
  }
};

const getSubmissions = async (req, res) => {
  try {
    const { announcementId } = req.params;

    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found'
      });
    }

    const submissions = await Submission.find({
      announcement: announcementId
    }).sort({ submittedAt: -1 });

    res.status(200).json({
      announcement: announcement.title,
      submissions
    });

  } catch (error) {
    console.error('Get submissions error:', error);

    res.status(500).json({
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
};

const getStudentSubmission = async (req, res) => {
  try {
    const { announcementId, student } = req.params;

    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found'
      });
    }

    const submission = await Submission.findOne({
      announcement: announcementId,
      student: student
    });

    // Student has not submitted yet
    if (!submission) {
      return res.status(200).json({
        submission: null
      });
    }

    res.status(200).json({
      submission
    });

  } catch (error) {
    console.error('Get student submission error:', error);

    res.status(500).json({
      message: 'Failed to fetch student submission',
      error: error.message
    });
  }
};

const updateMarks = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { marks } = req.body;

    // Check marks
    if (marks === undefined || marks === null || marks === '') {
      return res.status(400).json({
        message: 'Marks are required'
      });
    }

    // Validate marks
    if (Number(marks) < 0) {
      return res.status(400).json({
        message: 'Marks cannot be negative'
      });
    }

    // Find submission
    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({
        message: 'Submission not found'
      });
    }

    // Update marks
    submission.marks = Number(marks);

    await submission.save();

    res.status(200).json({
      message: 'Marks updated successfully',
      submission
    });

  } catch (error) {
    console.error('Update marks error:', error);

    res.status(500).json({
      message: 'Failed to update marks',
      error: error.message
    });
  }
};

module.exports = {
  submitAssignment,
  getSubmissions,
  getStudentSubmission,
  updateMarks
};  