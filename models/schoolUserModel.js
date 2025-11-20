const mongoose = require("mongoose");

const schoolUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true, unique: true },
    password: { type: String, required: true },
    districtId: { type: mongoose.Schema.Types.ObjectId, ref: "District" },
    schoolName: { type: String, trim: true },
    roleInSchool: { type: String, trim: true },
    approved: { type: Boolean, default: false },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
  },
  {
    timestamps: true,
    collection: "school_users",
  }
);

module.exports = mongoose.model("SchoolUser", schoolUserSchema);
