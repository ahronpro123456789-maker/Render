const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { generateOTPEmailHTML, generateOTPEmailText } = require('./emailTemplates');
const fetch = require('node-fetch'); // ⭐️ REQUIRED for reCAPTCHA

const app = express();

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY; // ⭐️ REQUIRED for reCAPTCHA

// --- CORS Setup ---
const corsOptions = {
  origin: CORS_ORIGIN
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587, // Change port to 587
  secure: false, // Change secure to false
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  }
});

// Using your in-memory otpStore
const otpStore = {}; 

// --- ⭐️ UPDATED /send-otp ROUTE (with reCAPTCHA) ---
app.post('/send-otp', async (req, res) => {
  console.log('📧 Received OTP request for:', req.body.email);

  // 1. Get email and reCAPTCHA token
  const { email, recaptchaToken } = req.body;

  // 2. Verify the reCAPTCHA token (if provided)
  if (recaptchaToken) {
    console.log('🔍 Verifying reCAPTCHA token...');
    
    // Check if secret key is missing
    if (!RECAPTCHA_SECRET_KEY) {
        console.error('❌ FATAL: RECAPTCHA_SECRET_KEY is not set in environment variables.');
        return res.status(500).json({ success: false, message: 'Server configuration error.' });
    }

    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`;

    try {
      const recaptchaRes = await fetch(verifyUrl, { method: 'POST' });
      const recaptchaData = await recaptchaRes.json();

      if (!recaptchaData.success) {
        console.log('❌ reCAPTCHA verification failed:', recaptchaData['error-codes']);
        return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed. Please try again.' });
      }
      console.log('✅ reCAPTCHA verified successfully.');
    } catch (error) {
      console.log('❌ reCAPTCHA server error:', error);
      return res.status(500).json({ success: false, message: 'Could not verify reCAPTCHA.' });
    }
  } else {
    // This is for the "resend" button, which is okay.
    console.log('⚠️ No reCAPTCHA token provided, assuming resend.');
  }

  // 3. Check for email
  if (!email) {
    console.log('❌ No email provided');
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  // 4. Generate OTP and save to in-memory store
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = {
      otp: otp,
      timestamp: Date.now() // Add timestamp for expiration
  }; 
  console.log('🔑 Generated OTP for', email, ':', otp);

  // 5. Send the email
  let mailOptions;
  try {
    mailOptions = {
      from: GMAIL_USER,
      to: email,
      subject: 'Your Campus Login OTP Code',
      text: generateOTPEmailText(otp),
      html: generateOTPEmailHTML(otp, email)
    };
  } catch (error) {
    console.error('⚠️ Template generation error:', error);
    mailOptions = {
      from: GMAIL_USER,
      to: email,
      subject: 'Your Campus Login OTP Code',
      text: `Your OTP code is ${otp}`
    };
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('❌ Email send error:', error);
      return res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
    console.log('✅ OTP sent successfully:', info.response);
    res.json({ success: true, message: 'OTP sent' });
  });
});


// --- ⭐️ UPDATED /verify-otp ROUTE (using otpStore with expiration) ---
app.post('/verify-otp', (req, res) => {
  console.log('🔍 Received OTP verification request for:', req.body.email);
  
  const { email, otp } = req.body;
  if (!email || !otp) {
    console.log('❌ Missing email or OTP');
    return res.status(400).json({ success: false, message: 'Email and OTP required' });
  }

  const storedData = otpStore[email];
  
  if (!storedData) {
    console.log('❌ No OTP found for:', email);
    return res.status(400).json({ success: false, message: "Invalid OTP or session expired" });
  }

  console.log('🔑 Verifying OTP:', otp, 'against stored:', storedData.otp);
  
  // Check for expiration (5 minutes = 300000 ms)
  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() - storedData.timestamp > fiveMinutes) {
      console.log('❌ Expired OTP for:', email);
      delete otpStore[email]; // Clean up expired OTP
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
  }
  
  // Check if OTP matches
  if (storedData.otp === otp) {
    console.log('✅ OTP verified successfully for:', email);
    delete otpStore[email]; // OTP used, remove from store
    return res.json({ success: true, message: "OTP verified!" });
  } else {
    console.log('❌ Invalid OTP for:', email);
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }
});


// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});


