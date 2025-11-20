const mongoose = require("mongoose");

const districtParticipantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    className: { type: String, trim: true },
    gender: { type: String, trim: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "DistrictEvent", required: true },
    districtId: { type: mongoose.Schema.Types.ObjectId, ref: "District", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "DistrictCoordinator", required: true },
    present: { type: Boolean, default: false },
    frozen: { type: Boolean, default: false },
    // Event coordinator scoring for district-level participants
    marks: { type: Number, min: 0, max: 30 },
    evaluation: { type: String, trim: true },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "EventCoordinator" },
    evaluatedAt: { type: Date },
  },
  { timestamps: true }
);

districtParticipantSchema.index({ eventId: 1 });
districtParticipantSchema.index({ districtId: 1, name: 1 });

module.exports = mongoose.model("DistrictParticipant", districtParticipantSchema);
