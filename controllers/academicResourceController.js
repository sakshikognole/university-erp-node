const AcademicResource = require('../models/AcademicResource');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'academic-resources');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Upload academic resource — saves to local disk
const uploadAcademicResource = async (req, res) => {
  try {
    const { title, subject } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ message: 'Title and subject are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    // Save file to disk
    const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    // Build a URL the frontend can use to open the file
    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = isProduction
      ? (process.env.BACKEND_NODE_URL || 'https://university-erp-node.onrender.com')
      : 'http://localhost:5000';
    const fileUrl = `${baseUrl}/uploads/academic-resources/${fileName}`;

    const resource = await AcademicResource.create({
      title,
      subject,
      fileUrl,
      publicId: fileName,
    });

    res.status(201).json({ message: 'Academic resource uploaded successfully', resource });
  } catch (error) {
    console.error('Upload academic resource error:', error);
    res.status(500).json({ message: 'Failed to upload academic resource', error: error.message });
  }
};


// Get all academic resources
const getAllAcademicResources = async (req, res) => {
  try {

    const resources = await AcademicResource.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      resources
    });

  } catch (error) {

    console.error(
      'Get academic resources error:',
      error
    );

    res.status(500).json({
      message: 'Failed to fetch academic resources',
      error: error.message
    });
  }
};


// Get resources by subject
const getAcademicResourcesBySubject = async (req, res) => {
  try {

    const { subject } = req.params;

    const resources = await AcademicResource.find({
      subject
    }).sort({ createdAt: -1 });

    res.status(200).json({
      resources
    });

  } catch (error) {

    console.error(
      'Get resources by subject error:',
      error
    );

    res.status(500).json({
      message: 'Failed to fetch resources',
      error: error.message
    });
  }
};


// Delete academic resource
const deleteAcademicResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await AcademicResource.findById(id);
    if (!resource) {
      return res.status(404).json({ message: 'Academic resource not found' });
    }

    // Delete file from local disk if it exists
    const filePath = path.join(uploadsDir, resource.publicId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await AcademicResource.findByIdAndDelete(id);
    res.status(200).json({ message: 'Academic resource deleted successfully' });
  } catch (error) {
    console.error('Delete academic resource error:', error);
    res.status(500).json({ message: 'Failed to delete academic resource', error: error.message });
  }
};


module.exports = {
  uploadAcademicResource,
  getAllAcademicResources,
  getAcademicResourcesBySubject,
  deleteAcademicResource
};