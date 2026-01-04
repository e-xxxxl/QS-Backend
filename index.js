require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");

const quoteRoutes = require("./routes/quoteRoutes");
const locationsRoutes = require("./routes/locationsRoutes");
const authRoutes = require("./routes/authRoutes");
// Add this with your other route imports
const trackingRoutes = require('./routes/trackingRoutes');
// Add this to your server file, after auth routes
const userRoutes = require('./routes/userRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); // Add this line
const emailRoutes = require('./routes/emailRoutes');
// In your main server file (server.js or app.js)
const adminRoutes = require('./routes/adminRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const app = express();
const PORT = process.env.PORT || 5000;

connectDB();




app.use(cors({
  origin: ["https://quickship.africa", "http://localhost:5173", "https://quick-ship-flame.vercel.app"],   // Or 3000 depending on your React
  credentials: true
}));

app.use(express.json({ limit: "10kb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

// ✅ ROUTES FIRST
app.use("/api/quotes", quoteRoutes);

// At the bottom with your other routes
app.use("/api/locations", locationsRoutes);

app.use('/api/payments', paymentRoutes); // Add this line

app.use('/api/email', emailRoutes);


// Add this with your other route uses
app.use('/api/tracking', trackingRoutes);


app.use('/api/auth', authRoutes);

app.use('/api/user', userRoutes);

app.use('/api/shipments', shipmentRoutes);

// Add after other route declarations
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);

// ✅ ERROR HANDLER LAST
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
