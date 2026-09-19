require('dotenv').config();
const path = require('path');

const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (err) {
  // Default DNS fallback
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const passwordManagementRoutes = require('./routes/passwordManagementRoutes');
const venueRoutes = require('./routes/venueRoutes');
const eventNoticeRoutes = require('./routes/eventNoticeRoutes');
const feePaymentRoutes = require('./routes/feePaymentRoutes');
const transportRoutes = require('./routes/transportRoutes');
const alumniRoutes = require('./routes/alumniRoutes');
const alumniJobRoutes = require('./routes/alumniJobRoutes');
const systemAnnouncementRoutes = require('./routes/systemAnnouncementRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('University ERP Node.js & Express server is running!');
});

app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
// Password Management demo module — isolated from existing auth routes
app.use('/api/password-mgmt', passwordManagementRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/events', eventNoticeRoutes);
app.use('/api/fee-payments', feePaymentRoutes);
app.use('/api/payment', feePaymentRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/alumni-jobs', alumniJobRoutes);
app.use('/api/system-announcements', systemAnnouncementRoutes);

// Fallback for non-API web routes (redirect browser navigation to frontend)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.redirect(`${FRONTEND_URL}${req.originalUrl}`);
  }
  next();
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/template-db';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

