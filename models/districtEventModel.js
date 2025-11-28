const mongoose = require("mongoose");

const districtEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date },
    venue: { type: String, trim: true },
     gender: { type: String, enum: ["boy", "girl", "both"], default: "both" },
  },
  { timestamps: true }
);

districtEventSchema.index({ title: 1 }, { unique: true });

module.exports = mongoose.model("DistrictEvent", districtEventSchema);
