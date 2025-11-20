const Participant = require("../models/participantModel");
const DistrictParticipant = require("../models/districtParticipantModel");
const District = require("../models/districtModel");
const School = require("../models/schoolModel");
const AccompanyingTeacher = require("../models/accompanyingTeacherModel");
const DistrictAccompanyingTeacher = require("../models/districtAccompanyingTeacherModel");

// Helpers
function presentTrueFilter(extra = {}) {
  return { ...extra, present: true };
}
function absentOrMissingFilter(extra = {}) {
  return { ...extra, $or: [ { present: false }, { present: { $exists: false } } ] };
}
function notFrozenFilter(extra = {}) {
  return { ...extra, $or: [ { frozen: false }, { frozen: { $exists: false } } ] };
}

exports.getMetrics = async (req, res) => {
  try {
    const { eventId = "", districtId = "" } = req.query || {};

    const base = {};
    if (eventId) base.eventId = eventId;
    if (districtId) base.districtId = districtId;

    // Participants present only
    const [schoolPresent, districtPresent] = await Promise.all([
      Participant.find(presentTrueFilter(base)).select("gender districtId schoolName").lean(),
      DistrictParticipant.find(presentTrueFilter(base)).select("gender districtId").lean(),
    ]);

    const totalPresent = schoolPresent.length + districtPresent.length;
    const schoolBoys = schoolPresent.filter(p => p.gender === 'boy').length;
    const schoolGirls = schoolPresent.filter(p => p.gender === 'girl').length;
    const districtBoys = districtPresent.filter(p => p.gender === 'boy').length;
    const districtGirls = districtPresent.filter(p => p.gender === 'girl').length;
    const boys = schoolBoys + districtBoys;
    const girls = schoolGirls + districtGirls;

    // Reported = frozen=true. Compute distinct schools and districts with any frozen submission.
    const [frozenSchoolNamesArr, frozenSchoolDistrictIds, frozenDistrictDistrictIds] = await Promise.all([
      Participant.distinct('schoolName', { ...base, frozen: true }),
      Participant.distinct('districtId', { ...base, frozen: true }),
      DistrictParticipant.distinct('districtId', { ...base, frozen: true }),
    ]);

    const schoolsReportedCount = new Set((frozenSchoolNamesArr || []).map(String).filter(Boolean)).size;
    const schoolDistrictSet = new Set(((frozenSchoolDistrictIds || []).map(String)).filter(Boolean));
    const districtDistrictSet = new Set(((frozenDistrictDistrictIds || []).map(String)).filter(Boolean));
    const districtsReportedCount = new Set([ ...schoolDistrictSet, ...districtDistrictSet ]).size;
    const districtsWithSchoolsCount = schoolDistrictSet.size;
    // Districts that reported only via district submissions and have no school frozen submissions
    let onlyDistrictCount = 0;
    districtDistrictSet.forEach((id) => { if (!schoolDistrictSet.has(id)) onlyDistrictCount += 1; });
    const districtsWithoutSchoolsCount = onlyDistrictCount;

    res.json({
      participants: {
        total: totalPresent,
        boys,
        girls,
        schoolCount: schoolPresent.length,
        districtCount: districtPresent.length,
        schoolBoys,
        schoolGirls,
        districtBoys,
        districtGirls,
      },
      schools: { reportedCount: schoolsReportedCount },
      districts: { reportedCount: districtsReportedCount, withSchoolsCount: districtsWithSchoolsCount, withoutSchoolsCount: districtsWithoutSchoolsCount },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.getTeachersOverview = async (req, res) => {
  try {
    const { eventId = "", districtId = "" } = req.query || {};
    const base = {};
    if (eventId) base.eventId = eventId;
    if (districtId) base.districtId = districtId;

    const norm = (g) => String(g || "").trim().toLowerCase();
    const isMale = (g) => [
      "male","m","man","men","gent","gents","sir",
      "boy","boys","g","b"
    ].includes(norm(g));
    const isFemale = (g) => [
      "female","f","woman","women","lady","ladies","madam","ma'am",
      "girl","girls"
    ].includes(norm(g));

    // Reported = frozen=true
    const [schRep, distRep] = await Promise.all([
      require("../models/accompanyingTeacherModel").find({ ...base, frozen: true }).select("gender member role designation roleName type category").lean(),
      require("../models/districtAccompanyingTeacherModel").find({ ...base, frozen: true }).select("gender member role designation roleName type category").lean(),
    ]);
    const reportedTotal = schRep.length + distRep.length;
    const reportedMale = schRep.filter(t => isMale(t.gender)).length + distRep.filter(t => isMale(t.gender)).length;
    const reportedFemale = schRep.filter(t => isFemale(t.gender)).length + distRep.filter(t => isFemale(t.gender)).length;
    const reportedOther = reportedTotal - reportedMale - reportedFemale;

    // Role normalization helpers for Teacher/Guru split
    const roleText = (r) => {
      const raw = String(r?.role || r?.member || r?.designation || r?.roleName || r?.type || r?.category || "").trim().toLowerCase();
      const map = {
        secretary_manager: "secretary/manager",
        mc_member: "mc member",
      };
      const resolved = map[raw] || raw;
      if (resolved.includes("teacher")) return "teacher";
      if (resolved.includes("guru")) return "guru";
      return resolved;
    };

    // For dashboard split, treat all SCHOOL-sourced as Teachers and all DISTRICT-sourced as Gurus
    const schoolTeacher = schRep.length;
    const schoolGuru = 0;
    const districtTeacher = 0;
    const districtGuru = distRep.length;

    // Yet to report = not frozen
    const notFrozen = notFrozenFilter(base);
    const [schYet, distYet] = await Promise.all([
      require("../models/accompanyingTeacherModel").find(notFrozen).select("gender member role designation roleName type category").lean(),
      require("../models/districtAccompanyingTeacherModel").find(notFrozen).select("gender member role designation roleName type category").lean(),
    ]);
    const yetTotal = schYet.length + distYet.length;
    const yetMale = schYet.filter(t => isMale(t.gender)).length + distYet.filter(t => isMale(t.gender)).length;
    const yetFemale = schYet.filter(t => isFemale(t.gender)).length + distYet.filter(t => isFemale(t.gender)).length;
    const yetOther = yetTotal - yetMale - yetFemale;
    const yetSchoolTeacher = schYet.length;
    const yetDistrictGuru = distYet.length;

    res.json({
      reported: { total: reportedTotal, male: reportedMale, female: reportedFemale, other: reportedOther, schoolTeacher, schoolGuru, districtTeacher, districtGuru },
      yetToReport: { total: yetTotal, male: yetMale, female: yetFemale, other: yetOther, schoolTeacher: yetSchoolTeacher, districtGuru: yetDistrictGuru },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.getNotReported = async (req, res) => {
  try {
    const { eventId = "", districtId = "" } = req.query || {};

    // All districts
    const allDistricts = await District.find().select("_id districtName").lean();

    // Determine districts that reported (any frozen participant in either source)
    const base = {};
    if (eventId) base.eventId = eventId;
    if (districtId) base.districtId = districtId;

    const [schoolFrozenDistrictIds, districtFrozenDistrictIds] = await Promise.all([
      Participant.distinct('districtId', { ...base, frozen: true }),
      DistrictParticipant.distinct('districtId', { ...base, frozen: true }),
    ]);
    const reportedDistrictIds = new Set([ ...schoolFrozenDistrictIds.map(String), ...districtFrozenDistrictIds.map(String) ]);

    const districtsNotReported = allDistricts
      .filter(d => !reportedDistrictIds.has(String(d._id)))
      .map(d => ({ _id: d._id, districtName: d.districtName }));

    // Schools: all schools (optionally filtered by district), subtract those with present
    const schoolFilter = {};
    if (districtId) schoolFilter.districtId = districtId;
    const allSchools = await School.find(schoolFilter).select("_id schoolName districtId").lean();

    const presentSchoolNames = new Set(
      (await Participant.distinct('schoolName', { ...base, frozen: true }))
        .map(String)
        .filter(Boolean)
    );

    const schoolsNotReported = allSchools
      .filter(s => !presentSchoolNames.has(String(s.schoolName)))
      .map(s => ({ _id: s._id, schoolName: s.schoolName, districtId: s.districtId }));

    res.json({
      districts: districtsNotReported,
      schools: schoolsNotReported,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.getStudentsYetToReport = async (req, res) => {
  try {
    const { eventId = "", districtId = "" } = req.query || {};
    const base = {};
    if (eventId) base.eventId = eventId;
    if (districtId) base.districtId = districtId;

    // School-wise yet to report (participants not frozen)
    const schoolYet = await Participant.aggregate([
      { $match: notFrozenFilter(base) },
      { $group: { _id: { schoolName: "$schoolName", districtId: "$districtId" }, count: { $sum: 1 } } },
      { $project: { _id: 0, schoolName: "$_id.schoolName", districtId: "$_id.districtId", count: 1 } },
      { $sort: { count: -1, schoolName: 1 } },
    ]);

    // District-wise yet to report (combine school + district models, not frozen)
    const [schAgg, distAgg, districts] = await Promise.all([
      Participant.aggregate([
        { $match: notFrozenFilter(base) },
        { $group: { _id: "$districtId", count: { $sum: 1 } } },
      ]),
      DistrictParticipant.aggregate([
        { $match: notFrozenFilter(base) },
        { $group: { _id: "$districtId", count: { $sum: 1 } } },
      ]),
      District.find().select("_id districtName").lean(),
    ]);

    const districtNameMap = new Map(districts.map(d => [String(d._id), d.districtName]));
    const districtCounts = new Map();
    schAgg.forEach(r => districtCounts.set(String(r._id), (districtCounts.get(String(r._id)) || 0) + r.count));
    distAgg.forEach(r => districtCounts.set(String(r._id), (districtCounts.get(String(r._id)) || 0) + r.count));

    const districtWise = Array.from(districtCounts.entries()).map(([id, count]) => ({
      districtId: id,
      districtName: districtNameMap.get(String(id)) || "",
      count,
    })).sort((a,b)=> b.count - a.count || a.districtName.localeCompare(b.districtName));

    res.json({ schoolWise: schoolYet, districtWise });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Report: Participants by District (gender split + total)
exports.getParticipantsByDistrictReport = async (req, res) => {
  try {
    const { eventId = "", districtId = "", scope = "", frozen = "true" } = req.query || {};
    const base = {};
    if (eventId) base.eventId = eventId;
    if (districtId) base.districtId = districtId;
    const useFrozen = String(frozen).toLowerCase() !== "false";
    if (useFrozen) base.frozen = true;

    const norm = (g) => String(g || "").trim().toLowerCase();
    const isBoy = (g) => ["boy","boys","male","m","g","b"].includes(norm(g));
    const isGirl = (g) => ["girl","girls","female","f"].includes(norm(g));

    const fetch = async (Model) => await Model.find(base).select("districtId gender").lean();

    let docs = [];
    if (scope === "school") {
      docs = await fetch(Participant);
    } else if (scope === "district") {
      docs = await fetch(DistrictParticipant);
    } else {
      const [a, b] = await Promise.all([fetch(Participant), fetch(DistrictParticipant)]);
      docs = a.concat(b);
    }

    const counts = new Map(); // districtId -> { boy, girl, total }
    for (const d of docs) {
      const key = String(d.districtId || "");
      if (!key) continue;
      if (!counts.has(key)) counts.set(key, { boy: 0, girl: 0, total: 0 });
      const row = counts.get(key);
      row.total += 1;
      if (isBoy(d.gender)) row.boy += 1;
      else if (isGirl(d.gender)) row.girl += 1;
    }

    const districts = await District.find().select("_id districtName").lean();
    const nameMap = new Map(districts.map(d => [String(d._id), d.districtName]));
    const rows = Array.from(counts.entries()).map(([id, c]) => ({
      districtId: id,
      districtName: nameMap.get(id) || "",
      boy: c.boy,
      girl: c.girl,
      total: c.total,
    })).sort((a,b)=> a.districtName.localeCompare(b.districtName));

    const grand = rows.reduce((acc, r) => ({
      boy: acc.boy + r.boy,
      girl: acc.girl + r.girl,
      total: acc.total + r.total,
    }), { boy: 0, girl: 0, total: 0 });

    res.json({ rows, grandTotal: grand });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Report: Teachers by District (role columns + total)
exports.getTeachersByDistrictReport = async (req, res) => {
  try {
    const { eventId = "", districtId = "", scope = "", frozen = "true" } = req.query || {};
    const base = {};
    if (eventId) base.eventId = eventId;
    if (districtId) base.districtId = districtId;
    const useFrozen = String(frozen).toLowerCase() !== "false";
    if (useFrozen) base.frozen = true;

    const fetch = async (Model) => await Model.find(base).select("districtId member").lean();

    let docs = [];
    if (scope === "school") {
      docs = await fetch(AccompanyingTeacher);
    } else if (scope === "district") {
      docs = await fetch(DistrictAccompanyingTeacher);
    } else {
      const [a, b] = await Promise.all([
        fetch(AccompanyingTeacher),
        fetch(DistrictAccompanyingTeacher),
      ]);
      docs = a.concat(b);
    }

    const allRoles = Array.from(new Set(docs.map(x => String(x.member || "").trim()).filter(Boolean))).sort((x,y)=> x.localeCompare(y));
    const counts = new Map(); // districtId -> Map(role->count)

    for (const d of docs) {
      const did = String(d.districtId || "");
      const role = String(d.member || "").trim();
      if (!did || !role) continue;
      if (!counts.has(did)) counts.set(did, new Map());
      const m = counts.get(did);
      m.set(role, (m.get(role) || 0) + 1);
    }

    const districts = await District.find().select("_id districtName").lean();
    const nameMap = new Map(districts.map(d => [String(d._id), d.districtName]));

    const rows = Array.from(counts.entries()).map(([id, roleMap]) => {
      const byRole = {};
      let total = 0;
      for (const r of allRoles) {
        const v = roleMap.get(r) || 0; byRole[r] = v; total += v;
      }
      return { districtId: id, districtName: nameMap.get(id) || "", byRole, total };
    }).sort((a,b)=> a.districtName.localeCompare(b.districtName));

    const grandTotals = allRoles.reduce((acc, r) => ({ ...acc, [r]: 0 }), {});
    let grandTotal = 0;
    for (const row of rows) {
      for (const r of allRoles) grandTotals[r] += row.byRole[r] || 0;
      grandTotal += row.total;
    }

    res.json({ roles: allRoles, rows, grandTotals: { ...grandTotals, total: grandTotal } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Report: Teachers by School (role columns + total)
exports.getTeachersBySchoolReport = async (req, res) => {
  try {
    const { eventId = "", districtId = "", frozen = "true" } = req.query || {};
    const base = {};
    if (eventId) base.eventId = eventId;
    if (districtId) base.districtId = districtId;
    const useFrozen = String(frozen).toLowerCase() !== "false";
    if (useFrozen) base.frozen = true;

    // Only school-level accompanying teachers have schoolName
    const docs = await AccompanyingTeacher.find(base).select("schoolName member").lean();

    const allRoles = Array.from(new Set(docs.map(x => String(x.member || "").trim()).filter(Boolean))).sort((x, y) => x.localeCompare(y));
    const counts = new Map(); // schoolName -> Map(role->count)

    for (const d of docs) {
      const sname = String(d.schoolName || "").trim();
      const role = String(d.member || "").trim();
      if (!sname || !role) continue;
      if (!counts.has(sname)) counts.set(sname, new Map());
      const m = counts.get(sname);
      m.set(role, (m.get(role) || 0) + 1);
    }

    const rows = Array.from(counts.entries()).map(([schoolName, roleMap]) => {
      const byRole = {};
      let total = 0;
      for (const r of allRoles) {
        const v = roleMap.get(r) || 0; byRole[r] = v; total += v;
      }
      return { schoolName, byRole, total };
    }).sort((a, b) => a.schoolName.localeCompare(b.schoolName));

    const grandTotals = allRoles.reduce((acc, r) => ({ ...acc, [r]: 0 }), {});
    let grandTotal = 0;
    for (const row of rows) {
      for (const r of allRoles) grandTotals[r] += row.byRole[r] || 0;
      grandTotal += row.total;
    }

    res.json({ roles: allRoles, rows, grandTotals: { ...grandTotals, total: grandTotal } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
