const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const User = require('../models/User');

/**
 * Generates the standardized default password for a student.
 * Format: First name with first letter capitalized + '@123'
 * Example: 'sakshi' -> 'Sakshi@123', 'Rahul Patil' -> 'Rahul@123'
 */
function getStudentDefaultPassword(name) {
  if (!name || typeof name !== 'string') return 'Student@123';
  const clean = name.trim();
  if (!clean) return 'Student@123';
  const firstName = clean.split(/\s+/)[0];
  const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  return `${capitalized}@123`;
}

/**
 * Checks if the entered password matches the student's name-based password format.
 * Matches case-insensitively for a smooth user experience.
 */
function checkStudentPasswordFormat(enteredPassword, studentName) {
  if (!enteredPassword || !studentName) return false;
  const cleanEntered = enteredPassword.trim();
  const defaultPwd = getStudentDefaultPassword(studentName);

  // Exact or case-insensitive match (e.g. Sakshi@123 or sakshi@123)
  if (cleanEntered === defaultPwd || cleanEntered.toLowerCase() === defaultPwd.toLowerCase()) {
    return true;
  }

  // First name as typed + @123
  const firstName = studentName.trim().split(/\s+/)[0];
  if (cleanEntered === `${firstName}@123` || cleanEntered.toLowerCase() === `${firstName.toLowerCase()}@123`) {
    return true;
  }

  // Generic fallback default
  if (cleanEntered === 'Student@123' || cleanEntered.toLowerCase() === 'student@123') {
    return true;
  }

  return false;
}

/**
 * Synchronizes a single student document to the User collection.
 */
async function syncSingleStudentUser(student) {
  try {
    if (!student || !student.prn) return null;
    const cleanPrn = student.prn.trim().toUpperCase();
    const cleanName = student.name ? student.name.trim() : 'Student';
    const email = (student.email && student.email.trim())
      ? student.email.trim().toLowerCase()
      : `${cleanPrn.toLowerCase()}@university.edu`;
    const defaultPassword = getStudentDefaultPassword(cleanName);
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    let user = await User.findOne({
      $or: [
        { prn: cleanPrn },
        { prn: cleanPrn.toLowerCase() },
        { email: email },
      ],
    });

    if (user) {
      user.name = cleanName;
      user.prn = cleanPrn;
      user.email = email;
      user.role = 'STUDENT';
      user.adminType = 'NONE';
      user.department = student.class || student.degree || 'General';
      user.password = hashedPassword;
      await user.save();
    } else {
      user = await User.create({
        name: cleanName,
        email: email,
        prn: cleanPrn,
        password: hashedPassword,
        role: 'STUDENT',
        adminType: 'NONE',
        department: student.class || student.degree || 'General',
      });
    }

    return user;
  } catch (err) {
    console.error(`Failed to sync student user for PRN ${student?.prn}:`, err.message);
    return null;
  }
}

/**
 * Auto-syncs all students in the database to the User collection.
 * Runs on backend startup so existing database students get login credentials immediately.
 */
async function syncAllStudentUsers() {
  try {
    const students = await Student.find();
    if (!students || students.length === 0) {
      console.log('No student records found to sync.');
      return;
    }

    let syncedCount = 0;
    for (const student of students) {
      const synced = await syncSingleStudentUser(student);
      if (synced) syncedCount++;
    }
    console.log(`[Student Auth Sync] Successfully synchronized ${syncedCount}/${students.length} student login credentials.`);
  } catch (err) {
    console.error('[Student Auth Sync] Error syncing student credentials:', err.message);
  }
}

module.exports = {
  getStudentDefaultPassword,
  checkStudentPasswordFormat,
  syncSingleStudentUser,
  syncAllStudentUsers,
};
