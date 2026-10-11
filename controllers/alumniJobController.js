const mongoose = require('mongoose');
const AlumniJob = require('../models/AlumniJob');
const Alumni = require('../models/Alumni');
const AuditLog = require('../models/AuditLog');

// ── Audit helper ──────────────────────────────────────────────────────────────
const logAudit = async (action, req, details) => {
  try {
    await AuditLog.create({
      action,
      performedBy: req?.user?.email || req?.user?.id || 'Admin',
      target: 'AlumniJob',
      status: 'SUCCESS',
      details: details || '',
    });
  } catch (err) {
    console.warn('AuditLog non-blocking:', err.message);
  }
};

// ── Shared validation helpers ─────────────────────────────────────────────────

// D7: Job ID — 3–20 uppercase alphanumeric characters, no spaces or special chars
const JOB_ID_RE = /^[A-Z0-9]{3,20}$/;

// D9: Company must contain at least one letter; allows TCS, 3M, AT&T, 7-Eleven, etc.
const CONTAINS_LETTER_RE = /[A-Za-z]/;

// D11: Application Link — only http / https URLs accepted
const validateApplicationLink = (raw) => {
  const v = (raw || '').trim();
  if (!v) return 'Application Link is required.';
  try {
    const url = new URL(v);
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
      return 'Application Link must use http or https.';
  } catch {
    return 'Application Link must be a valid URL.';
  }
  return null;
};

const validateFields = ({ jobId, alumniId, company, role, applicationLink }, { requireJobId = false } = {}) => {
  const errors = [];

  // D7: validate jobId only on create (it cannot change on update)
  if (requireJobId) {
    const cleanJobId = (jobId || '').trim().toUpperCase();
    if (!cleanJobId) {
      errors.push('Job ID is required.');
    } else if (!JOB_ID_RE.test(cleanJobId)) {
      errors.push('Job ID must be 3–20 uppercase letters or digits with no spaces or special characters.');
    }
  }

  // D8: Alumni ID presence (actual DB lookup happens separately below)
  if (!(alumniId || '').trim()) errors.push('Alumni ID is required.');

  // D9: Company
  const company_ = (company || '').trim();
  if (!company_) {
    errors.push('Company name is required.');
  } else if (company_.length < 2) {
    errors.push('Company name must be at least 2 characters.');
  } else if (company_.length > 100) {
    errors.push('Company name must not exceed 100 characters.');
  } else if (!CONTAINS_LETTER_RE.test(company_)) {
    errors.push('Company name must contain at least one letter.');
  }

  // D10: Role
  const role_ = (role || '').trim();
  if (!role_) {
    errors.push('Role / Job Title is required.');
  } else if (role_.length < 2) {
    errors.push('Role must be at least 2 characters.');
  } else if (role_.length > 100) {
    errors.push('Role must not exceed 100 characters.');
  } else if (!CONTAINS_LETTER_RE.test(role_)) {
    errors.push('Role must contain at least one letter.');
  }

  // D11: Application Link
  const linkErr = validateApplicationLink(applicationLink);
  if (linkErr) errors.push(linkErr);

  return errors;
};

// D8 + Performance: Verify that the given alumniId string exists in the Alumni
// collection.  We project only the alumniId field — no need to fetch the full
// document — so Mongoose returns a covered query that reads only the unique index.
const verifyAlumniExists = async (alumniIdRaw) => {
  const alumniId = (alumniIdRaw || '').trim().toUpperCase();
  if (!alumniId) return false;
  const found = await Alumni.findOne({ alumniId }, { alumniId: 1, _id: 0 }).lean();
  return Boolean(found);
};

// ── Controllers ───────────────────────────────────────────────────────────────

// GET /api/alumni-jobs
exports.getAll = async (req, res) => {
  try {
    const { alumniId, search } = req.query;
    const filter = {};
    if (alumniId) filter.alumniId = alumniId.toUpperCase();
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [{ jobId: q }, { company: q }, { role: q }, { alumniId: q }];
    }
    const jobs = await AlumniJob.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json(jobs);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching alumni jobs', error: err.message });
  }
};

// GET /api/alumni-jobs/:id
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    let job = null;
    if (mongoose.Types.ObjectId.isValid(id)) job = await AlumniJob.findById(id).lean();
    if (!job) job = await AlumniJob.findOne({ jobId: id.toUpperCase() }).lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });
    return res.status(200).json(job);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching job', error: err.message });
  }
};

// POST /api/alumni-jobs
exports.create = async (req, res) => {
  try {
    const { jobId, alumniId, company, role, applicationLink, datePosted, dateOfExpiry } = req.body;

    // D7/D9/D10/D11: field validation
    const errors = validateFields(
      { jobId, alumniId, company, role, applicationLink },
      { requireJobId: true },
    );
    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0], errors });
    }

    const cleanJobId = jobId.trim().toUpperCase();
    const cleanAlumniId = alumniId.trim().toUpperCase();

    // Duplicate Job ID check
    const existing = await AlumniJob.findOne({ jobId: cleanJobId });
    if (existing) {
      return res.status(409).json({ message: `Job ID '${cleanJobId}' already exists.` });
    }

    // D8: verify alumni exists in the Alumni collection
    const alumniExists = await verifyAlumniExists(cleanAlumniId);
    if (!alumniExists) {
      return res.status(404).json({
        message: `Alumni ID '${cleanAlumniId}' does not exist. Please enter a valid Alumni ID.`,
      });
    }

    const job = await AlumniJob.create({
      jobId: cleanJobId,
      alumniId: cleanAlumniId,
      company: company.trim(),
      role: role.trim(),
      applicationLink: applicationLink.trim(),
      datePosted: datePosted ? new Date(datePosted) : null,
      dateOfExpiry: dateOfExpiry ? new Date(dateOfExpiry) : null,
    });

    await logAudit('CREATE_ALUMNI_JOB', req, `Created job: ${job.role} at ${job.company} (${job.jobId})`);
    return res.status(201).json({ message: 'Job posting created successfully', job });
  } catch (err) {
    return res.status(500).json({ message: 'Error creating job', error: err.message });
  }
};

// PUT /api/alumni-jobs/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    let job = null;
    if (mongoose.Types.ObjectId.isValid(id)) job = await AlumniJob.findById(id);
    if (!job) job = await AlumniJob.findOne({ jobId: id.toUpperCase() });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const { alumniId, company, role, applicationLink, datePosted, dateOfExpiry } = req.body;

    // D13: same validation as create (minus jobId — it cannot be changed)
    const errors = validateFields(
      { alumniId, company, role, applicationLink },
      { requireJobId: false },
    );
    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0], errors });
    }

    const cleanAlumniId = alumniId.trim().toUpperCase();

    // D8/D13: verify alumni exists — also covers update path
    const alumniExists = await verifyAlumniExists(cleanAlumniId);
    if (!alumniExists) {
      return res.status(404).json({
        message: `Alumni ID '${cleanAlumniId}' does not exist. Please enter a valid Alumni ID.`,
      });
    }

    // Apply updates atomically — do not save partial data on any validation failure
    job.alumniId = cleanAlumniId;
    job.company = company.trim();
    job.role = role.trim();
    job.applicationLink = applicationLink.trim();
    job.datePosted = datePosted ? new Date(datePosted) : null;
    job.dateOfExpiry = dateOfExpiry ? new Date(dateOfExpiry) : null;

    await job.save();
    await logAudit('UPDATE_ALUMNI_JOB', req, `Updated job: ${job.jobId}`);
    return res.status(200).json({ message: 'Job updated successfully', job });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating job', error: err.message });
  }
};

// DELETE /api/alumni-jobs/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    let job = null;
    if (mongoose.Types.ObjectId.isValid(id)) job = await AlumniJob.findByIdAndDelete(id);
    if (!job) job = await AlumniJob.findOneAndDelete({ jobId: id.toUpperCase() });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    await logAudit('DELETE_ALUMNI_JOB', req, `Deleted job: ${job.jobId}`);
    return res.status(200).json({ message: 'Job deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting job', error: err.message });
  }
};
