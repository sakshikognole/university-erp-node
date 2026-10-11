const AcademicResource = require('../models/AcademicResource');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');


// Upload academic resource
const uploadAcademicResource = async (req, res) => {
  try {
    const { title, subject } = req.body;

    // Validate fields
    if (!title || !subject) {
      return res.status(400).json({
        message: 'Title and subject are required'
      });
    }

    // Validate file
    if (!req.file) {
      return res.status(400).json({
        message: 'Please upload a file'
      });
    }

    // Upload file to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'academic-resources',
          resource_type: 'raw'
        },

        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      streamifier
        .createReadStream(req.file.buffer)
        .pipe(uploadStream);
    });

    // Save Cloudinary information in MongoDB
    const resource = await AcademicResource.create({
      title,
      subject,
      fileUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id
    });

    res.status(201).json({
      message: 'Academic resource uploaded successfully',
      resource
    });

  } catch (error) {

    console.error(
      'Upload academic resource error:',
      error
    );

    res.status(500).json({
      message: 'Failed to upload academic resource',
      error: error.message
    });
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
      return res.status(404).json({
        message: 'Academic resource not found'
      });
    }

    // Delete file from Cloudinary
    await cloudinary.uploader.destroy(
      resource.publicId,
      {
        resource_type: 'raw'
      }
    );

    // Delete record from MongoDB
    await AcademicResource.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Academic resource deleted successfully'
    });

  } catch (error) {

    console.error(
      'Delete academic resource error:',
      error
    );

    res.status(500).json({
      message: 'Failed to delete academic resource',
      error: error.message
    });
  }
};


module.exports = {
  uploadAcademicResource,
  getAllAcademicResources,
  getAcademicResourcesBySubject,
  deleteAcademicResource
};