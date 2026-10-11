const Announcement = require('../models/Announcement');
const Submission = require('../models/Submission');

const createAnnouncement = async (req, res) => {
  try {
    const { title, description, subject, teacher, deadline } = req.body;

    // Validate required fields
    if (!title || !description || !subject || !teacher || !deadline) {
      return res.status(400).json({
        message: 'All fields are required'
      });
    }

    // Create announcement
    const announcement = await Announcement.create({
      title,
      description,
      subject,
      teacher,
      deadline
    });

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement
    });

  } catch (error) {
    console.error('Create announcement error:', error);

    res.status(500).json({
      message: 'Failed to create announcement',
      error: error.message
    });
  }
};

const getAnnouncementsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const announcements = await Announcement.find({
      subject: subjectId
    }).sort({ createdAt: -1 });

    res.status(200).json({
      announcements
    });

  } catch (error) {
    console.error('Get announcements error:', error);

    res.status(500).json({
      message: 'Failed to fetch announcements',
      error: error.message
    });
  }
};

const submitWork = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { student, file } = req.body;

    // Validate required fields
    if (!student || !file) {
      return res.status(400).json({
        message: 'Student and file are required'
      });
    }

    // Find the announcement
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

    // Create submission
    const submission = await Submission.create({
      announcement: announcementId,
      student,
      file
    });

    res.status(201).json({
      message: 'Work submitted successfully',
      submission
    });

  } catch (error) {
    console.error('Submit work error:', error);

    res.status(500).json({
      message: 'Failed to submit work',
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

const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      announcements
    });

  } catch (error) {
    console.error('Get all announcements error:', error);

    res.status(500).json({
      message: 'Failed to fetch announcements',
      error: error.message
    });
  }
};


const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found'
      });
    }

    res.status(200).json({
      message: 'Announcement deleted successfully'
    });

  } catch (error) {
    console.error('Delete announcement error:', error);

    res.status(500).json({
      message: 'Failed to delete announcement',
      error: error.message
    });
  }
};

const getAnnouncementById = async (req, res) => {
  try {
    const { announcementId } = req.params;

    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found'
      });
    }

    res.status(200).json({
      announcement
    });

  } catch (error) {
    console.error('Get announcement error:', error);

    res.status(500).json({
      message: 'Failed to fetch announcement',
      error: error.message
    });
  }
};


const updateAnnouncementDeadline = async (req, res) => {
  try {
    const { id } = req.params;
    const { deadline } = req.body;

    if (!deadline) {
      return res.status(400).json({
        message: 'Deadline is required'
      });
    }

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { deadline },
      { new: true, runValidators: true }
    );

    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found'
      });
    }

    res.status(200).json({
      message: 'Deadline updated successfully',
      announcement
    });

  } catch (error) {
    console.error('Update deadline error:', error);

    res.status(500).json({
      message: 'Failed to update deadline',
      error: error.message
    });
  }
};

module.exports = {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementsBySubject,
  getAnnouncementById,
  updateAnnouncementDeadline,
  submitWork,
  getSubmissions,
  deleteAnnouncement

};