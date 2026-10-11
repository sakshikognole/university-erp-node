const mongoose = require('mongoose');
const EventNotice = require('../models/EventNotice');
const Venue = require('../models/Venue');
const AuditLog = require('../models/AuditLog');
const { cloudinary } = require('../config/cloudinary');

// Safe AuditLog Helper
const logAudit = async (action, req, details) => {
  try {
    await AuditLog.create({
      action,
      performedBy: req?.user?.email || req?.user?.id || req?.user?._id || 'Admin',
      target: 'EventNotice',
      status: 'SUCCESS',
      details: details || '',
    });
  } catch (err) {
    console.warn('AuditLog non-blocking notice:', err.message);
  }
};

// Generate unique event ID
const generateEventId = async () => {
  const prefix = 'EVT';
  const year = new Date().getFullYear().toString().slice(-2);

  // Find the last event created this year
  const lastEvent = await EventNotice.findOne({
    eventId: new RegExp(`^${prefix}${year}`),
  }).sort({ eventId: -1 });

  let sequence = 1;
  if (lastEvent && lastEvent.eventId) {
    const lastSequence = parseInt(lastEvent.eventId.slice(-4), 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}${year}${sequence.toString().padStart(4, '0')}`;
};

// ── Shared backend validation helpers ────────────────────────────────────────
const TITLE_HAS_LETTER = /[A-Za-z]/;
const DURATION_RE = /^\d{1,2}:\d{2}$/;
const DIGITS_ONLY = /^\d+$/;
const URL_PROTOCOLS = /^https?:\/\//i;

/**
 * Validate the fields shared by create and update.
 * Returns an array of error strings (empty = valid).
 */
const validateEventFields = ({ title, description, eventDate, eventTime, venue, organizer, imageUrl, duration }) => {
  const errors = [];

  // Title: required, must contain at least one letter
  const titleTrimmed = (title || '').trim();
  if (!titleTrimmed) {
    errors.push('Event Title is required.');
  } else if (titleTrimmed.length < 3) {
    errors.push('Event Title must be at least 3 characters.');
  } else if (!TITLE_HAS_LETTER.test(titleTrimmed)) {
    errors.push('Event Title must contain at least one letter (e.g. 2026 Tech Fest).');
  }

  if (!(description || '').trim()) errors.push('Description is required.');
  if (!eventDate) errors.push('Event Date is required.');
  if (!eventTime) errors.push('Event Time is required.');
  if (!venue) errors.push('Venue is required.');

  // Organizer name: required, must contain at least one letter
  const parsedOrg = organizer && typeof organizer === 'object'
    ? organizer
    : (() => { try { return JSON.parse(organizer || '{}'); } catch { return { name: organizer || '' }; } })();
  const orgName = (parsedOrg.name || '').trim();
  if (!orgName) {
    errors.push('Organizer Name is required.');
  } else if (!TITLE_HAS_LETTER.test(orgName)) {
    errors.push('Please enter a valid organizer name.');
  }

  // Image URL: optional; when supplied must be http/https
  const imgUrl = (imageUrl || '').trim();
  if (imgUrl && !URL_PROTOCOLS.test(imgUrl)) {
    errors.push('Please enter a valid URL for the image.');
  }

  // Duration: optional; when supplied must be HH:MM with valid minutes
  const dur = (duration || '').trim();
  if (dur) {
    if (!DURATION_RE.test(dur)) {
      errors.push('Duration must be in HH:MM format (e.g. 02:30).');
    } else {
      const mm = parseInt(dur.split(':')[1], 10);
      const hh = parseInt(dur.split(':')[0], 10);
      if (mm > 59) errors.push('Duration minutes must be between 00 and 59.');
      if (hh === 0 && mm === 0) errors.push('Duration cannot be 00:00.');
    }
  }

  // Organizer contact: optional; when supplied strip country-code prefix and
  // require exactly 10 local digits
  const contact = (parsedOrg.contact || '').trim();
  if (contact) {
    if (/\+\d+\+/.test(contact)) {
      errors.push('Please enter the country code once, followed by your 10-digit number.');
    } else {
      const stripped = contact.replace(/^\+\d{1,3}\s*/, '').replace(/\s/g, '');
      if (!DIGITS_ONLY.test(stripped) || stripped.length !== 10) {
        errors.push('Please enter a valid 10-digit phone number (e.g. +91 1234567890).');
      }
    }
  }

  return errors;
};
// ─────────────────────────────────────────────────────────────────────────────

// Create Event Notice
exports.createEventNotice = async (req, res) => {
  try {
    const {
      title,
      description,
      eventDate,
      eventTime,
      duration,
      venue,
      organizer,
      category,
      targetAudience,
      registrationRequired,
      registrationDeadline,
      maxParticipants,
      tags,
      status,
    } = req.body;

    // Run shared validation
    const validationErrors = validateEventFields({
      title, description, eventDate, eventTime, venue, organizer,
      imageUrl: req.body.imageUrl, duration,
    });
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    // Validate venue exists
    if (!mongoose.Types.ObjectId.isValid(venue)) {
      return res.status(400).json({ message: 'Please select a valid venue from the list' });
    }
    const venueExists = await Venue.findById(venue);
    if (!venueExists) {
      return res.status(404).json({ message: 'Selected venue not found' });
    }

    // Generate event ID
    const eventId = await generateEventId();

    // Get image URL — browser uploads directly to Cloudinary, backend receives the URL
    const imageUrl = req.body.imageUrl?.trim() || null;

    // Safely parse organizer
    let parsedOrganizer = { name: '' };
    if (organizer) {
      if (typeof organizer === 'string') {
        try {
          parsedOrganizer = JSON.parse(organizer);
        } catch (e) {
          parsedOrganizer = { name: organizer };
        }
      } else if (typeof organizer === 'object') {
        parsedOrganizer = organizer;
      }
    }

    // Safely parse targetAudience
    let parsedTargetAudience = ['ALL'];
    if (targetAudience) {
      if (typeof targetAudience === 'string') {
        try {
          parsedTargetAudience = JSON.parse(targetAudience);
        } catch (e) {
          parsedTargetAudience = [targetAudience];
        }
      } else if (Array.isArray(targetAudience)) {
        parsedTargetAudience = targetAudience;
      }
    }

    // Safely parse tags
    let parsedTags = [];
    if (tags) {
      if (typeof tags === 'string') {
        try {
          parsedTags = JSON.parse(tags);
        } catch (e) {
          parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
        }
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    }

    // Create event notice document
    const userId = req.user?.id || req.user?._id || null;
    const resolvedStatus = status || 'PUBLISHED';
    const eventNotice = new EventNotice({
      eventId,
      title: title.trim(),
      description: description.trim(),
      imageUrl,
      eventDate: new Date(eventDate),
      eventTime: eventTime.trim(),
      duration: duration ? duration.trim() : '',
      venue,
      organizer: parsedOrganizer,
      category: category || 'OTHER',
      targetAudience: parsedTargetAudience,
      registrationRequired: registrationRequired === 'true' || registrationRequired === true,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
      tags: parsedTags,
      status: resolvedStatus,
      publishedBy: userId,
      publishedAt: resolvedStatus === 'PUBLISHED' ? new Date() : null,
    });

    await eventNotice.save();

    // Log action safely
    await logAudit('CREATE_EVENT_NOTICE', req, `Created event notice: ${title}`);

    // Populate venue before returning
    await eventNotice.populate('venue');

    return res.status(201).json({
      message: 'Event notice created successfully',
      eventNotice,
    });
  } catch (error) {
    console.error('Error creating event notice:', error);
    return res.status(500).json({ message: 'Failed to create event notice', error: error.message });
  }
};

// Get all Event Notices with filters
exports.getAllEventNotices = async (req, res) => {
  try {
    const {
      status,
      category,
      targetAudience,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'eventDate',
      order = 'asc',
    } = req.query;

    const filter = {};

    if (status && status !== 'ALL') filter.status = status.toUpperCase();
    if (category && category !== 'ALL') filter.category = category.toUpperCase();
    if (targetAudience && targetAudience !== 'ALL') {
      filter.targetAudience = { $in: [targetAudience.toUpperCase(), 'ALL'] };
    }

    if (startDate || endDate) {
      filter.eventDate = {};
      if (startDate) filter.eventDate.$gte = new Date(startDate);
      if (endDate) filter.eventDate.$lte = new Date(endDate);
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [eventNotices, total] = await Promise.all([
      EventNotice.find(filter)
        .populate('venue')
        .populate('publishedBy', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EventNotice.countDocuments(filter),
    ]);

    return res.status(200).json({
      eventNotices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching event notices:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single Event Notice by ID
exports.getEventNoticeById = async (req, res) => {
  try {
    const { id } = req.params;

    let eventNotice = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      eventNotice = await EventNotice.findById(id)
        .populate('venue')
        .populate('publishedBy', 'name email');
    } else {
      eventNotice = await EventNotice.findOne({ eventId: id.toUpperCase() })
        .populate('venue')
        .populate('publishedBy', 'name email');
    }

    if (!eventNotice) {
      return res.status(404).json({ message: 'Event notice not found' });
    }

    return res.status(200).json(eventNotice);
  } catch (error) {
    console.error('Error fetching event notice:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Event Notice by Event ID
exports.getEventNoticeByEventId = async (req, res) => {
  try {
    const { eventId } = req.params;

    const eventNotice = await EventNotice.findOne({ eventId: eventId.toUpperCase() })
      .populate('venue')
      .populate('publishedBy', 'name email');

    if (!eventNotice) {
      return res.status(404).json({ message: 'Event notice not found' });
    }

    return res.status(200).json(eventNotice);
  } catch (error) {
    console.error('Error fetching event notice:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Event Notice
exports.updateEventNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Event Notice ID format' });
    }

    const eventNotice = await EventNotice.findById(id);
    if (!eventNotice) {
      return res.status(404).json({ message: 'Event notice not found' });
    }

    // Run shared field validation on the incoming data
    // Merge with existing doc so required fields already stored aren't
    // accidentally triggered as missing when not re-sent by the client.
    const mergedForValidation = {
      title: updateData.title !== undefined ? updateData.title : eventNotice.title,
      description: updateData.description !== undefined ? updateData.description : eventNotice.description,
      eventDate: updateData.eventDate !== undefined ? updateData.eventDate : eventNotice.eventDate,
      eventTime: updateData.eventTime !== undefined ? updateData.eventTime : eventNotice.eventTime,
      venue: updateData.venue !== undefined ? updateData.venue : eventNotice.venue?.toString(),
      organizer: updateData.organizer !== undefined ? updateData.organizer : eventNotice.organizer,
      imageUrl: updateData.imageUrl !== undefined ? updateData.imageUrl : eventNotice.imageUrl,
      duration: updateData.duration !== undefined ? updateData.duration : eventNotice.duration,
    };
    const validationErrors = validateEventFields(mergedForValidation);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    // If venue is being updated, validate it exists
    if (updateData.venue) {
      if (!mongoose.Types.ObjectId.isValid(updateData.venue)) {
        return res.status(400).json({ message: 'Invalid venue ID provided' });
      }
      const venueExists = await Venue.findById(updateData.venue);
      if (!venueExists) {
        return res.status(404).json({ message: 'Selected venue not found' });
      }
    }

    // Handle image URL update — browser uploads directly to Cloudinary and sends
    // back the URL.  Only touch imageUrl when the client explicitly provides it.
    // If req.body.imageUrl is undefined (key absent), preserve the existing URL.
    if (req.body.imageUrl !== undefined) {
      const newImageUrl = (req.body.imageUrl || '').trim() || null;
      // Only delete the old Cloudinary asset when the URL genuinely changes
      if (newImageUrl !== eventNotice.imageUrl && eventNotice.imageUrl && eventNotice.imageUrl.includes('cloudinary')) {
        const publicId = eventNotice.imageUrl.split('/').pop().split('.')[0];
        try {
          await cloudinary.uploader.destroy(`event-notices/${publicId}`);
        } catch (err) {
          console.warn('Cloudinary old image delete notice:', err.message);
        }
      }
      updateData.imageUrl = newImageUrl;
    } else {
      // Key was not sent — remove it from updateData so findByIdAndUpdate
      // doesn't accidentally unset the field.
      delete updateData.imageUrl;
    }

    // Safely parse JSON strings if they exist
    if (updateData.organizer) {
      if (typeof updateData.organizer === 'string') {
        try {
          updateData.organizer = JSON.parse(updateData.organizer);
        } catch (e) {
          updateData.organizer = { name: updateData.organizer };
        }
      }
    }
    if (updateData.targetAudience) {
      if (typeof updateData.targetAudience === 'string') {
        try {
          updateData.targetAudience = JSON.parse(updateData.targetAudience);
        } catch (e) {
          updateData.targetAudience = [updateData.targetAudience];
        }
      }
    }
    if (updateData.tags) {
      if (typeof updateData.tags === 'string') {
        try {
          updateData.tags = JSON.parse(updateData.tags);
        } catch (e) {
          updateData.tags = updateData.tags.split(',').map((t) => t.trim()).filter(Boolean);
        }
      }
    }
    if (updateData.registrationRequired !== undefined) {
      updateData.registrationRequired =
        updateData.registrationRequired === 'true' || updateData.registrationRequired === true;
    }

    // Update publishedAt if status changes to PUBLISHED
    if (updateData.status === 'PUBLISHED' && eventNotice.status !== 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    const updatedEventNotice = await EventNotice.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    )
      .populate('venue')
      .populate('publishedBy', 'name email');

    // Log action safely
    await logAudit('UPDATE_EVENT_NOTICE', req, `Updated event notice: ${updatedEventNotice.title}`);

    return res.status(200).json({
      message: 'Event notice updated successfully',
      eventNotice: updatedEventNotice,
    });
  } catch (error) {
    console.error('Error updating event notice:', error);
    return res.status(500).json({ message: 'Failed to update event notice', error: error.message });
  }
};

// Delete Event Notice
exports.deleteEventNotice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Event Notice ID format' });
    }

    const eventNotice = await EventNotice.findById(id);
    if (!eventNotice) {
      return res.status(404).json({ message: 'Event notice not found' });
    }

    // Delete image from Cloudinary if it exists
    if (eventNotice.imageUrl && eventNotice.imageUrl.includes('cloudinary')) {
      const publicId = eventNotice.imageUrl.split('/').pop().split('.')[0];
      try {
        await cloudinary.uploader.destroy(`event-notices/${publicId}`);
      } catch (err) {
        console.warn('Cloudinary delete notice:', err.message);
      }
    }

    await EventNotice.findByIdAndDelete(id);

    // Log action safely
    await logAudit('DELETE_EVENT_NOTICE', req, `Deleted event notice: ${eventNotice.title}`);

    return res.status(200).json({ message: 'Event notice deleted successfully' });
  } catch (error) {
    console.error('Error deleting event notice:', error);
    return res.status(500).json({ message: 'Failed to delete event notice', error: error.message });
  }
};

// Publish Event Notice (change status to PUBLISHED)
exports.publishEventNotice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Event Notice ID format' });
    }

    const eventNotice = await EventNotice.findById(id);
    if (!eventNotice) {
      return res.status(404).json({ message: 'Event notice not found' });
    }

    if (eventNotice.status === 'PUBLISHED') {
      return res.status(400).json({ message: 'Event notice is already published' });
    }

    eventNotice.status = 'PUBLISHED';
    eventNotice.publishedAt = new Date();
    await eventNotice.save();

    await logAudit('PUBLISH_EVENT_NOTICE', req, `Published event notice: ${eventNotice.title}`);

    return res.status(200).json({
      message: 'Event notice published successfully',
      eventNotice,
    });
  } catch (error) {
    console.error('Error publishing event notice:', error);
    return res.status(500).json({ message: 'Failed to publish event notice', error: error.message });
  }
};

// Get Upcoming Events (Public)
exports.getUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();
    const upcomingEvents = await EventNotice.find({
      status: 'PUBLISHED',
      eventDate: { $gte: now },
    })
      .populate('venue')
      .sort({ eventDate: 1 })
      .limit(5)
      .lean();

    return res.status(200).json(upcomingEvents);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return res.status(500).json({ message: 'Failed to fetch upcoming events', error: error.message });
  }
};
