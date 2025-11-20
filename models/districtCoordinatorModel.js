const mongoose = require("mongoose");

const districtCoordinatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true, unique: true },
    password: { type: String, required: true },
    districtId: { type: mongoose.Schema.Types.ObjectId, ref: "District" },
    approved: { type: Boolean, default: false },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
  },
  {
    timestamps: true,
    collection: "district_coordinators",
  }
);

districtCoordinatorSchema.index({ districtId: 1 }, { unique: true, partialFilterExpression: { districtId: { $type: "objectId" } } });

module.exports = mongoose.model("DistrictCoordinator", districtCoordinatorSchema);
