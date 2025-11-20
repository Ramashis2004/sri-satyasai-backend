const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const crypto = require("crypto");

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

    const existsAny = await existsInModel(Admin, { email, mobile });
    if (existsAny) return res.status(400).json({ message: "You’re already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const doc = await Admin.create({ name, email, mobile, password: hashedPassword });

    const { password: _pw, ...safeUser } = doc.toObject ? doc.toObject() : doc;
    res.status(201).json({ message: "Registration successful.", user: safeUser });
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
    const user = await Admin.findOne({ email })
      .lean()
      .select("_id password name email mobile");
    if (!user) return res.status(404).json({ message: "User not found" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });
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
    const user = await Admin.findOne({ email });
    if (!user) return res.json({ message: "Password reset link sent if email exists." });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 1000 * 60 * 60;
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(expires);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/set-new-password?token=${token}&role=admin`;

    const subject = "Password Reset Instructions";
    const html = `
      <p>Hello ${user.name || ""},</p>
      <p>We received a request to reset your password.</p>
      <p>Click the link below to set a new password (valid for 1 hour):</p>
      <p><a href="${resetUrl}" target="_blank">Reset Password</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `;
    // Fire-and-forget email to reduce latency
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
    const user = await Admin.findOne({ passwordResetToken: token, passwordResetExpires: { $gt: new Date() } });
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
