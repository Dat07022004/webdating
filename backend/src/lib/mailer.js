import nodemailer from 'nodemailer';

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP credentials are not set in environment variables');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendMail({ to, subject, text, html }) {
  const transporter = createTransporter();
  const from = process.env.SENDER_EMAIL || process.env.SMTP_USER;
  const info = await transporter.sendMail({ from, to, subject, text, html });
  return info;
}

export default { createTransporter, sendMail };
