const mongoose = require('mongoose');
const SystemAnnouncement = require('../models/SystemAnnouncement');
const AuditLog = require('../models/AuditLog');
const { cloudinary } = require('../config/cloudinary');

// ── Audit helper ─────────────────────────────────────────────────────────────
const logAudit = async (action, req, details) => {
  try {
    await AuditLog.create({
      action,
      performedBy: req?.user?.email || req?.user?.id || req?.user?._id || 'Admin',
      target: 'SystemAnnouncement',
      status: 'SUCCESS',
      details: details || '',
    });
  } catch (err) {
    console.warn('AuditLog non-blocking error:', err.message);
  }
};

// ── ID generator ──────────────────────────────────────────────────────────────
const generateAnnouncementId = async () => {
  const prefix = 'ANN';
  const year = new Date().getFullYear().toString().slice(-2);

  const last = await SystemAnnouncement.findOne({
    announcementId: new RegExp(`^${prefix}${year}`),
  }).sort({ announcementId: -1 });

  let sequence = 1;
  if (last && last.announcementId) {
    const lastSeq = parseInt(last.announcementId.slice(-4), 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  return `${prefix}${year}${sequence.toString().padStart(4, '0')}`;
};

// ── Helper: extract Cloudinary public_id and resource_type from a stored URL ─
// Cloudinary URLs look like:
//   https://res.cloudinary.com/<cloud>/image/upload/v123456/system-announcements/filename.jpg
//   https://res.cloudinary.com/<cloud>/raw/upload/v123456/system-announcements/filename.pdf
//
// For image resource_type: public_id does NOT include the file extension.
// For raw resource_type:   public_id INCLUDES the file extension (Cloudinary requirement).
const extractPublicIdAndType = (url) => {
  try {
    // Capture resource_type segment (image / raw / video) and everything after /upload/
    const match = url.match(/\/([a-z]+)\/upload\/(?:v\d+\/)?(.+)/);
    if (!match) return { publicId: null, resourceType: 'image' };

    const resourceType = match[1]; // 'image' or 'raw'
    let publicId = match[2];       // e.g. 'system-announcements/filename.pdf'

    // For images, strip the extension; for raw files keep it (Cloudinary requires it)
    if (resourceType === 'image') {
      publicId = publicId.replace(/\.[^/.]+$/, '');
    }

    return { publicId, resourceType };
  } catch {
    return { publicId: null, resourceType: 'image' };
  }
};

// ── DOWNLOAD PROXY ────────────────────────────────────────────────────────────
// Fetches a Cloudinary file server-side and streams it to the browser.
// This bypasses CORS issues and Cloudinary raw-file delivery restrictions that
// prevent the browser from directly fetching /raw/upload/ URLs.
//
// GET /api/system-announcements/download-proxy?url=<cloudinary_url>
exports.downloadProxy = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: 'url query parameter is required.' });
    }

    // Only proxy Cloudinary URLs belonging to this account
    if (!url.includes('cloudinary.com')) {
      return res.status(400).json({ message: 'Only Cloudinary URLs can be proxied.' });
    }

    // Extract the filename from the URL for Content-Disposition
    const urlPath = new URL(url).pathname;
    const segments = urlPath.split('/');
    const rawFilename = segments[segments.length - 1] || 'attachment';
    const filename = decodeURIComponent(rawFilename.split('?')[0]);

    // Determine content-type from the file extension
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Fetch the file from Cloudinary server-side using built-in https
    const https = require('https');
    https.get(url, (upstream) => {
      // Follow redirects (Cloudinary may 301/302)
      if (upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
        https.get(upstream.headers.location, (redirected) => {
          if (redirected.statusCode !== 200) {
            return res.status(redirected.statusCode).json({
              message: `Cloudinary returned HTTP ${redirected.statusCode}.`,
            });
          }
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          if (redirected.headers['content-length']) {
            res.setHeader('Content-Length', redirected.headers['content-length']);
          }
          redirected.pipe(res);
        }).on('error', (err) => {
          console.error('Redirect fetch error:', err);
          res.status(500).json({ message: 'Failed to download file.' });
        });
        return;
      }

      if (upstream.statusCode !== 200) {
        return res.status(upstream.statusCode).json({
          message: `Cloudinary returned HTTP ${upstream.statusCode} for the requested file.`,
        });
      }

      // Set response headers for download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      if (upstream.headers['content-length']) {
        res.setHeader('Content-Length', upstream.headers['content-length']);
      }

      // Stream the file to the client
      upstream.pipe(res);
    }).on('error', (err) => {
      console.error('Error fetching from Cloudinary:', err);
      res.status(500).json({ message: 'Failed to download file.', error: err.message });
    });
  } catch (error) {
    console.error('Error proxying download:', error);
    return res.status(500).json({ message: 'Failed to download file.', error: error.message });
  }
};

// ── CREATE ────────────────────────────────────────────────────────────────────
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, departments, description, fileUrl } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    // At least one of description or file URL must be provided
    const hasDescription = description && description.trim().length > 0;
    const hasFile = fileUrl && fileUrl.trim().length > 0;

    if (!hasDescription && !hasFile) {
      return res.status(400).json({
        message: 'Please provide either a description or upload a file for the announcement.',
      });
    }

    // Parse departments (may arrive as JSON string or already an array)
    let parsedDepartments = [];
    if (departments) {
      if (typeof departments === 'string') {
        try {
          parsedDepartments = JSON.parse(departments);
        } catch {
          parsedDepartments = [departments];
        }
      } else if (Array.isArray(departments)) {
        parsedDepartments = departments;
      }
    }

    // Validate each department ObjectId
    const validDepts = parsedDepartments.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    const announcementId = await generateAnnouncementId();
    const userId = req.user?.id || req.user?._id || null;

    const announcement = new SystemAnnouncement({
      announcementId,
      title: title.trim(),
      description: hasDescription ? description.trim() : '',
      fileUrl: hasFile ? fileUrl.trim() : null,
      departments: validDepts,
      createdBy: userId,
    });

    await announcement.save();

    await logAudit('CREATE_SYSTEM_ANNOUNCEMENT', req, `Created announcement: ${title.trim()}`);

    const populated = await SystemAnnouncement.findById(announcement._id)
      .populate('departments', 'departmentId name')
      .populate('createdBy', 'name email');

    return res.status(201).json({
      message: 'System announcement created successfully.',
      announcement: populated,
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return res.status(500).json({ message: 'Failed to create announcement.', error: error.message });
  }
};

// ── GET ALL (paginated) ───────────────────────────────────────────────────────
exports.getAllAnnouncements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      department = '',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (search && search.trim()) {
      filter.title = { $regex: search.trim(), $options: 'i' };
    }

    if (department && mongoose.Types.ObjectId.isValid(department)) {
      filter.departments = department;
    }

    const [announcements, total] = await Promise.all([
      SystemAnnouncement.find(filter)
        .populate('departments', 'departmentId name')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SystemAnnouncement.countDocuments(filter),
    ]);

    return res.status(200).json({
      announcements,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// ── GET SINGLE ────────────────────────────────────────────────────────────────
exports.getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    let announcement = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      announcement = await SystemAnnouncement.findById(id)
        .populate('departments', 'departmentId name')
        .populate('createdBy', 'name email');
    } else {
      announcement = await SystemAnnouncement.findOne({
        announcementId: id.toUpperCase(),
      })
        .populate('departments', 'departmentId name')
        .populate('createdBy', 'name email');
    }

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    return res.status(200).json(announcement);
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid announcement ID.' });
    }

    const announcement = await SystemAnnouncement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    const { title, departments, description, fileUrl } = req.body;

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: 'Title cannot be empty.' });
      announcement.title = title.trim();
    }

    if (description !== undefined) {
      announcement.description = description.trim();
    }

    // Handle file URL update — the browser uploads directly to Cloudinary and
    // sends back the resulting URL.  If a new URL is provided and differs from
    // the stored one, delete the old Cloudinary asset first.
    if (fileUrl !== undefined) {
      const newUrl = fileUrl ? fileUrl.trim() : null;
      if (newUrl !== announcement.fileUrl) {
        // Delete old Cloudinary asset if one exists
        if (announcement.fileUrl && announcement.fileUrl.includes('cloudinary')) {
          const { publicId, resourceType } = extractPublicIdAndType(announcement.fileUrl);
          if (publicId) {
            try {
              await cloudinary.uploader.destroy(publicId, { resource_type: resourceType }).catch(() => {});
            } catch (err) {
              console.warn('Cloudinary delete warning:', err.message);
            }
          }
        }
        announcement.fileUrl = newUrl;
      }
    }

    // Parse and update departments
    if (departments !== undefined) {
      let parsedDepartments = [];
      if (typeof departments === 'string') {
        try {
          parsedDepartments = JSON.parse(departments);
        } catch {
          parsedDepartments = [departments];
        }
      } else if (Array.isArray(departments)) {
        parsedDepartments = departments;
      }
      announcement.departments = parsedDepartments.filter((did) =>
        mongoose.Types.ObjectId.isValid(did)
      );
    }

    await announcement.save();

    await logAudit('UPDATE_SYSTEM_ANNOUNCEMENT', req, `Updated announcement: ${announcement.title}`);

    const populated = await SystemAnnouncement.findById(announcement._id)
      .populate('departments', 'departmentId name')
      .populate('createdBy', 'name email');

    return res.status(200).json({
      message: 'Announcement updated successfully.',
      announcement: populated,
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return res.status(500).json({ message: 'Failed to update announcement.', error: error.message });
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid announcement ID.' });
    }

    const announcement = await SystemAnnouncement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    // Delete associated Cloudinary file if present
    if (announcement.fileUrl && announcement.fileUrl.includes('cloudinary')) {
      const { publicId, resourceType } = extractPublicIdAndType(announcement.fileUrl);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: resourceType }).catch(() => {});
        } catch (err) {
          console.warn('Cloudinary delete warning on record delete:', err.message);
        }
      }
    }

    await SystemAnnouncement.findByIdAndDelete(id);

    await logAudit(
      'DELETE_SYSTEM_ANNOUNCEMENT',
      req,
      `Deleted announcement: ${announcement.title} (${announcement.announcementId})`
    );

    return res.status(200).json({ message: 'Announcement deleted successfully.' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return res.status(500).json({ message: 'Failed to delete announcement.', error: error.message });
  }
};
