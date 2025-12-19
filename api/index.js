const express = require("express");
require("dotenv").config();
const cors = require("cors");
const connectDB = require("../config/db");
const Event = require("../models/eventModel");

// Import all routes
const authRoutes = require("../routes/authRoutes");
const adminRoutes = require("../routes/adminRoutes");
const districtRoutes = require("../routes/districtRoutes");
const schoolEventRoutes = require("../routes/schoolEventRoutes");
const adminEventRoutes = require("../routes/adminEventRoutes");
const adminDistrictEventRoutes = require("../routes/districtEventAdminRoutes");
const adminOtherEventRoutes = require("../routes/otherEventAdminRoutes");
const adminEvaluationRoutes = require("../routes/adminEvaluationRoutes");
const adminAnnouncementRoutes = require("../routes/adminAnnouncementRoutes");
const districtUserEventRoutes = require("../routes/districtUserEventRoutes");
const itAdminParticipantRoutes = require("../routes/itAdminParticipantRoutes");
const eventCoordinatorRoutes = require("../routes/eventCoordinatorRoutes");
const publicEventRoutes = require("../routes/publicEventRoutes");
const publicAnnouncementRoutes = require("../routes/publicAnnouncementRoutes");
const publicContactRoutes = require("../routes/publicContactRoutes");

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Connect MongoDB
connectDB();

// Ensure hidden Cultural Programme exists (not shown in normal listings)
async function ensureCulturalEvent() {
  try {
    let cultural = await Event.findOne({ eventType: "cultural" });
    if (!cultural) {
      cultural = await Event.create({
        title: "Cultural Programme",
        description: "Hidden cultural programme for school registrations",
        gender: "both",
        audience: "both",
        isGroupEvent: false,
        participantCount: null,
        isHidden: true,
        eventType: "cultural",
      });
      console.log("✅ Created Cultural Programme:", cultural._id.toString());
    } else {
      console.log("✅ Cultural Programme already exists:", cultural._id.toString());
    }
  } catch (e) {
    console.error("Failed to ensure Cultural Programme exists", e.message);
  }
}

ensureCulturalEvent();

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend running successfully",
    time: new Date(),
  });
});

// API Routes
app.use("/api", authRoutes);
app.use("/api/admin", adminEventRoutes);
app.use("/api/admin", adminDistrictEventRoutes);
app.use("/api/admin", adminOtherEventRoutes);
app.use("/api/admin", adminEvaluationRoutes);
app.use("/api/admin", adminAnnouncementRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/district", districtRoutes);
app.use("/api/school", schoolEventRoutes);
app.use("/api/district-user", districtUserEventRoutes);
app.use("/api/it-admin", itAdminParticipantRoutes);
app.use("/api/event-coordinator", eventCoordinatorRoutes);
app.use("/api/public", publicEventRoutes);
app.use("/api/public", publicAnnouncementRoutes);
app.use("/api/public", publicContactRoutes);

// Start Server (Render uses PORT env)
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app; // for testing (optional)
