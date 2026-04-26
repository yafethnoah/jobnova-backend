const express = require('express');
const { Resend } = require('resend');
const router = express.Router();

router.post('/draft-recruiter-email', (req, res) => {
  const { companyName, roleTitle, userName } = req.body || {};
  return res.json({
    ok: true,
    subject: `Application for ${roleTitle || 'the role'}`,
    html: `<p>Dear Hiring Team,</p><p>I am writing to express my interest in the ${roleTitle || 'role'} opportunity at ${companyName || 'your organization'}.</p><p>Best regards,<br/>${userName || 'Candidate'}</p>`
  });
});

router.post('/send-test-email', async (req, res) => {
  try {
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      return res.status(400).json({ message: 'Resend is not configured. Add RESEND_API_KEY and EMAIL_FROM in backend/.env.' });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { to } = req.body || {};
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'JobNova test email',
      html: '<p>Your JobNova email service is working.</p>'
    });
    return res.json({ ok: true, result });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not send email.' });
  }
});

module.exports = router;
