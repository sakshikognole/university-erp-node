/**
 * staffValidation.js  (backend)
 * Authoritative validation rules for Staff fields.
 * Used by staffController (create, update).
 *
 * IMPORTANT: Keep these rules in sync with the frontend version at
 * frontend-react/src/utils/staffValidation.js so that the UI and the
 * API always enforce identical constraints.
 */

// Staff ID: "STF" + 4-digit year + 3-digit sequence, e.g. STF2024001.
const STAFF_ID_REGEX = /^STF\d{7}$/;

// Name: Unicode letters, spaces, hyphens, apostrophes, dots. Min two words.
const NAME_VALID_CHARS_REGEX = /^[A-Za-z\u00C0-\u024F\u1E00-\u1EFF'. \-]+$/;

// Email: standard RFC-safe check.
const EMAIL_REGEX = /^[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]+\.[A-Za-z]{2,6}$/;
const EMAIL_LOCAL_INVALID_CHARS = /[^A-Za-z0-9._%+\-]/;

// Phone: exactly 10 digits, first digit 6-9 (Indian mobile).
const PHONE_REGEX = /^[6-9]\d{9}$/;

// Valid roles.
const VALID_ROLES = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer',
  'Head of Department',
  'Dean',
  'Principal',
  'Admin',
  'Librarian',
  'Lab Assistant',
  'Accountant',
  'Clerk',
  'Security',
  'Peon',
  'Other',
];

// ---------------------------------------------------------------------------

function validateName(raw) {
  if (!raw || raw.trim().length === 0) return 'Name is required.';
  const name = raw.trim();
  if (/^["']|["']$/.test(name)) return 'Name must not be enclosed in quotes.';
  if (/^\d+$/.test(name)) return 'Name must contain letters only.';
  if (/\d/.test(name)) return 'Name must not contain numbers.';
  if (!NAME_VALID_CHARS_REGEX.test(name))
    return 'Name must contain only letters, spaces, hyphens, apostrophes, or dots.';
  const words = name.split(/\s+/).filter((w) => w.length > 0);
  if (words.length < 2) return 'Enter full name (first name and last name).';
  return '';
}

function validateStaffId(raw) {
  if (!raw || raw.trim().length === 0) return 'Staff ID is required.';
  const id = raw.trim().toUpperCase();
  if (!STAFF_ID_REGEX.test(id))
    return 'Invalid Staff ID. Expected format: STF followed by 4-digit year and 3-digit number (e.g. STF2024001).';
  return '';
}

function validateEmail(raw) {
  if (!raw || raw.trim().length === 0) return 'Email address is required.';
  const email = raw.trim();
  if (email.length > 254) return 'Email address is too long.';
  const atIndex = email.lastIndexOf('@');
  if (atIndex < 1) return 'Enter a valid email address.';
  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  if (EMAIL_LOCAL_INVALID_CHARS.test(localPart))
    return 'Email address contains invalid characters before @.';
  if (/^\d+$/.test(localPart) && localPart.length > 15)
    return 'Email address local part is invalid.';
  if (!domainPart.includes('.')) return 'Email domain is invalid.';
  if (!EMAIL_REGEX.test(email)) return 'Enter a valid email address.';
  return '';
}

function validatePhone(raw) {
  if (!raw || raw.trim().length === 0) return 'Phone number is required.';
  const phone = raw.trim().replace(/\s/g, '');
  if (!/^\d+$/.test(phone)) return 'Phone number must contain only digits.';
  if (phone.length !== 10) return 'Phone number must be exactly 10 digits.';
  if (!PHONE_REGEX.test(phone))
    return 'Enter a valid 10-digit Indian mobile number (starts with 6–9).';
  return '';
}

function validateRole(raw) {
  if (!raw || raw.trim().length === 0) return 'Role is required.';
  if (!VALID_ROLES.includes(raw.trim()))
    return 'Invalid role. Select a valid role from the permitted list.';
  return '';
}

/**
 * Validates all required staff fields.
 * @param {object} fields - { name, staffId, email, phone, role }
 * @returns {{ errors: object, isValid: boolean }}
 */
function validateStaffFields({ name, staffId, email, phone, role }) {
  const errors = {};

  const nameErr = validateName(name);
  if (nameErr) errors.name = nameErr;

  const staffIdErr = validateStaffId(staffId);
  if (staffIdErr) errors.staffId = staffIdErr;

  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;

  const phoneErr = validatePhone(phone);
  if (phoneErr) errors.phone = phoneErr;

  const roleErr = validateRole(role);
  if (roleErr) errors.role = roleErr;

  return { errors, isValid: Object.keys(errors).length === 0 };
}

module.exports = {
  validateName,
  validateStaffId,
  validateEmail,
  validatePhone,
  validateRole,
  validateStaffFields,
  VALID_ROLES,
};
