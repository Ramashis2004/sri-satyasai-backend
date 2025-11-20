const mongoose = require("mongoose");

const CriterionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    maxMarks: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const EvaluationFormatSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ["school", "district"], required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    criteria: { type: [CriterionSchema], default: [] },
    totalMarks: { type: Number, default: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

EvaluationFormatSchema.index({ scope: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model("EvaluationFormat", EvaluationFormatSchema);
