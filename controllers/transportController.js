const BusRoute = require('../models/BusRoute');
const Driver   = require('../models/Driver');
const Vehicle  = require('../models/Vehicle');
const BusPass  = require('../models/BusPass');
const Student  = require('../models/Student');

// ── Shared backend validation (mirrors transportValidation.js on the frontend) ──

const ROUTE_NAME_RE = /^[\p{L}\p{N}\s\-,()/:]+$/u;
const DRIVER_NAME_RE = /^[\p{L}\s\-'.]+$/u;
const HAS_LETTER = /\p{L}/u;
const HAS_ALNUM  = /[\p{L}\p{N}]/u;
const CONTACT_RE = /^\+91 \d{10}$/;
const LICENSE_RE = /^[A-Z]{2}[-/ ]?\d{2}[-/ ]?\d{4}[-/ ]?\d{7}$/i;
const VEHICLE_ID_RE = /^[\p{L}\p{N}\-]+$/u;
const VEHICLE_NAME_RE = /^[\p{L}\p{N}\s\-.]+$/u;
const REG_RE  = /^[A-Z]{2}[- ]?\d{1,2}[- ]?[A-Z]{1,3}[- ]?\d{1,4}$/i;
const PASS_ID_RE = /^BP-\d{4}$/i;

const validateRouteName = (v) => {
  const t = (v || '').trim();
  if (!t) return 'Route Name is required.';
  if (!HAS_ALNUM.test(t)) return 'Route Name must contain at least one letter or digit.';
  if (!ROUTE_NAME_RE.test(t)) return 'Route Name contains unsupported characters.';
  return null;
};

const validateDriverName = (v) => {
  const t = (v || '').trim();
  if (!t) return 'Enter a valid driver name.';
  if (!HAS_LETTER.test(t)) return 'Enter a valid driver name.';
  if (!DRIVER_NAME_RE.test(t)) return 'Enter a valid driver name.';
  return null;
};

const validateContact = (v) => {
  const t = (v || '').trim();
  if (!t) return null;
  if (!CONTACT_RE.test(t)) return 'Enter a valid contact number in the format +91 XXXXXXXXXX.';
  return null;
};

const validateLicense = (v) => {
  const t = (v || '').trim().toUpperCase();
  if (!t) return 'License number is required.';
  if (!LICENSE_RE.test(t)) return 'Enter a valid driving license number.';
  return null;
};

const validateVehicleId = (v) => {
  const t = (v || '').trim();
  if (!t) return 'Vehicle ID is required.';
  if (!VEHICLE_ID_RE.test(t)) return 'Vehicle ID must contain only letters, numbers, and hyphens.';
  return null;
};

const validateVehicleName = (v) => {
  const t = (v || '').trim();
  if (!t) return 'Enter a valid vehicle name or model.';
  if (!HAS_ALNUM.test(t)) return 'Enter a valid vehicle name or model.';
  if (!VEHICLE_NAME_RE.test(t)) return 'Enter a valid vehicle name or model.';
  return null;
};

const validateRegistration = (v) => {
  const t = (v || '').trim().toUpperCase();
  if (!t) return 'Vehicle registration number is required.';
  if (!REG_RE.test(t)) return 'Enter a valid vehicle registration number.';
  return null;
};

const validateBusPassId = (v) => {
  const t = (v || '').trim();
  if (!t) return 'Pass ID is required.';
  if (!PASS_ID_RE.test(t)) return 'Enter a valid Bus ID in the format BP-1001.';
  return null;
};

const validateValidTill = (v) => {
  if (!v) return 'Valid Till Date is required.';
  const selected = new Date(v + 'T00:00:00');
  const today    = new Date(); today.setHours(0,0,0,0);
  if (selected < today) return 'Valid Till Date cannot be in the past.';
  return null;
};

// ==========================================
// DRIVERS CONTROLLERS
// ==========================================

// Get next auto-incremented Driver ID
exports.getNextDriverId = async (req, res) => {
  try {
    const latestDriver = await Driver.findOne().sort({ driverId: -1 });
    const nextId = latestDriver && typeof latestDriver.driverId === 'number' ? latestDriver.driverId + 1 : 101;
    res.json({ nextId });
  } catch (error) {
    console.error('Error getting next driver ID:', error);
    res.status(500).json({ message: 'Error retrieving next driver ID', error: error.message });
  }
};

// Get all drivers
exports.getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ driverId: 1 });
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ message: 'Failed to fetch drivers', error: error.message });
  }
};

// Create a new driver
exports.createDriver = async (req, res) => {
  try {
    let { driverId, name, phone, licenseNumber, status } = req.body;

    const nameErr = validateDriverName(name);
    if (nameErr) return res.status(400).json({ message: nameErr });

    const contactErr = validateContact(phone);
    if (contactErr) return res.status(400).json({ message: contactErr });

    const licenseErr = validateLicense(licenseNumber);
    if (licenseErr) return res.status(400).json({ message: licenseErr });

    // D12: duplicate license check (case-insensitive)
    const normalizedLicense = (licenseNumber || '').trim().toUpperCase();
    const dupLicense = await Driver.findOne({ licenseNumber: normalizedLicense });
    if (dupLicense) return res.status(400).json({ message: 'License number already exists.' });

    if (!driverId) {
      const latestDriver = await Driver.findOne().sort({ driverId: -1 });
      driverId = latestDriver && typeof latestDriver.driverId === 'number' ? latestDriver.driverId + 1 : 101;
    } else {
      driverId = Number(driverId);
    }

    // Check duplicate ID
    const existing = await Driver.findOne({ driverId });
    if (existing) {
      return res.status(400).json({ message: `Driver ID ${driverId} already exists.` });
    }

    const newDriver = new Driver({
      driverId,
      name: name.trim(),
      phone: (phone || '').trim(),
      licenseNumber: normalizedLicense,
      status: status || 'ACTIVE',
    });

    await newDriver.save();
    res.status(201).json({ message: 'Driver added successfully!', driver: newDriver });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ message: 'Failed to create driver', error: error.message });
  }
};

// Get single driver by ID
exports.getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Driver.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { driverId: isNaN(id) ? null : Number(id) }],
    });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json(driver);
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ message: 'Failed to fetch driver', error: error.message });
  }
};

// Update driver
exports.updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, name, phone, licenseNumber, status } = req.body;

    const driver = await Driver.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { driverId: isNaN(id) ? null : Number(id) }],
    });

    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    // Validate updated fields
    if (name !== undefined) {
      const nameErr = validateDriverName(name);
      if (nameErr) return res.status(400).json({ message: nameErr });
    }
    if (phone !== undefined) {
      const contactErr = validateContact(phone);
      if (contactErr) return res.status(400).json({ message: contactErr });
    }
    if (licenseNumber !== undefined) {
      const licenseErr = validateLicense(licenseNumber);
      if (licenseErr) return res.status(400).json({ message: licenseErr });
      // D12: duplicate check — exclude current driver
      const normalizedLic = licenseNumber.trim().toUpperCase();
      const dupLic = await Driver.findOne({ licenseNumber: normalizedLic, _id: { $ne: driver._id } });
      if (dupLic) return res.status(400).json({ message: 'License number already exists.' });
    }

    if (driverId !== undefined) {
      const numId = Number(driverId);
      if (!isNaN(numId) && numId !== driver.driverId) {
        const existing = await Driver.findOne({ driverId: numId, _id: { $ne: driver._id } });
        if (existing) {
          return res.status(400).json({ message: `Driver ID ${numId} is already in use.` });
        }
        driver.driverId = numId;
      }
    }

    if (name !== undefined) driver.name = name.trim();
    if (phone !== undefined) driver.phone = (phone || '').trim();
    if (licenseNumber !== undefined) driver.licenseNumber = licenseNumber.trim().toUpperCase();
    if (status !== undefined) driver.status = status;

    await driver.save();
    res.json({ message: 'Driver updated successfully!', driver });
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ message: 'Failed to update driver', error: error.message });
  }
};

// Delete driver
exports.deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Driver.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { driverId: isNaN(id) ? null : Number(id) }],
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ message: 'Failed to delete driver', error: error.message });
  }
};

// ==========================================
// VEHICLES CONTROLLERS
// ==========================================

// Get all vehicles
exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ message: 'Failed to fetch vehicles', error: error.message });
  }
};

// Get single vehicle by ID
exports.getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { vehicleId: id }],
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ message: 'Failed to fetch vehicle', error: error.message });
  }
};

// Create a new vehicle
exports.createVehicle = async (req, res) => {
  try {
    const { vehicleId, name, vehicleNumber, capacity, status } = req.body;

    const idErr = validateVehicleId(vehicleId);
    if (idErr) return res.status(400).json({ message: idErr });

    const nameErr = validateVehicleName(name);
    if (nameErr) return res.status(400).json({ message: nameErr });

    // Imp-23 + D17: registration mandatory and valid
    const regErr = validateRegistration(vehicleNumber);
    if (regErr) return res.status(400).json({ message: regErr });

    const cleanVehicleId = vehicleId.toString().trim();
    const existing = await Vehicle.findOne({ vehicleId: cleanVehicleId });
    if (existing) return res.status(400).json({ message: `Vehicle ID '${cleanVehicleId}' already exists.` });

    // D15: duplicate registration check
    const normalizedReg = vehicleNumber.trim().toUpperCase();
    const dupReg = await Vehicle.findOne({ vehicleNumber: normalizedReg });
    if (dupReg) return res.status(400).json({ message: 'Vehicle registration number already exists.' });

    const newVehicle = new Vehicle({
      vehicleId: cleanVehicleId,
      name: name.trim(),
      vehicleNumber: normalizedReg,
      capacity: capacity ? Number(capacity) : 40,
      status: status || 'ACTIVE',
    });

    await newVehicle.save();
    res.status(201).json({ message: 'Vehicle added successfully!', vehicle: newVehicle });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ message: 'Failed to create vehicle', error: error.message });
  }
};

// Update vehicle
exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleId, name, vehicleNumber, capacity, status } = req.body;

    const vehicle = await Vehicle.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { vehicleId: id }],
    });

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    // Validate updated fields
    if (name !== undefined) {
      const nameErr = validateVehicleName(name);
      if (nameErr) return res.status(400).json({ message: nameErr });
    }
    if (vehicleNumber !== undefined) {
      const regErr = validateRegistration(vehicleNumber);
      if (regErr) return res.status(400).json({ message: regErr });
      // D15: duplicate reg — exclude self
      const normalizedReg = vehicleNumber.trim().toUpperCase();
      if (normalizedReg !== vehicle.vehicleNumber) {
        const dupReg = await Vehicle.findOne({ vehicleNumber: normalizedReg, _id: { $ne: vehicle._id } });
        if (dupReg) return res.status(400).json({ message: 'Vehicle registration number already exists.' });
      }
    }

    if (vehicleId !== undefined) {
      const cleanVehicleId = vehicleId.toString().trim();
      if (cleanVehicleId && cleanVehicleId !== vehicle.vehicleId) {
        const existing = await Vehicle.findOne({ vehicleId: cleanVehicleId, _id: { $ne: vehicle._id } });
        if (existing) {
          return res.status(400).json({ message: `Vehicle ID '${cleanVehicleId}' is already in use.` });
        }
        vehicle.vehicleId = cleanVehicleId;
      }
    }

    if (name !== undefined) vehicle.name = name.trim();
    if (vehicleNumber !== undefined) vehicle.vehicleNumber = vehicleNumber.trim().toUpperCase();
    if (capacity !== undefined) vehicle.capacity = Number(capacity) || 40;
    if (status !== undefined) vehicle.status = status;

    await vehicle.save();
    res.json({ message: 'Vehicle updated successfully!', vehicle });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ message: 'Failed to update vehicle', error: error.message });
  }
};

// Delete vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Vehicle.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { vehicleId: id }],
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ message: 'Failed to delete vehicle', error: error.message });
  }
};

// ==========================================
// BUS ROUTES CONTROLLERS
// ==========================================

// Get next Route ID
exports.getNextRouteId = async (req, res) => {
  try {
    const latestRoute = await BusRoute.findOne().sort({ routeId: -1 });
    const nextId = latestRoute && typeof latestRoute.routeId === 'number' ? latestRoute.routeId + 1 : 1;
    res.json({ nextId });
  } catch (error) {
    console.error('Error getting next route ID:', error);
    res.status(500).json({ message: 'Error retrieving next route ID', error: error.message });
  }
};

// Get all bus routes
exports.getRoutes = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      const numSearch = Number(search.trim());
      const conditions = [
        { routeName: regex },
        { driverName: regex },
        { vehicleName: regex },
        { stops: { $in: [regex] } },
      ];
      if (!isNaN(numSearch)) {
        conditions.push({ routeId: numSearch });
      }
      query = { $or: conditions };
    }

    const routes = await BusRoute.find(query).sort({ routeId: 1 });
    res.json(routes);
  } catch (error) {
    console.error('Error fetching bus routes:', error);
    res.status(500).json({ message: 'Failed to fetch bus routes', error: error.message });
  }
};

// Get single bus route
exports.getRouteById = async (req, res) => {
  try {
    const { id } = req.params;
    const route = await BusRoute.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { routeId: isNaN(id) ? null : Number(id) }],
    });

    if (!route) {
      return res.status(404).json({ message: 'Bus route not found' });
    }

    res.json(route);
  } catch (error) {
    console.error('Error fetching bus route:', error);
    res.status(500).json({ message: 'Failed to fetch bus route', error: error.message });
  }
};

// Create bus route
exports.createRoute = async (req, res) => {
  try {
    let { routeId, hasCustomName, routeName, driverId, driverName, vehicleId, vehicleName, stops, status } = req.body;

    if (routeId === undefined || routeId === null || routeId === '') {
      return res.status(400).json({ message: 'Route ID is required (number)' });
    }

    routeId = Number(routeId);
    if (isNaN(routeId)) {
      return res.status(400).json({ message: 'Route ID must be a valid number' });
    }

    // D2: validate custom route name on backend
    if (hasCustomName && routeName) {
      const nameErr = validateRouteName(routeName);
      if (nameErr) return res.status(400).json({ message: nameErr });
    }

    if (!driverName || !driverName.trim()) {
      return res.status(400).json({ message: 'Driver Name is required' });
    }

    if (!vehicleName || !vehicleName.trim()) {
      return res.status(400).json({ message: 'Vehicle Name is required' });
    }

    // Check duplicate route ID
    const existing = await BusRoute.findOne({ routeId });
    if (existing) {
      return res.status(400).json({ message: `Route ID ${routeId} already exists.` });
    }

    // Process stops array: clean up and filter empties
    let processedStops = [];
    if (Array.isArray(stops)) {
      processedStops = stops.map(s => String(s).trim()).filter(s => s.length > 0);
    } else if (typeof stops === 'string') {
      processedStops = stops.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    const newRoute = new BusRoute({
      routeId,
      hasCustomName: Boolean(hasCustomName),
      routeName: hasCustomName ? (routeName || '').trim() : '',
      driverId: driverId ? Number(driverId) : null,
      driverName: driverName.trim(),
      vehicleId: (vehicleId || '').toString().trim(),
      vehicleName: vehicleName.trim(),
      stops: processedStops,
      status: status || 'ACTIVE',
    });

    await newRoute.save();
    res.status(201).json({ message: 'Bus route created successfully!', route: newRoute });
  } catch (error) {
    console.error('Error creating bus route:', error);
    res.status(500).json({ message: 'Failed to create bus route', error: error.message });
  }
};

// Update bus route
exports.updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    let { routeId, hasCustomName, routeName, driverId, driverName, vehicleId, vehicleName, stops, status } = req.body;

    const route = await BusRoute.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { routeId: isNaN(id) ? null : Number(id) }],
    });

    if (!route) {
      return res.status(404).json({ message: 'Bus route not found' });
    }

    if (routeId !== undefined) {
      const numId = Number(routeId);
      if (!isNaN(numId) && numId !== route.routeId) {
        const existing = await BusRoute.findOne({ routeId: numId, _id: { $ne: route._id } });
        if (existing) {
          return res.status(400).json({ message: `Route ID ${numId} is already in use.` });
        }
        route.routeId = numId;
      }
    }

    if (hasCustomName !== undefined) {
      route.hasCustomName = Boolean(hasCustomName);
      route.routeName = route.hasCustomName ? (routeName || '').trim() : '';
    } else if (routeName !== undefined) {
      route.routeName = (routeName || '').trim();
    }

    if (driverName !== undefined) route.driverName = driverName.trim();
    if (driverId !== undefined) route.driverId = driverId ? Number(driverId) : null;
    if (vehicleName !== undefined) route.vehicleName = vehicleName.trim();
    if (vehicleId !== undefined) route.vehicleId = (vehicleId || '').toString().trim();
    if (status !== undefined) route.status = status;

    if (stops !== undefined) {
      let processedStops = [];
      if (Array.isArray(stops)) {
        processedStops = stops.map(s => String(s).trim()).filter(s => s.length > 0);
      } else if (typeof stops === 'string') {
        processedStops = stops.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
      route.stops = processedStops;
    }

    await route.save();
    res.json({ message: 'Bus route updated successfully!', route });
  } catch (error) {
    console.error('Error updating bus route:', error);
    res.status(500).json({ message: 'Failed to update bus route', error: error.message });
  }
};

// Delete bus route
exports.deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await BusRoute.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { routeId: isNaN(id) ? null : Number(id) }],
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Bus route not found' });
    }

    res.json({ message: 'Bus route deleted successfully' });
  } catch (error) {
    console.error('Error deleting bus route:', error);
    res.status(500).json({ message: 'Failed to delete bus route', error: error.message });
  }
};

// ==========================================
// BUS PASSES CONTROLLERS
// ==========================================

// Get next Pass ID suggestion
exports.getNextPassId = async (req, res) => {
  try {
    const latestPass = await BusPass.findOne().sort({ createdAt: -1 });
    let nextNum = 1001;
    if (latestPass && latestPass.passId) {
      const match = latestPass.passId.match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      }
    }
    res.json({ nextPassId: `BP-${nextNum}` });
  } catch (error) {
    console.error('Error getting next pass ID:', error);
    res.status(500).json({ message: 'Error retrieving next pass ID', error: error.message });
  }
};

// Get all bus passes
exports.getPasses = async (req, res) => {
  try {
    const passes = await BusPass.find().sort({ createdAt: -1 });
    res.json(passes);
  } catch (error) {
    console.error('Error fetching bus passes:', error);
    res.status(500).json({ message: 'Failed to fetch bus passes', error: error.message });
  }
};

// Get single bus pass
exports.getPassById = async (req, res) => {
  try {
    const { id } = req.params;
    const pass = await BusPass.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { passId: id }],
    });

    if (!pass) {
      return res.status(404).json({ message: 'Bus pass not found' });
    }

    res.json(pass);
  } catch (error) {
    console.error('Error fetching bus pass:', error);
    res.status(500).json({ message: 'Failed to fetch bus pass', error: error.message });
  }
};

// Verify / Lookup student by PRN
exports.verifyStudentByPRN = async (req, res) => {
  try {
    const { prn } = req.params;
    if (!prn || !prn.trim()) {
      return res.status(400).json({ valid: false, message: 'PRN is required' });
    }

    const cleanPRN = prn.trim();
    const student = await Student.findOne({
      $or: [
        { prn: cleanPRN.toUpperCase() },
        { prn: cleanPRN },
        { prn: new RegExp(`^${cleanPRN}$`, 'i') },
      ],
    });

    if (!student) {
      return res.status(404).json({
        valid: false,
        message: `Student with PRN '${cleanPRN}' was not found in the student directory.`,
      });
    }

    res.json({
      valid: true,
      student: {
        _id: student._id,
        prn: student.prn,
        name: student.name,
        class: student.class,
        division: student.division,
        degree: student.degree,
      },
    });
  } catch (error) {
    console.error('Error verifying student PRN:', error);
    res.status(500).json({ valid: false, message: 'Server error verifying student PRN', error: error.message });
  }
};

// Create bus pass
exports.createPass = async (req, res) => {
  try {
    let { passId, studentId, studentName, routeId, fromStop, toStop, paymentStatus, validTill } = req.body;

    if (!passId || !passId.toString().trim()) {
      return res.status(400).json({ message: 'Pass ID is required' });
    }

    // D18/D19: Bus Pass ID format
    const passIdErr = validateBusPassId(passId);
    if (passIdErr) return res.status(400).json({ message: passIdErr });

    if (!studentId || !studentId.toString().trim()) {
      return res.status(400).json({ message: 'Student ID / PRN is required' });
    }
    if (routeId === undefined || routeId === null || routeId === '') {
      return res.status(400).json({ message: 'Route selection is required' });
    }
    if (!fromStop || !fromStop.trim()) {
      return res.status(400).json({ message: 'From Stop is required' });
    }
    if (!validTill) {
      return res.status(400).json({ message: 'Valid Till date is required' });
    }

    // D20: reject past dates
    const dateErr = validateValidTill(validTill);
    if (dateErr) return res.status(400).json({ message: dateErr });

    const cleanPassId = passId.toString().trim();
    const existing = await BusPass.findOne({ passId: cleanPassId });
    if (existing) {
      return res.status(400).json({ message: `Pass ID '${cleanPassId}' already exists.` });
    }

    // Verify student exists by PRN
    const cleanStudentId = studentId.toString().trim();
    const student = await Student.findOne({
      $or: [
        { prn: cleanStudentId.toUpperCase() },
        { prn: cleanStudentId },
        { prn: new RegExp(`^${cleanStudentId}$`, 'i') },
      ],
    });

    if (!student) {
      return res.status(400).json({
        message: `Student with PRN '${cleanStudentId}' does not exist in student records. Please enter a valid enrolled student PRN.`,
      });
    }

    const newPass = new BusPass({
      passId: cleanPassId,
      studentId: student.prn,
      studentName: student.name,
      routeId: Number(routeId),
      fromStop: fromStop.trim(),
      toStop: (toStop || 'University Campus').trim(),
      paymentStatus: paymentStatus || 'PAID',
      validTill: new Date(validTill),
    });

    await newPass.save();
    res.status(201).json({ message: 'Bus Pass issued successfully!', pass: newPass });
  } catch (error) {
    console.error('Error creating bus pass:', error);
    res.status(500).json({ message: 'Failed to create bus pass', error: error.message });
  }
};

// Update bus pass
exports.updatePass = async (req, res) => {
  try {
    const { id } = req.params;
    let { passId, studentId, studentName, routeId, fromStop, toStop, paymentStatus, validTill } = req.body;

    const pass = await BusPass.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { passId: id }],
    });

    if (!pass) {
      return res.status(404).json({ message: 'Bus pass not found' });
    }

    if (passId !== undefined) {
      const cleanPassId = passId.toString().trim();
      if (cleanPassId && cleanPassId !== pass.passId) {
        const existing = await BusPass.findOne({ passId: cleanPassId, _id: { $ne: pass._id } });
        if (existing) {
          return res.status(400).json({ message: `Pass ID '${cleanPassId}' is already in use.` });
        }
        pass.passId = cleanPassId;
      }
    }

    if (studentId !== undefined) {
      const cleanStudentId = studentId.toString().trim();
      const student = await Student.findOne({
        $or: [
          { prn: cleanStudentId.toUpperCase() },
          { prn: cleanStudentId },
          { prn: new RegExp(`^${cleanStudentId}$`, 'i') },
        ],
      });

      if (!student) {
        return res.status(400).json({
          message: `Student with PRN '${cleanStudentId}' does not exist in student records.`,
        });
      }

      pass.studentId = student.prn;
      pass.studentName = student.name;
    }

    if (routeId !== undefined) pass.routeId = Number(routeId);
    if (fromStop !== undefined) pass.fromStop = fromStop.trim();
    if (toStop !== undefined) pass.toStop = toStop.trim();
    if (paymentStatus !== undefined) pass.paymentStatus = paymentStatus;
    if (validTill !== undefined) {
      const dateErr = validateValidTill(validTill);
      if (dateErr) return res.status(400).json({ message: dateErr });
      pass.validTill = new Date(validTill);
    }

    await pass.save();
    res.json({ message: 'Bus pass updated successfully!', pass });
  } catch (error) {
    console.error('Error updating bus pass:', error);
    res.status(500).json({ message: 'Failed to update bus pass', error: error.message });
  }
};

// Delete bus pass
exports.deletePass = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await BusPass.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { passId: id }],
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Bus pass not found' });
    }

    res.json({ message: 'Bus pass deleted successfully' });
  } catch (error) {
    console.error('Error deleting bus pass:', error);
    res.status(500).json({ message: 'Failed to delete bus pass', error: error.message });
  }
};
