const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Create a "Transporter" (The engine that actually sends the email)
  const transporter = nodemailer.createTransport({
    service: 'Gmail', // We are using Gmail to send these
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD, 
    },
  });

  // 2. Define the email options (Who, what, and the message)
  const mailOptions = {
    from: `CreditSnap Support <${process.env.EMAIL_USERNAME}>`,
    to: options.email, // The student's email
    subject: options.subject, // e.g., "Password Reset" or "Debt Warning"
    text: options.message, // The actual text body
    // html: options.html // (Optional) You can uncomment this later if you want to send fancy HTML emails!
  };

  // 3. Actually send the email!
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;