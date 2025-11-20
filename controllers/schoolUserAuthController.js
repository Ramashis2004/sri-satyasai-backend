const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const crypto = require("crypto");

const SchoolUser = require("../models/schoolUserModel");
const Admin = require("../models/adminModel");
const District = require("../models/districtModel");
const { sendMail } = require("../utils/mailer");

async function existsInModel(Model, { email, mobile }) {
  const or = [{ email }];
  if (mobile) or.push({ mobile });
  const found = await Model.findOne({ $or: or }).lean().select("_id");
  return !!found;
}

exports.register = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      mobile: Joi.string().required(),
      password: Joi.string().min(6).required(),
      repeatPassword: Joi.string().required(),
      districtId: Joi.string().allow(""),
      district: Joi.string().allow(""),
      schoolName: Joi.string().required(),
      roleInSchool: Joi.string().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    let { name, email, mobile, password, repeatPassword, districtId, district, schoolName, roleInSchool } = req.body;
    if (password !== repeatPassword) return res.status(400).json({ message: "Passwords do not match" });
    if (!districtId && !district) return res.status(400).json({ message: "districtId is required" });

    const existsAny = await existsInModel(SchoolUser, { email, mobile });
    if (existsAny) return res.status(400).json({ message: "You’re already registered." });

    if (!districtId && district) {
      const distDoc = await District.findOne({ districtName: district });
      if (!distDoc) return res.status(400).json({ message: "Invalid district" });
      districtId = distDoc._id.toString();
    }

   // ✅ Check if a user already exists for this school
    const existingUser = await SchoolUser.findOne({
      districtId,
      schoolName,
    }).lean();

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "A user is already registered for this school." });
    }


    const hashedPassword = await bcrypt.hash(password, 10);
    const doc = await SchoolUser.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      districtId: districtId || undefined,
      schoolName,
      roleInSchool,
    });

    // Fire-and-forget admin notification to avoid blocking response
    (async () => {
      try {
        const admins = await Admin.find({}, { email: 1 }).lean();
        const to = admins.map((a) => a.email).filter(Boolean);
        if (to.length) {
         
          const subject = `New school user registration awaiting approval`;
          const html = `
            <p>Hello Admin,</p>
            <p>A new <strong>school user</strong> has registered and is awaiting approval.</p>
            <ul>
              <li>Name: ${doc.name}</li>
              <li>Email: ${doc.email}</li>
              ${doc.mobile ? `<li>Mobile: ${doc.mobile}</li>` : ""}
            </ul>
            
          `;
          await sendMail({ to, subject, html });
        }
      } catch (e) {
        console.warn("Failed to send admin notification email:", e.message);
      }
    })();

    const { password: _pw, ...safeUser } = doc.toObject ? doc.toObject() : doc;
    res.status(201).json({ message: "Registration successful. Awaiting approval.", user: safeUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email, password } = req.body;
    const user = await SchoolUser.findOne({ email })
      .lean()
      .select("_id password approved name email mobile districtId schoolName roleInSchool");
    if (!user) return res.status(404).json({ message: "User not found" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ message: "Invalid credentials" });

    if (typeof user.approved !== "undefined" && !user.approved) return res.status(403).json({ message: "Account not approved yet." });

    const token = jwt.sign({ id: user._id, role: "school_user" }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const { password: _pw, ...safeUser } = user;
    res.json({ message: "Login successful", token, user: safeUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const schema = Joi.object({ email: Joi.string().email().required() });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email } = req.body;
    const user = await SchoolUser.findOne({ email });
    if (!user) {
      return res.json({ message: "Password reset link sent if email exists." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 1000 * 60 * 60;
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(expires);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/set-new-password?token=${token}&role=school_user`;
    const subject = "Password Reset Instructions";
    const html = `
      <p>Hello ${user.name || ""},</p>
      <p>We received a request to reset your password.</p>
      <p>Click the link below to set a new password (valid for 1 hour):</p>
      <p><a href="${resetUrl}" target="_blank">Reset Password</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `;
    // Do not await email sending to reduce latency
    sendMail({ to: user.email, subject, html }).catch((e) => {
      console.warn("Failed to send reset email:", e.message);
    });

    res.json({ message: "Password reset link sent if email exists." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.resetPasswordWithToken = async (req, res) => {
  try {
    const schema = Joi.object({
      token: Joi.string().required(),
      newPassword: Joi.string().min(6).required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { token, newPassword } = req.body;
    const user = await SchoolUser.findOne({ passwordResetToken: token, passwordResetExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
