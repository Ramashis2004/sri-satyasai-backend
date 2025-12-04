const Joi = require("joi");
const EvaluationFormat = require("../models/evaluationFormatModel");

exports.get = async (req, res) => {
  try {
    const { scope, eventId } = req.query;
    if (!scope || !eventId) return res.status(400).json({ message: "scope and eventId are required" });
    const doc = await EvaluationFormat.findOne({ scope, eventId });
    return res.json(
      doc || {
        scope,
        eventId,
        criteria: [],
        totalMarks: 0,
        judges: [],
        coordinator1: "",
        coordinator2: "",
      }
    );
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.upsert = async (req, res) => {
  try {
    const schema = Joi.object({
      scope: Joi.string().valid("school", "district").required(),
      eventId: Joi.string().required(),
      criteria: Joi.array()
        .items(
          Joi.object({
            label: Joi.string().required(),
            maxMarks: Joi.number().min(0).required(),
          })
        )
        .default([]),
      judges: Joi.array().items(Joi.string().allow("", null)).default([]),
      coordinator1: Joi.string().allow("", null).default(""),
      coordinator2: Joi.string().allow("", null).default(""),
    });
    const { value, error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const totalMarks = (value.criteria || []).reduce((s, c) => s + Number(c.maxMarks || 0), 0);
    const payload = {
      scope: value.scope,
      eventId: value.eventId,
      criteria: value.criteria,
      totalMarks,
      judges: (value.judges || []).map((j) => (j || "").trim()).filter((j) => j),
      coordinator1: (value.coordinator1 || "").trim(),
      coordinator2: (value.coordinator2 || "").trim(),
      updatedBy: req.user?._id || null,
    };

    const saved = await EvaluationFormat.findOneAndUpdate(
      { scope: payload.scope, eventId: payload.eventId },
      { $set: payload },
      { new: true, upsert: true }
    );

    res.json(saved);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
