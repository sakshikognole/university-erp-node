const mongoose = require('mongoose');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');

// Get All Students
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    return res.status(200).json(students);
  } catch (error) {
    console.error('Get Students Error:', error);
    return res.status(500).json({ message: 'Error fetching students from database' });
  }
};

// Get Single Student by ID or PRN
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    let student = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      student = await Student.findById(id);
    }
    if (!student) {
      student = await Student.findOne({ prn: id.trim().toUpperCase() });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json(student);
  } catch (error) {
    console.error('Get Student Error:', error);
    return res.status(500).json({ message: 'Error fetching student details' });
  }
};

// Create New Student
exports.createStudent = async (req, res) => {
  try {
    const { name, prn, class: studentClass, division, degree, yearOfEnrollment, customFields } = req.body;

    if (!name || !prn || !studentClass || !degree || !yearOfEnrollment) {
      return res.status(400).json({ message: 'Name, PRN, Class, Degree, and Year of Enrollment are required' });
    }

    const cleanPrn = prn.trim().toUpperCase();

    const existingStudent = await Student.findOne({ prn: cleanPrn });
    if (existingStudent) {
      return res.status(409).json({ 
        message: `A student with PRN '${cleanPrn}' already exists` 
      });
    }

    const newStudent = await Student.create({
      name: name.trim(),
      prn: cleanPrn,
      class: studentClass.trim(),
      division: division?.trim() || '',
      degree: degree.trim(),
      yearOfEnrollment: yearOfEnrollment.trim(),
      customFields: customFields || [],
    });

    await AuditLog.create({
      action: 'STUDENT_CREATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${newStudent.name} (${newStudent.prn})`,
      status: 'SUCCESS',
      details: `Created new student ${newStudent.prn}`,
    });

    return res.status(201).json({
      message: `Student '${newStudent.name}' added successfully`,
      student: newStudent,
    });
  } catch (error) {
    console.error('Create Student Error:', error);
    return res.status(500).json({ message: 'Server error creating student' });
  }
};

// Update Student
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, prn, class: studentClass, division, degree, yearOfEnrollment, customFields } = req.body;

    if (!name || !prn || !studentClass || !degree || !yearOfEnrollment) {
      return res.status(400).json({ message: 'Name, PRN, Class, Degree, and Year of Enrollment are required' });
    }

    let student = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      student = await Student.findById(id);
    }
    if (!student) {
      student = await Student.findOne({ prn: id.trim().toUpperCase() });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const cleanPrn = prn.trim().toUpperCase();

    // If PRN changed, check uniqueness
    if (cleanPrn !== student.prn) {
      const existingStudent = await Student.findOne({ prn: cleanPrn });
      if (existingStudent && existingStudent._id.toString() !== student._id.toString()) {
        return res.status(409).json({
          message: `A student with PRN '${cleanPrn}' already exists`,
        });
      }
      student.prn = cleanPrn;
    }

    student.name = name.trim();
    student.class = studentClass.trim();
    student.division = division !== undefined ? division.trim() : student.division;
    student.degree = degree.trim();
    student.yearOfEnrollment = yearOfEnrollment.trim();
    if (Array.isArray(customFields)) {
      student.customFields = customFields;
    }

    await student.save();

    await AuditLog.create({
      action: 'STUDENT_UPDATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${student.name} (${student.prn})`,
      status: 'SUCCESS',
      details: `Updated student record for ${student.prn}`,
    });

    return res.status(200).json({
      message: `Student '${student.name}' updated successfully`,
      student,
    });
  } catch (error) {
    console.error('Update Student Error:', error);
    return res.status(500).json({ message: 'Server error updating student' });
  }
};

// Bulk Upload Students
exports.bulkUploadStudents = async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'Students array is required and must not be empty' });
    }

    const results = {
      created: 0,
      failed: 0,
      details: [],
    };

    for (const studentData of students) {
      try {
        const { name, prn, class: studentClass, division, degree, yearOfEnrollment, customFields } = studentData;

        if (!name || !prn || !studentClass || !degree || !yearOfEnrollment) {
          results.failed++;
          results.details.push({
            prn: prn || 'Unknown',
            status: 'FAILED',
            reason: 'Missing required fields',
          });
          continue;
        }

        const cleanPrn = prn.trim().toUpperCase();

        const existingStudent = await Student.findOne({ prn: cleanPrn });
        if (existingStudent) {
          results.failed++;
          results.details.push({
            prn: cleanPrn,
            status: 'FAILED',
            reason: 'PRN already exists',
          });
          continue;
        }

        await Student.create({
          name: name.trim(),
          prn: cleanPrn,
          class: studentClass.trim(),
          division: division?.trim() || '',
          degree: degree.trim(),
          yearOfEnrollment: yearOfEnrollment.trim(),
          customFields: customFields || [],
        });

        results.created++;
        results.details.push({
          prn: cleanPrn,
          status: 'SUCCESS',
          reason: 'Student created successfully',
        });
      } catch (err) {
        results.failed++;
        results.details.push({
          prn: studentData.prn || 'Unknown',
          status: 'FAILED',
          reason: err.message,
        });
      }
    }

    await AuditLog.create({
      action: 'BULK_STUDENT_UPLOAD',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${results.created} students`,
      status: results.created > 0 ? 'SUCCESS' : 'FAILED',
      details: `Bulk upload: ${results.created} created, ${results.failed} failed`,
    });

    return res.status(results.created > 0 ? 201 : 400).json({
      message: `Bulk upload completed: ${results.created} students created, ${results.failed} failed`,
      created: results.created,
      failed: results.failed,
      details: results.details,
    });
  } catch (error) {
    console.error('Bulk Upload Students Error:', error);
    return res.status(500).json({ message: 'Server error during bulk upload' });
  }
};
