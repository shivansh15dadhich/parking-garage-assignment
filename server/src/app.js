const express = require('express');
const cors = require('cors');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const parkingRoutes = require('./routes/parkingRoutes');
const spotRoutes = require('./routes/spotRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const rateRoutes = require('./routes/rateRoutes');
const clockRoutes = require('./routes/clockRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/spots', spotRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/clock', clockRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Parking garage API running on http://localhost:${config.port}`);
});
