/**
 * studentValidation.js  (backend)
 * Authoritative validation rules for student fields.
 * Used by studentController (create, update, bulk upload).
 *
 * IMPORTANT: Keep these rules in sync with the frontend version at
 * frontend-react/src/utils/studentValidation.js so that the UI and the
 * API always enforce identical constraints.
 */

// PRN — alphanumeric only, at least 2 characters. Accepts any format.
const PRN_REGEX = /^[A-Za-z0-9]{2,}$/;

// Year of enrollment range.
const YEAR_MIN = 1900;
const YEAR_MAX = new Date().getFullYear() + 1;

// Valid name characters: Unicode letters, spaces, hyphens, apostrophes, dots.
const NAME_VALID_CHARS_REGEX = /^[A-Za-z\u00C0-\u024F\u1E00-\u1EFF' .\-]+$/;

// Class: at least one letter, only letters/digits/spaces/dots/hyphens/slashes.
const CLASS_VALID_REGEX = /^[A-Za-z0-9 .\-/]+$/;

// Degree: starts with a letter, allows letters/digits/spaces/dots/hyphens/parens/commas/&.
const DEGREE_VALID_REGEX = /^[A-Za-z][A-Za-z0-9 .()\-&,/]+$/;

// Division: starts with a letter, allows letters/digits/spaces/dots/hyphens.
const DIVISION_VALID_REGEX = /^[A-Za-z][A-Za-z0-9 .\-]*$/;

// Email: standard email format. Field is optional.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------

function validateName(raw) {
  if (!raw || raw.trim().length === 0) return 'Name is required.';
  const name = raw.trim();
  if (/^\d+$/.test(name)) return 'Invalid name. Please enter a valid name.';
  if (!/[A-Za-z]/.test(name)) return 'Invalid name. Please enter a valid name.';
  if (/\d/.test(name)) return 'Invalid name. Please enter a valid name.';
  if (/[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF\s'\-.]/.test(name))
    return 'Invalid name. Please enter a valid name.';
  return '';
}

function validatePRN(raw) {
  if (!raw || raw.trim().length === 0) return 'PRN is required.';
  const prn = raw.trim();
  if (!PRN_REGEX.test(prn))
    return 'Invalid PRN. Only letters and numbers are allowed (e.g. PRN2024001, 2024001).';
  return '';
}

function validateClass(raw) {
  if (!raw || raw.trim().length === 0) return 'Class is required.';
  const cls = raw.trim();
  if (!/^[A-Za-z\u00C0-\u024F\u1E00-\u1EFF\s]+$/.test(cls))
    return 'Invalid class. Please enter a valid class (e.g. First Year, Second Year).';
  return '';
}

function validateDegree(raw) {
  if (!raw || raw.trim().length === 0) return 'Degree is required.';
  const deg = raw.trim();
  if (!DEGREE_VALID_REGEX.test(deg))
    return 'Degree must start with a letter and contain only letters, numbers, spaces, dots, hyphens, or parentheses (e.g. B.Tech Computer Science).';
  return '';
}

function validateYearOfEnrollment(raw) {
  if (!raw || raw.trim().length === 0) return 'Year of Enrollment is required.';
  const val = raw.trim();
  if (!/^\d{4}$/.test(val))
    return 'Year of Enrollment must be a 4-digit year (e.g. 2024).';
  const year = parseInt(val, 10);
  if (year < YEAR_MIN || year > YEAR_MAX)
    return `Year of Enrollment must be between ${YEAR_MIN} and ${YEAR_MAX}.`;
  return '';
}

function validateDivision(raw) {
  if (!raw || raw.trim().length === 0) return 'Division is required.';
  const div = raw.trim();
  if (!/^[A-Za-z]$/.test(div))
    return 'Division must be a single letter (e.g. A, B, C).';
  return '';
}

function validateEmail(raw) {
  // Email is optional — empty value is acceptable
  if (!raw || raw.trim().length === 0) return '';
  if (!EMAIL_REGEX.test(raw.trim()))
    return 'Invalid email address. Please enter a valid email (e.g. student@university.edu).';
  return '';
}

/**
 * Validates all required student fields.
 * @param {object} fields - { name, prn, class, division, degree, yearOfEnrollment }
 * @returns {{ errors: object, isValid: boolean }}
 *   errors is a map of fieldName -> errorMessage; empty means no errors.
 */
function validateStudentFields({ name, prn, class: cls, division, degree, yearOfEnrollment, email }) {
  const errors = {};

  const nameErr = validateName(name);
  if (nameErr) errors.name = nameErr;

  const prnErr = validatePRN(prn);
  if (prnErr) errors.prn = prnErr;

  const classErr = validateClass(cls);
  if (classErr) errors.class = classErr;

  const divErr = validateDivision(division);
  if (divErr) errors.division = divErr;

  const degreeErr = validateDegree(degree);
  if (degreeErr) errors.degree = degreeErr;

  const yearErr = validateYearOfEnrollment(yearOfEnrollment);
  if (yearErr) errors.yearOfEnrollment = yearErr;

  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;

  return { errors, isValid: Object.keys(errors).length === 0 };
}

module.exports = {
  validateName,
  validatePRN,
  validateClass,
  validateDivision,
  validateDegree,
  validateYearOfEnrollment,
  validateEmail,
  validateStudentFields,
};
