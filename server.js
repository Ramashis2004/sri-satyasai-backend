require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const districtRoutes = require("./routes/districtRoutes");
const schoolEventRoutes = require("./routes/schoolEventRoutes");
const adminEventRoutes = require("./routes/adminEventRoutes");
const adminDistrictEventRoutes = require("./routes/districtEventAdminRoutes");
const adminEvaluationRoutes = require("./routes/adminEvaluationRoutes");
const adminAnnouncementRoutes = require("./routes/adminAnnouncementRoutes");
const districtUserEventRoutes = require("./routes/districtUserEventRoutes");
const itAdminParticipantRoutes = require("./routes/itAdminParticipantRoutes");
const eventCoordinatorRoutes = require("./routes/eventCoordinatorRoutes");
const publicEventRoutes = require("./routes/publicEventRoutes");
const publicAnnouncementRoutes = require("./routes/publicAnnouncementRoutes");

const app = express();
app.use(express.json());
app.use(cors());

connectDB();

app.use("/api", authRoutes);
// Mount admin events before generic admin routes to avoid path conflicts
app.use("/api/admin", adminEventRoutes);
app.use("/api/admin", adminDistrictEventRoutes);
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
