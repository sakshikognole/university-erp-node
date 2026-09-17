const mongoose = require('mongoose');
const AlumniJob = require('../models/AlumniJob');
const AuditLog = require('../models/AuditLog');

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
    const { jobId, alumniId, company, role, applicationLink, datePosted, dateOfExpiry, status } = req.body;
    if (!jobId || !alumniId || !company || !role) {
      return res.status(400).json({ message: 'Job ID, Alumni ID, Company, and Role are required.' });
    }
    const cleanJobId = jobId.trim().toUpperCase();
    const existing = await AlumniJob.findOne({ jobId: cleanJobId });
    if (existing) return res.status(409).json({ message: `Job ID '${cleanJobId}' already exists.` });

    const job = await AlumniJob.create({
      jobId: cleanJobId,
      alumniId: alumniId.trim().toUpperCase(),
      company: company.trim(),
      role: role.trim(),
      applicationLink: applicationLink?.trim() || '',
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

    const { alumniId, company, role, applicationLink, datePosted, dateOfExpiry, status } = req.body;
    if (!alumniId || !company || !role) {
      return res.status(400).json({ message: 'Alumni ID, Company, and Role are required.' });
    }

    job.alumniId = alumniId.trim().toUpperCase();
    job.company = company.trim();
    job.role = role.trim();
    job.applicationLink = applicationLink?.trim() || '';
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
