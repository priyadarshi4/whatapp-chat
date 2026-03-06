const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured, skipping email send');
    return;
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || `ChatApp <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };
