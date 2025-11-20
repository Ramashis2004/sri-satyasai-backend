const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const crypto = require("crypto");

const EventCoordinator = require("../models/eventCoordinatorModel");
const Admin = require("../models/adminModel");
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
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { name, email, mobile, password, repeatPassword } = req.body;
    if (password !== repeatPassword) return res.status(400).json({ message: "Passwords do not match" });

    const existsAny = await existsInModel(EventCoordinator, { email, mobile });
    if (existsAny) return res.status(400).json({ message: "You’re already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const doc = await EventCoordinator.create({ name, email, mobile, password: hashedPassword });

    // Fire-and-forget admin notification
    (async () => {
      try {
        const admins = await Admin.find({}, { email: 1 }).lean();
        const to = admins.map((a) => a.email).filter(Boolean);
        if (to.length) {
          
          const subject = `New event coordinator registration awaiting approval`;
          const html = `
            <p>Hello Admin,</p>
            <p>A new <strong>event coordinator</strong> has registered and is awaiting approval.</p>
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

    res.status(201).json({ message: "Registration successful. Awaiting approval.", user: doc });
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
    const user = await EventCoordinator.findOne({ email })
      .lean()
      .select("_id password approved name email mobile");
    if (!user) return res.status(404).json({ message: "User not found" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ message: "Invalid credentials" });

    if (typeof user.approved !== "undefined" && !user.approved) return res.status(403).json({ message: "Account not approved yet." });

    const token = jwt.sign({ id: user._id, role: "event_coordinator" }, process.env.JWT_SECRET, { expiresIn: "7d" });
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
    const user = await EventCoordinator.findOne({ email });
    if (!user) {
      return res.json({ message: "Password reset link sent if email exists." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 1000 * 60 * 60;
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(expires);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "https://district-education-management-syste.vercel.app";
    const resetUrl = `${frontendUrl}/set-new-password?token=${token}&role=event_coordinator`;
    const subject = "Password Reset Instructions";
    const html = `
      <p>Hello ${user.name || ""},</p>
      <p>We received a request to reset your password.</p>
      <p>Click the link below to set a new password (valid for 1 hour):</p>
      <p><a href="${resetUrl}" target="_blank">Reset Password</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `;
    // Do not await email sending
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
    const user = await EventCoordinator.findOne({ passwordResetToken: token, passwordResetExpires: { $gt: new Date() } });
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
