const Joi = require("joi");
const { sendMail } = require("../utils/mailer");

exports.submit = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).max(100).required(),
      email: Joi.string().email().required(),
      subject: Joi.string().min(2).max(150).required(),
      message: Joi.string().min(5).max(5000).required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { name, email, subject, message } = req.body;

    const to = process.env.CONTACT_TO || process.env.MAIL_FROM;
    if (!to) return res.status(500).json({ message: "Email not configured" });

    const html = `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br/>")}</p>
    `;

    await sendMail({ to, subject: `[Contact] ${subject}`, html });

    res.json({ message: "Your message has been sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
