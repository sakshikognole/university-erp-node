/**
 * alumniController.js
 *
 * Backend validation added for:
 *   D10/D11/D12  Name (validateName)
 *   D13          Email (validateEmail)
 *   D14          Phone (validatePhone — 10 digits)
 *   Imp-B        At least one contact required
 *
 * D12 Bulk Upload: all rows validated before any insert; partial inserts still
 * happen row-by-row (existing architecture) but invalid rows are now rejected
 * with clear reasons rather than being silently skipped.
 */

const mongoose = require('mongoose');
const Alumni   = require('../models/Alumni');
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

// ── Shared validation helpers (mirrors frontend alumniValidation.js) ─────────

const NAME_HAS_LETTER = /\p{L}/u;

const validateName = (raw) => {
  const v = (raw || '').trim().replace(/\s+/g, ' ');
  if (!v) return 'Enter a valid full name';
  if (!NAME_HAS_LETTER.test(v)) return 'Enter a valid full name';
  const words = v.split(' ').filter(Boolean);
  if (words.length < 2) return 'Enter a valid full name';
  return null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const validateEmail = (raw) => {
  const v = (raw || '').trim();
  if (!v) return null; // optional on its own
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address';
  return null;
};

const DIGITS_ONLY = /^\d+$/;

const validatePhone = (raw) => {
  const v = (raw || '').trim();
  if (!v) return null; // optional on its own
  const digits = v.replace(/^\+91\s?/, '').replace(/^0/, '').replace(/\s/g, '');
  if (!DIGITS_ONLY.test(digits) || digits.length !== 10)
    return 'Enter a valid 10-digit phone number';
  return null;
};

/**
 * Run all field validations for a single alumni record.
 * Returns an array of error strings (empty = valid).
 */
const validateAlumniRecord = ({ name, graduationYear, email, phone }, requireContact = true) => {
  const errors = [];

  const nameErr = validateName(name);
  if (nameErr) errors.push(nameErr);

  if (!graduationYear) {
    errors.push('Graduation Year is required.');
  } else {
    const y = Number(graduationYear);
    if (isNaN(y) || y < 1900 || y > new Date().getFullYear() + 5)
      errors.push('Enter a valid graduation year.');
  }

  const emailErr = validateEmail(email);
  if (emailErr) errors.push(emailErr);

  const phoneErr = validatePhone(phone);
  if (phoneErr) errors.push(phoneErr);

  if (requireContact) {
    const e = (email || '').trim();
    const p = (phone || '').trim();
    if (!e && !p) errors.push('Enter at least an email address or phone number.');
  }

  return errors;
};

// ── Auto-generate next alumniId e.g. ALM0001 ─────────────────────────────────
const generateAlumniId = async () => {
  const last = await Alumni.findOne({}, {}, { sort: { createdAt: -1 } }).lean();
  if (!last || !last.alumniId) return 'ALM0001';
  const num = parseInt(last.alumniId.replace(/\D/g, ''), 10) || 0;
  return `ALM${String(num + 1).padStart(4, '0')}`;
};

// ── GET /api/alumni ───────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, year } = req.query;
    const filter = {};
    if (year)   filter.graduationYear = Number(year);
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

// ── GET /api/alumni/:id ───────────────────────────────────────────────────────
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

// ── POST /api/alumni ──────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, graduationYear, jobTitle, currentCompany, socialLinks, email, phone, alumniId } = req.body;

    const errors = validateAlumniRecord({ name, graduationYear, email, phone });
    if (errors.length > 0)
      return res.status(400).json({ message: errors[0], errors });

    const resolvedId = alumniId ? alumniId.trim().toUpperCase() : await generateAlumniId();
    const existing   = await Alumni.findOne({ alumniId: resolvedId });
    if (existing) return res.status(409).json({ message: `Alumni ID '${resolvedId}' already exists.` });

    const alumni = await Alumni.create({
      alumniId:       resolvedId,
      name:           name.trim(),
      graduationYear: Number(graduationYear),
      jobTitle:       jobTitle?.trim()       || '',
      currentCompany: currentCompany?.trim() || '',
      socialLinks:    socialLinks            || {},
      email:          email?.trim().toLowerCase() || '',
      phone:          phone?.trim()          || '',
    });

    await logAudit('CREATE_ALUMNI', req, `Created alumni: ${alumni.name} (${alumni.alumniId})`);
    return res.status(201).json({ message: `Alumni '${alumni.name}' added successfully`, alumni });
  } catch (err) {
    return res.status(500).json({ message: 'Error creating alumni', error: err.message });
  }
};

// ── PUT /api/alumni/:id ───────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    let alumni = null;
    if (mongoose.Types.ObjectId.isValid(id)) alumni = await Alumni.findById(id);
    if (!alumni) alumni = await Alumni.findOne({ alumniId: id.toUpperCase() });
    if (!alumni) return res.status(404).json({ message: 'Alumni not found' });

    const { name, graduationYear, jobTitle, currentCompany, socialLinks, email, phone } = req.body;

    const errors = validateAlumniRecord({ name, graduationYear, email, phone });
    if (errors.length > 0)
      return res.status(400).json({ message: errors[0], errors });

    alumni.name           = name.trim();
    alumni.graduationYear = Number(graduationYear);
    alumni.jobTitle       = jobTitle?.trim()       || '';
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

// ── DELETE /api/alumni/:id ────────────────────────────────────────────────────
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

// ── POST /api/alumni/bulk ────────────────────────────────────────────────────
exports.bulkUpload = async (req, res) => {
  try {
    const { alumni: list } = req.body;
    if (!Array.isArray(list) || list.length === 0)
      return res.status(400).json({ message: 'Alumni array is required and must not be empty.' });

    // D12/D13/D14: validate ALL rows before inserting any
    const preErrors = [];
    list.forEach((row, idx) => {
      const rowNum = idx + 1;
      const errors = validateAlumniRecord(
        { name: row.name, graduationYear: row.graduationYear, email: row.email, phone: row.phone },
        true, // requireContact
      );
      errors.forEach(e => preErrors.push(`Row ${rowNum}: ${e}`));
    });

    if (preErrors.length > 0) {
      return res.status(400).json({
        message: `Validation failed — no records were imported.`,
        errors: preErrors,
        created: 0,
        failed: list.length,
      });
    }

    // All rows passed validation — proceed with insert
    const results = { created: 0, failed: 0, details: [] };

    for (const row of list) {
      try {
        const resolvedId = row.alumniId ? row.alumniId.trim().toUpperCase() : await generateAlumniId();
        const existing   = await Alumni.findOne({ alumniId: resolvedId });
        if (existing) {
          results.failed++;
          results.details.push({ alumniId: resolvedId, status: 'FAILED', reason: 'Alumni ID already exists' });
          continue;
        }
        await Alumni.create({
          alumniId:       resolvedId,
          name:           row.name.trim(),
          graduationYear: Number(row.graduationYear),
          jobTitle:       row.jobTitle?.trim()       || '',
          currentCompany: row.currentCompany?.trim() || '',
          socialLinks: {
            linkedin:  row.linkedin?.trim()  || '',
            instagram: row.instagram?.trim() || '',
            twitter:   row.twitter?.trim()   || '',
            github:    row.github?.trim()    || '',
            portfolio: row.portfolio?.trim() || '',
            other:     row.other?.trim()     || '',
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

    await logAudit('BULK_ALUMNI_UPLOAD', req,
      `Bulk upload: ${results.created} created, ${results.failed} failed`);

    return res.status(results.created > 0 ? 201 : 400).json({
      message: `Bulk upload complete: ${results.created} created, ${results.failed} failed`,
      created: results.created,
      failed:  results.failed,
      details: results.details,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error during bulk upload', error: err.message });
  }
};
