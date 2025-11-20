const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
  {
    schoolName: { type: String, required: true, trim: true },
    districtId: { type: mongoose.Schema.Types.ObjectId, ref: "District", required: true },
  },
  {
    timestamps: true, // ✅ adds createdAt & updatedAt automatically
  }
);

// Unique per district
schoolSchema.index({ schoolName: 1, districtId: 1 }, { unique: true });

module.exports = mongoose.model("School", schoolSchema);
