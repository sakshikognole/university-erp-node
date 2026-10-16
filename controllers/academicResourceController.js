const AcademicResource = require('../models/AcademicResource');

// Upload academic resource — stores file as Base64 in MongoDB
const uploadAcademicResource = async (req, res) => {
  try {
    const { title, subject } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ message: 'Title and subject are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const base64Data = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const originalName = req.file.originalname;

    // Create with placeholder fileUrl first
    const resource = await AcademicResource.create({
      title,
      subject,
      fileUrl: 'pending',
      publicId: originalName,
      fileData: base64Data,
      mimeType,
    });

    // Update fileUrl to point to the download endpoint using the resource _id
    resource.fileUrl = `/api/resources/download/${resource._id}`;
    await resource.save();

    res.status(201).json({
      message: 'Academic resource uploaded successfully',
      resource: {
        _id: resource._id,
        title: resource.title,
        subject: resource.subject,
        fileUrl: resource.fileUrl,
        publicId: resource.publicId,
        mimeType: resource.mimeType,
        createdAt: resource.createdAt,
      }
    });
  } catch (error) {
    console.error('Upload academic resource error:', error);
    res.status(500).json({ message: 'Failed to upload academic resource', error: error.message });
  }
};

// Download / serve a resource file by ID
const downloadAcademicResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await AcademicResource.findById(id);

    if (!resource) {
      return res.status(404).json({ message: 'Academic resource not found' });
    }

    if (!resource.fileData) {
      // Old record uploaded before Base64 fix — tell user to re-upload
      return res.status(410).json({ 
        message: 'File not available. This resource was uploaded before the storage update. Please delete it and re-upload the file.' 
      });
    }

    const fileBuffer = Buffer.from(resource.fileData, 'base64');
    const mimeType = resource.mimeType || 'application/octet-stream';
    const fileName = resource.publicId || 'resource';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Download academic resource error:', error);
    res.status(500).json({ message: 'Failed to download resource', error: error.message });
  }
};

// Get all academic resources
const getAllAcademicResources = async (req, res) => {
  try {
    const resources = await AcademicResource.find()
      .sort({ createdAt: -1 })
      .select('-fileData');

    // Fix fileUrl for old records that have localhost or invalid URLs
    const fixed = resources.map(r => {
      const obj = r.toObject();
      if (!obj.fileUrl || obj.fileUrl === 'pending' ||
          obj.fileUrl.includes('localhost') ||
          obj.fileUrl.includes('127.0.0.1') ||
          obj.fileUrl.startsWith('data:') ||
          !obj.fileUrl.startsWith('/api')) {
        obj.fileUrl = `/api/resources/download/${obj._id}`;
      }
      return obj;
    });

    res.status(200).json({ resources: fixed });
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
  downloadAcademicResource,
  getAllAcademicResources,
  getAcademicResourcesBySubject,
  deleteAcademicResource
};
