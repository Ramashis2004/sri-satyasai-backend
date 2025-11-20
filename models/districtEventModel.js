const mongoose = require("mongoose");

const districtEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date },
    venue: { type: String, trim: true },
  },
  { timestamps: true }
);

districtEventSchema.index({ title: 1 }, { unique: true });

module.exports = mongoose.model("DistrictEvent", districtEventSchema);
