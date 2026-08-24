const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const AuditLog = require('../models/AuditLog');

// Get All Venues
exports.getVenues = async (req, res) => {
  try {
    const venues = await Venue.find().sort({ createdAt: -1 });
    return res.status(200).json(venues);
  } catch (error) {
    console.error('Get Venues Error:', error);
    return res.status(500).json({ message: 'Error fetching venues from database' });
  }
};

// Get Single Venue by ID or venueId
exports.getVenueById = async (req, res) => {
  try {
    const { id } = req.params;
    let venue = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      venue = await Venue.findById(id);
    }
    if (!venue) {
      venue = await Venue.findOne({ venueId: id.trim().toUpperCase() });
    }

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    return res.status(200).json(venue);
  } catch (error) {
    console.error('Get Venue Error:', error);
    return res.status(500).json({ message: 'Error fetching venue details' });
  }
};

// Create New Venue
exports.createVenue = async (req, res) => {
  try {
    const { venueId, name, capacity, facilities, status } = req.body;

    if (!venueId || !name || !capacity || !status) {
      return res.status(400).json({ message: 'Venue ID, Name, Capacity, and Status are required' });
    }

    if (capacity < 1) {
      return res.status(400).json({ message: 'Capacity must be at least 1' });
    }

    const cleanVenueId = venueId.trim().toUpperCase();

    const existingVenue = await Venue.findOne({ venueId: cleanVenueId });
    if (existingVenue) {
      return res.status(409).json({ 
        message: `A venue with ID '${cleanVenueId}' already exists` 
      });
    }

    const newVenue = await Venue.create({
      venueId: cleanVenueId,
      name: name.trim(),
      capacity: Number(capacity),
      facilities: Array.isArray(facilities) 
        ? facilities.map(f => ({
            name: f.name?.trim() || '',
            details: f.details?.trim() || '',
          })).filter(f => f.name)
        : [],
      status: status.trim().toUpperCase(),
    });

    await AuditLog.create({
      action: 'VENUE_CREATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${newVenue.name} (${newVenue.venueId})`,
      status: 'SUCCESS',
      details: `Created new venue ${newVenue.venueId}`,
    });

    return res.status(201).json({
      message: `Venue '${newVenue.name}' added successfully`,
      venue: newVenue,
    });
  } catch (error) {
    console.error('Create Venue Error:', error);
    return res.status(500).json({ message: 'Server error creating venue' });
  }
};

// Update Venue
exports.updateVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const { venueId, name, capacity, facilities, status } = req.body;

    if (!venueId || !name || !capacity || !status) {
      return res.status(400).json({ message: 'Venue ID, Name, Capacity, and Status are required' });
    }

    if (capacity < 1) {
      return res.status(400).json({ message: 'Capacity must be at least 1' });
    }

    let venue = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      venue = await Venue.findById(id);
    }
    if (!venue) {
      venue = await Venue.findOne({ venueId: id.trim().toUpperCase() });
    }

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const cleanVenueId = venueId.trim().toUpperCase();

    // If venueId changed, check uniqueness
    if (cleanVenueId !== venue.venueId) {
      const existingVenue = await Venue.findOne({ venueId: cleanVenueId });
      if (existingVenue && existingVenue._id.toString() !== venue._id.toString()) {
        return res.status(409).json({
          message: `A venue with ID '${cleanVenueId}' already exists`,
        });
      }
      venue.venueId = cleanVenueId;
    }

    venue.name = name.trim();
    venue.capacity = Number(capacity);
    venue.facilities = Array.isArray(facilities)
      ? facilities.map(f => ({
          name: f.name?.trim() || '',
          details: f.details?.trim() || '',
        })).filter(f => f.name)
      : [];
    venue.status = status.trim().toUpperCase();

    await venue.save();

    await AuditLog.create({
      action: 'VENUE_UPDATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${venue.name} (${venue.venueId})`,
      status: 'SUCCESS',
      details: `Updated venue record for ${venue.venueId}`,
    });

    return res.status(200).json({
      message: `Venue '${venue.name}' updated successfully`,
      venue,
    });
  } catch (error) {
    console.error('Update Venue Error:', error);
    return res.status(500).json({ message: 'Server error updating venue' });
  }
};

// Delete Venue
exports.deleteVenue = async (req, res) => {
  try {
    const { id } = req.params;
    let venue = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      venue = await Venue.findById(id);
    }
    if (!venue) {
      venue = await Venue.findOne({ venueId: id.trim().toUpperCase() });
    }

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    await Venue.findByIdAndDelete(venue._id);

    await AuditLog.create({
      action: 'VENUE_DELETED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${venue.name} (${venue.venueId})`,
      status: 'SUCCESS',
      details: `Deleted venue ${venue.venueId}`,
    });

    return res.status(200).json({
      message: `Venue '${venue.name}' deleted successfully`,
    });
  } catch (error) {
    console.error('Delete Venue Error:', error);
    return res.status(500).json({ message: 'Server error deleting venue' });
  }
};

// Bulk Create Venues
exports.bulkCreateVenues = async (req, res) => {
  try {
    const { venues } = req.body;

    if (!Array.isArray(venues) || venues.length === 0) {
      return res.status(400).json({ message: 'Venues array is required and cannot be empty' });
    }

    const results = {
      created: 0,
      failed: 0,
      details: [],
    };

    for (const venueData of venues) {
      try {
        const { venueId, name, capacity, facilities, status } = venueData;

        if (!venueId || !name || !capacity || !status) {
          results.failed++;
          results.details.push({
            venueId: venueId || 'Unknown',
            status: 'failed',
            reason: 'Missing required fields',
          });
          continue;
        }

        if (capacity < 1) {
          results.failed++;
          results.details.push({
            venueId,
            status: 'failed',
            reason: 'Capacity must be at least 1',
          });
          continue;
        }

        const cleanVenueId = venueId.trim().toUpperCase();

        const existingVenue = await Venue.findOne({ venueId: cleanVenueId });
        if (existingVenue) {
          results.failed++;
          results.details.push({
            venueId: cleanVenueId,
            status: 'failed',
            reason: 'Venue ID already exists',
          });
          continue;
        }

        await Venue.create({
          venueId: cleanVenueId,
          name: name.trim(),
          capacity: Number(capacity),
          facilities: Array.isArray(facilities)
            ? facilities.map(f => ({
                name: f.name?.trim() || '',
                details: f.details?.trim() || '',
              })).filter(f => f.name)
            : [],
          status: status.trim().toUpperCase(),
        });

        results.created++;
        results.details.push({
          venueId: cleanVenueId,
          status: 'success',
        });

        await AuditLog.create({
          action: 'VENUE_BULK_CREATED',
          performedBy: req.user?.email || 'superadmin@university.edu',
          target: `${name.trim()} (${cleanVenueId})`,
          status: 'SUCCESS',
          details: `Bulk created venue ${cleanVenueId}`,
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          venueId: venueData.venueId || 'Unknown',
          status: 'failed',
          reason: error.message,
        });
      }
    }

    return res.status(201).json({
      message: `Bulk upload completed: ${results.created} created, ${results.failed} failed`,
      created: results.created,
      failed: results.failed,
      details: results.details,
    });
  } catch (error) {
    console.error('Bulk Create Venues Error:', error);
    return res.status(500).json({ message: 'Server error during bulk venue creation' });
  }
};
