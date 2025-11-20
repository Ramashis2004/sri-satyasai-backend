const Brevo = require("@getbrevo/brevo");

let emailsApi;

function getEmailsApi() {
  if (emailsApi) return emailsApi;
  const { BREVO_API_KEY } = process.env;
  if (!BREVO_API_KEY) {
    console.warn("Email not configured: missing BREVO_API_KEY env var");
    return null;
  }
  const apiClient = Brevo.ApiClient.instance;
  apiClient.authentications["api-key"].apiKey = BREVO_API_KEY;
  emailsApi = new Brevo.TransactionalEmailsApi();
  return emailsApi;
}

async function sendMail({ to, subject, html }) {
  const api = getEmailsApi();
  if (!api) return { skipped: true };

  const fromEmail = process.env.MAIL_FROM;
  const fromName = process.env.MAIL_FROM_NAME || undefined;
  if (!fromEmail) {
    console.warn("Email not configured: missing MAIL_FROM env var");
    return { skipped: true };
  }

  const toList = Array.isArray(to) ? to : [to];
  const payload = {
    sender: { email: fromEmail, name: fromName },
    to: toList.filter(Boolean).map((email) => ({ email })),
    subject,
    htmlContent: html,
  };

  return api.sendTransacEmail(payload);
}

module.exports = { sendMail };
