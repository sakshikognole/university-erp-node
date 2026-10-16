const AcademicResource = require('../models/AcademicResource');

// Upload academic resource — stores file as Base64 in MongoDB (works on any host)
const uploadAcademicResource = async (req, res) => {
  try {
    const { title, subject } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ message: 'Title and subject are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    // Convert file buffer to Base64
    const base64Data = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    // Create a data URL so the frontend can open it directly
    const fileUrl = `data:${mimeType};base64,${base64Data}`;

    const resource = await AcademicResource.create({
      title,
      subject,
      fileUrl,
      publicId: req.file.originalname,
      fileData: base64Data,
      mimeType,
    });

    // Return without the large base64 data in the response
    const resourceResponse = {
      _id: resource._id,
      title: resource.title,
      subject: resource.subject,
      fileUrl: resource.fileUrl,
      publicId: resource.publicId,
      mimeType: resource.mimeType,
      createdAt: resource.createdAt,
    };

    res.status(201).json({ message: 'Academic resource uploaded successfully', resource: resourceResponse });
  } catch (error) {
    console.error('Upload academic resource error:', error);
    res.status(500).json({ message: 'Failed to upload academic resource', error: error.message });
  }
};

// Get all academic resources
const getAllAcademicResources = async (req, res) => {
  try {
    const resources = await AcademicResource.find()
      .sort({ createdAt: -1 })
      .select('-fileData'); // Exclude large base64 from list — fileUrl already has it

    res.status(200).json({ resources });
  } catch (error) {
    console.error('Get academic resources error:', error);
    res.status(500).json({ message: 'Failed to fetch academic resources', error: error.message });
  }
};

// Get resources by subject
const getAcademicResourcesBySubject = async (req, res) => {
  try {
    const { subject } = req.params;
    const resources = await AcademicResource.find({ subject })
      .sort({ createdAt: -1 })
      .select('-fileData');

    res.status(200).json({ resources });
  } catch (error) {
    console.error('Get resources by subject error:', error);
    res.status(500).json({ message: 'Failed to fetch resources', error: error.message });
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
