const express = require('express');
const cors = require('cors'); 
const nodemailer = require('nodemailer');
const { generateOTPEmailHTML, generateOTPEmailText } = require('./emailTemplates');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const otpStore = {};

app.post('/send-otp', (req, res) => {
  console.log('📧 Received OTP request for:', req.body.email);
  
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;

  let mailOptions;
  try {
    mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Campus Login OTP Code',
      text: generateOTPEmailText(otp),
      html: generateOTPEmailHTML(otp, email)
    };
  } catch (error) {
    mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Campus Login OTP Code',
      text: `Your OTP code is ${otp}`
    };
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) return res.status(500).json({ success: false, message: 'Failed to send OTP' });
    res.json({ success: true, message: 'OTP sent' });
  });
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

  if (otpStore[email] === otp) {
    delete otpStore[email];
    return res.json({ success: true, message: "OTP verified!" });
  }
  res.status(400).json({ success: false, message: "Invalid OTP" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port: ${PORT}`);
});
