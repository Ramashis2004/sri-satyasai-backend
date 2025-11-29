const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date },
    venue: { type: String, trim: true },
    gender: { type: String, enum: ["boy", "girl", "both"], default: "both" },
    audience: { type: String, enum: ["junior", "senior", "both"], default: "both" },
    isGroupEvent: { type: Boolean, default: false },
    participantCount: { type: Number, min: 2, default: null },

    // createdBy is optional to allow admin-created events
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolUser", required: false },
  },
  { timestamps: true }
);

// Useful indexes
eventSchema.index({ createdBy: 1, date: -1 });

// ❌ Remove this
// eventSchema.index({ title: 1 }, { unique: true });

// ✔ Add this: unique combination (title + audience)
eventSchema.index(
  { title: 1, audience: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model("Event", eventSchema);
