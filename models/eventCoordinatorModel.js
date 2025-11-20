const mongoose = require("mongoose");

const eventCoordinatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true, unique: true },
    password: { type: String, required: true },
    approved: { type: Boolean, default: false },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
  },
  {
    timestamps: true,
    collection: "event_coordinators",
  }
);

module.exports = mongoose.model("EventCoordinator", eventCoordinatorSchema);
