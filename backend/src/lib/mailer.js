export async function sendMail({ to, subject, text }) {
  console.info('[mailer] sendMail fallback', {
    to: to || '',
    subject: subject || '',
    text: text || '',
  });
  return { accepted: to ? [to] : [] };
}
