const mongoose = require("mongoose");

const districtAccompanyingTeacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    mobile: { type: String, trim: true },
    member: { type: String, trim: true },
    gender: { type: String, trim: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "DistrictEvent" },
    districtId: { type: mongoose.Schema.Types.ObjectId, ref: "District", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "DistrictCoordinator", required: true },
    present: { type: Boolean, default: false },
    frozen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

districtAccompanyingTeacherSchema.index({ districtId: 1, name: 1 });

module.exports = mongoose.model("DistrictAccompanyingTeacher", districtAccompanyingTeacherSchema);
