require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");

const quoteRoutes = require("./routes/quoteRoutes");
const locationsRoutes = require("./routes/locationsRoutes");
// Add this with your other route imports
const trackingRoutes = require('./routes/trackingRoutes');
const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

const cors = require("cors");

app.use(cors({
  origin: ["http://localhost:5173","https://quick-ship-flame.vercel.app/"],   // Or 3000 depending on your React
  credentials: true
}));

app.use(express.json({ limit: "10kb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

// ✅ ROUTES FIRST
app.use("/api/quotes", quoteRoutes);

// At the bottom with your other routes
app.use("/api/locations", locationsRoutes);



// Add this with your other route uses
app.use('/api/tracking', trackingRoutes);

// ✅ ERROR HANDLER LAST
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
