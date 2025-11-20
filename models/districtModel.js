const mongoose = require("mongoose");

const districtSchema = new mongoose.Schema(
  {
    districtName: { type: String, required: true, unique: true },
  },
  {
    timestamps: true, // ✅ adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model("District", districtSchema);
