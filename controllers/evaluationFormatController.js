const Joi = require("joi");
const EvaluationFormat = require("../models/evaluationFormatModel");

exports.get = async (req, res) => {
  try {
    const { scope, eventId } = req.query;
    if (!scope || !eventId) return res.status(400).json({ message: "scope and eventId are required" });
    const doc = await EvaluationFormat.findOne({ scope, eventId });
    return res.json(doc || { scope, eventId, criteria: [], totalMarks: 0 });
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
    });
    const { value, error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const totalMarks = (value.criteria || []).reduce((s, c) => s + Number(c.maxMarks || 0), 0);
    const payload = {
      scope: value.scope,
      eventId: value.eventId,
      criteria: value.criteria,
      totalMarks,
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
