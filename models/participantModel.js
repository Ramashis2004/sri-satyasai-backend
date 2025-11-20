const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    className: { type: String, trim: true },
    gender: { type: String, trim: true },
    group: { type: String, trim: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    districtId: { type: mongoose.Schema.Types.ObjectId, ref: "District", required: true },
    schoolName: { type: String, required: true, trim: true },
    assignedTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "AccompanyingTeacher" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolUser", required: true },
    present: { type: Boolean, default: false },
    frozen: { type: Boolean, default: false },
    // Event coordinator scoring
    marks: { type: Number, min: 0, max: 30 },
    evaluation: { type: String, trim: true },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "EventCoordinator" },
    evaluatedAt: { type: Date },
  },
  { timestamps: true }
);

participantSchema.index({ eventId: 1 });
participantSchema.index({ districtId: 1, schoolName: 1 });

module.exports = mongoose.model("Participant", participantSchema);
