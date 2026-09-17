const mongoose = require('mongoose');
const Alumni = require('../models/Alumni');
const AuditLog = require('../models/AuditLog');

const logAudit = async (action, req, details) => {
  try {
    await AuditLog.create({
      action,
      performedBy: req?.user?.email || req?.user?.id || 'Admin',
      target: 'Alumni',
      status: 'SUCCESS',
      details: details || '',
    });
  } catch (err) {
    console.warn('AuditLog non-blocking:', err.message);
  }
};

// Auto-generate next alumniId e.g. ALM0001
const generateAlumniId = async () => {
  const last = await Alumni.findOne({}, {}, { sort: { createdAt: -1 } }).lean();
  if (!last || !last.alumniId) return 'ALM0001';
  const num = parseInt(last.alumniId.replace(/\D/g, ''), 10) || 0;
  return `ALM${String(num + 1).padStart(4, '0')}`;
};

// GET /api/alumni
exports.getAll = async (req, res) => {
  try {
    const { search, year } = req.query;
    const filter = {};
    if (year) filter.graduationYear = Number(year);
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [{ name: q }, { alumniId: q }, { jobTitle: q }, { currentCompany: q }, { email: q }];
    }
    const alumni = await Alumni.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json(alumni);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching alumni', error: err.message });
  }
};

// GET /api/alumni/:id
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    let alumni = null;
    if (mongoose.Types.ObjectId.isValid(id)) alumni = await Alumni.findById(id).lean();
    if (!alumni) alumni = await Alumni.findOne({ alumniId: id.toUpperCase() }).lean();
    if (!alumni) return res.status(404).json({ message: 'Alumni not found' });
    return res.status(200).json(alumni);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching alumni', error: err.message });
  }
};

// POST /api/alumni
exports.create = async (req, res) => {
  try {
    const { name, graduationYear, jobTitle, currentCompany, socialLinks, email, phone, alumniId } = req.body;
    if (!name || !graduationYear) {
      return res.status(400).json({ message: 'Name and Graduation Year are required.' });
    }
    const resolvedId = alumniId ? alumniId.trim().toUpperCase() : await generateAlumniId();
    const existing = await Alumni.findOne({ alumniId: resolvedId });
    if (existing) return res.status(409).json({ message: `Alumni ID '${resolvedId}' already exists.` });

    const alumni = await Alumni.create({
      alumniId: resolvedId,
      name: name.trim(),
      graduationYear: Number(graduationYear),
      jobTitle: jobTitle?.trim() || '',
      currentCompany: currentCompany?.trim() || '',
      socialLinks: socialLinks || {},
      email: email?.trim().toLowerCase() || '',
      phone: phone?.trim() || '',
    });

    await logAudit('CREATE_ALUMNI', req, `Created alumni: ${alumni.name} (${alumni.alumniId})`);
    return res.status(201).json({ message: `Alumni '${alumni.name}' added successfully`, alumni });
  } catch (err) {
    return res.status(500).json({ message: 'Error creating alumni', error: err.message });
  }
};

// PUT /api/alumni/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    let alumni = null;
    if (mongoose.Types.ObjectId.isValid(id)) alumni = await Alumni.findById(id);
    if (!alumni) alumni = await Alumni.findOne({ alumniId: id.toUpperCase() });
    if (!alumni) return res.status(404).json({ message: 'Alumni not found' });

    const { name, graduationYear, jobTitle, currentCompany, socialLinks, email, phone } = req.body;
    if (!name || !graduationYear) {
      return res.status(400).json({ message: 'Name and Graduation Year are required.' });
    }

    alumni.name = name.trim();
    alumni.graduationYear = Number(graduationYear);
    alumni.jobTitle = jobTitle?.trim() || '';
    alumni.currentCompany = currentCompany?.trim() || '';
    if (socialLinks) alumni.socialLinks = { ...alumni.socialLinks, ...socialLinks };
    alumni.email = email?.trim().toLowerCase() || '';
    alumni.phone = phone?.trim() || '';

    await alumni.save();
    await logAudit('UPDATE_ALUMNI', req, `Updated alumni: ${alumni.name} (${alumni.alumniId})`);
    return res.status(200).json({ message: `Alumni '${alumni.name}' updated successfully`, alumni });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating alumni', error: err.message });
  }
};

// DELETE /api/alumni/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    let alumni = null;
    if (mongoose.Types.ObjectId.isValid(id)) alumni = await Alumni.findByIdAndDelete(id);
    if (!alumni) alumni = await Alumni.findOneAndDelete({ alumniId: id.toUpperCase() });
    if (!alumni) return res.status(404).json({ message: 'Alumni not found' });
    await logAudit('DELETE_ALUMNI', req, `Deleted alumni: ${alumni.name} (${alumni.alumniId})`);
    return res.status(200).json({ message: `Alumni '${alumni.name}' deleted successfully` });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting alumni', error: err.message });
  }
};

// POST /api/alumni/bulk
exports.bulkUpload = async (req, res) => {
  try {
    const { alumni: list } = req.body;
    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ message: 'Alumni array is required and must not be empty.' });
    }

    const results = { created: 0, failed: 0, details: [] };

    for (const row of list) {
      try {
        const { name, graduationYear, alumniId } = row;
        if (!name || !graduationYear) {
          results.failed++;
          results.details.push({ alumniId: alumniId || 'Unknown', status: 'FAILED', reason: 'Missing name or graduation year' });
          continue;
        }
        const resolvedId = alumniId ? alumniId.trim().toUpperCase() : await generateAlumniId();
        const existing = await Alumni.findOne({ alumniId: resolvedId });
        if (existing) {
          results.failed++;
          results.details.push({ alumniId: resolvedId, status: 'FAILED', reason: 'Alumni ID already exists' });
          continue;
        }
        await Alumni.create({
          alumniId: resolvedId,
          name: name.trim(),
          graduationYear: Number(graduationYear),
          jobTitle: row.jobTitle?.trim() || '',
          currentCompany: row.currentCompany?.trim() || '',
          socialLinks: {
            linkedin: row.linkedin?.trim() || '',
            instagram: row.instagram?.trim() || '',
            twitter: row.twitter?.trim() || '',
            github: row.github?.trim() || '',
            portfolio: row.portfolio?.trim() || '',
            other: row.other?.trim() || '',
          },
          email: row.email?.trim().toLowerCase() || '',
          phone: row.phone?.trim() || '',
        });
        results.created++;
        results.details.push({ alumniId: resolvedId, status: 'SUCCESS', reason: 'Created successfully' });
      } catch (err) {
        results.failed++;
        results.details.push({ alumniId: row.alumniId || 'Unknown', status: 'FAILED', reason: err.message });
      }
    }

    await logAudit('BULK_ALUMNI_UPLOAD', req, `Bulk upload: ${results.created} created, ${results.failed} failed`);
    return res.status(results.created > 0 ? 201 : 400).json({
      message: `Bulk upload complete: ${results.created} created, ${results.failed} failed`,
      created: results.created,
      failed: results.failed,
      details: results.details,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error during bulk upload', error: err.message });
  }
};
