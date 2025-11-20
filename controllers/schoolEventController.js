const Joi = require("joi");
const Event = require("../models/eventModel");
const Participant = require("../models/participantModel");
const AccompanyingTeacher = require("../models/accompanyingTeacherModel");

function ensureEventInScope(event, scope) {
  // No scoping: allow all events
  return !!event;
}

exports.createEvent = async (req, res) => {
  try {
    const schema = Joi.object({
      title: Joi.string().required(),
      description: Joi.string().allow(""),
      date: Joi.date().required(),
      venue: Joi.string().allow(""),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { schoolName } = req.schoolScope;
    const doc = await Event.create({
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
      venue: req.body.venue,
      schoolName,
      createdBy: req.user.id,
    });
    res.status(201).json({ message: "Event created", event: doc });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.updateParticipant = async (req, res) => {
  try {
    const { participantId } = req.params;
    const schema = Joi.object({
      name: Joi.string().allow(""),
      className: Joi.string().allow(""),
      gender: Joi.string().allow(""),
      group: Joi.string().allow(""),
      eventId: Joi.string().allow(""),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const p = await Participant.findById(participantId);
    if (!p || p.districtId.toString() !== req.schoolScope.districtId || p.schoolName !== req.schoolScope.schoolName)
      return res.status(404).json({ message: "Participant not found" });

    if (req.body.eventId) {
      const ev = await Event.findById(req.body.eventId);
      if (!ev || !ensureEventInScope(ev, req.schoolScope)) return res.status(404).json({ message: "Event not found" });
      p.eventId = ev._id;
    }
    if (req.body.name != null) p.name = req.body.name;
    if (req.body.className != null) p.className = req.body.className;
    if (req.body.gender != null) p.gender = req.body.gender;
    if (req.body.group != null) p.group = req.body.group;

    await p.save();
    res.json({ message: "Participant updated", participant: p });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.deleteParticipant = async (req, res) => {
  try {
    const { participantId } = req.params;
    const p = await Participant.findById(participantId);
    if (!p || p.districtId.toString() !== req.schoolScope.districtId || p.schoolName !== req.schoolScope.schoolName)
      return res.status(404).json({ message: "Participant not found" });
    await p.deleteOne();
    res.json({ message: "Participant deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.listEvents = async (req, res) => {
  try {
    const events = await Event.find({}).sort({ date: -1, createdAt: -1 });
    res.json(events);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || !ensureEventInScope(event, req.schoolScope)) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || !ensureEventInScope(event, req.schoolScope)) return res.status(404).json({ message: "Event not found" });

    const schema = Joi.object({
      title: Joi.string().allow(""),
      description: Joi.string().allow(""),
      date: Joi.date().allow(null),
      venue: Joi.string().allow(""),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      {
        ...(req.body.title != null ? { title: req.body.title } : {}),
        ...(req.body.description != null ? { description: req.body.description } : {}),
        ...(req.body.date != null ? { date: req.body.date } : {}),
        ...(req.body.venue != null ? { venue: req.body.venue } : {}),
      },
      { new: true }
    );
    res.json({ message: "Event updated", event: updated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || !ensureEventInScope(event, req.schoolScope)) return res.status(404).json({ message: "Event not found" });

    await Participant.deleteMany({ eventId: event._id });
    await event.deleteOne();
    res.json({ message: "Event deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.createParticipant = async (req, res) => {
  try {
    const schema = Joi.object({
      eventId: Joi.string().required(),
      name: Joi.string().required(),
      className: Joi.string().allow(""),
      gender: Joi.string().allow(""),
      group: Joi.string().allow(""),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const event = await Event.findById(req.body.eventId);
    if (!event || !ensureEventInScope(event, req.schoolScope)) return res.status(404).json({ message: "Event not found" });

    const { districtId, schoolName } = req.schoolScope;
    const participant = await Participant.create({
      name: req.body.name,
      className: req.body.className,
      gender: req.body.gender,
      group: req.body.group,
      eventId: event._id,
      districtId,
      schoolName,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Participant added", participant });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.listParticipants = async (req, res) => {
  try {
    const { districtId, schoolName } = req.schoolScope;
    const { eventId } = req.query;

    let filter = { districtId, schoolName };
    if (eventId) {
      const event = await Event.findById(eventId);
      if (!event || !ensureEventInScope(event, req.schoolScope)) return res.status(404).json({ message: "Event not found" });
      filter.eventId = eventId;
    }

    const participants = await Participant.find(filter).populate("assignedTeacher");
    res.json(participants);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.assignTeacherToParticipant = async (req, res) => {
  try {
    const schema = Joi.object({
      participantId: Joi.string().required(),
      teacherId: Joi.string().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { participantId, teacherId } = req.body;
    const { districtId, schoolName } = req.schoolScope;

    const [participant, teacher] = await Promise.all([
      Participant.findById(participantId),
      AccompanyingTeacher.findById(teacherId),
    ]);

    if (!participant || participant.districtId.toString() !== districtId || participant.schoolName !== schoolName)
      return res.status(404).json({ message: "Participant not found" });
    if (!teacher || teacher.districtId.toString() !== districtId || teacher.schoolName !== schoolName)
      return res.status(404).json({ message: "Teacher not found" });

    participant.assignedTeacher = teacher._id;
    await participant.save();

    res.json({ message: "Teacher assigned", participant });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().allow(""),
      mobile: Joi.string().allow(""),
      member: Joi.string().allow(""),
      gender: Joi.string().allow(""),
      eventId: Joi.string().allow(""),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { districtId, schoolName } = req.schoolScope;

    let eventId = undefined;
    if (req.body.eventId) {
      const ev = await Event.findById(req.body.eventId);
      if (!ev || !ensureEventInScope(ev, req.schoolScope)) return res.status(404).json({ message: "Event not found" });
      eventId = ev._id;
    }

    const teacher = await AccompanyingTeacher.create({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      member: req.body.member,
      gender: req.body.gender,
      eventId,
      districtId,
      schoolName,
      createdBy: req.user.id,
    });
    res.status(201).json({ message: "Teacher created", teacher });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.listTeachers = async (req, res) => {
  try {
    const { districtId, schoolName } = req.schoolScope;
    const teachers = await AccompanyingTeacher.find({ districtId, schoolName }).sort({ name: 1 });
    res.json(teachers);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const schema = Joi.object({
      name: Joi.string().allow(""),
      email: Joi.string().email().allow(""),
      mobile: Joi.string().allow(""),
      member: Joi.string().allow(""),
      gender: Joi.string().allow(""),
      eventId: Joi.string().allow(""),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const t = await AccompanyingTeacher.findById(teacherId);
    if (!t || t.districtId.toString() !== req.schoolScope.districtId || t.schoolName !== req.schoolScope.schoolName)
      return res.status(404).json({ message: "Teacher not found" });

    if (req.body.name != null) t.name = req.body.name;
    if (req.body.email != null) t.email = req.body.email;
    if (req.body.mobile != null) t.mobile = req.body.mobile;
    if (req.body.member != null) t.member = req.body.member;
    if (req.body.gender != null) t.gender = req.body.gender;
    if (req.body.eventId != null) {
      if (!req.body.eventId) {
        t.eventId = undefined;
      } else {
        const ev = await Event.findById(req.body.eventId);
        if (!ev || !ensureEventInScope(ev, req.schoolScope)) return res.status(404).json({ message: "Event not found" });
        t.eventId = ev._id;
      }
    }

    await t.save();
    res.json({ message: "Teacher updated", teacher: t });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const t = await AccompanyingTeacher.findById(teacherId);
    if (!t || t.districtId.toString() !== req.schoolScope.districtId || t.schoolName !== req.schoolScope.schoolName)
      return res.status(404).json({ message: "Teacher not found" });
    await t.deleteOne();
    // Unassign from participants in same school
    await Participant.updateMany({ assignedTeacher: t._id }, { $unset: { assignedTeacher: 1 } });
    res.json({ message: "Teacher deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
