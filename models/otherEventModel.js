const mongoose = require("mongoose");

const otherEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date },
    venue: { type: String, trim: true },
    gender: { type: String, enum: ["boy", "girl", "both"], default: "both" },
    forSchool: { type: Boolean, default: false },
    forDistrict: { type: Boolean, default: false },
    forParents: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// unique title guard (case-insensitive via collation/index)
otherEventSchema.index({ title: 1 }, { unique: true });

module.exports = mongoose.model("OtherEvent", otherEventSchema);
