export async function sendMail({ to, subject, text }) {
  // Fallback mailer to keep core API working when SMTP is not configured.
  console.info('[mailer] sendMail fallback', {
    to: to || '',
    subject: subject || '',
    text: text || '',
  });
  return { accepted: to ? [to] : [] };
}
