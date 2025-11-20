const mongoose = require("mongoose");

const accompanyingTeacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    mobile: { type: String, trim: true },
    member: { type: String, trim: true },
    gender: { type: String, trim: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    districtId: { type: mongoose.Schema.Types.ObjectId, ref: "District", required: true },
    schoolName: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolUser", required: true },
    present: { type: Boolean, default: false },
    frozen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

accompanyingTeacherSchema.index({ districtId: 1, schoolName: 1, name: 1 });

module.exports = mongoose.model("AccompanyingTeacher", accompanyingTeacherSchema);
