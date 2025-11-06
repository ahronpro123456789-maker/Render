const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js'); // Make sure to npm install @supabase/supabase-js
const { generateOTPEmailHTML, generateOTPEmailText } = require('./emailTemplates');
const app = express();

// --- CONFIGURATION ---
// Use the port Render provides, or 3000 for local testing
const PORT = process.env.PORT || 3000;

// Load sensitive data from Environment Variables
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN; // Your live frontend URL

// Check if all required environment variables are set
if (!GMAIL_USER || !GMAIL_PASS || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !CORS_ORIGIN) {
  console.error('❌ FATAL ERROR: Missing one or more environment variables.');
  // In a real app, you might stop the server: process.exit(1);
}

// --- Supabase Setup ---
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- CORS Setup ---
// Only allow requests from your live frontend
const corsOptions = {
  origin: CORS_ORIGIN
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER, // Use variable
    pass: GMAIL_PASS  // Use variable
  }
});

// (Your /send-otp and /verify-otp routes from my previous message go here)
// ... Make sure you are using the Supabase version of these routes ...

// --- Send OTP to email (using Supabase) ---
app.post('/send-otp', async (req, res) => {
  console.log('📧 Received OTP request for:', req.body.email);
  const { email } = req.body;
  if (!email) {
    console.log('❌ No email provided');
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const { error: dbError } = await supabase
    .from('otp_tokens')
    .upsert({
      email: email,
      otp: otp,
      created_at: new Date()
    });

  if (dbError) {
    console.error('❌ Supabase error:', dbError.message);
    return res.status(500).json({ success: false, message: 'Failed to save OTP' });
  }

  console.log('🔑 Generated and saved OTP for', email, ':', otp);

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

// --- Verify OTP (using Supabase) ---
app.post('/verify-otp', async (req, res) => {
  console.log('🔍 Received OTP verification request for:', req.body.email);
  const { email, otp } = req.body;
  if (!email || !otp) {
    console.log('❌ Missing email or OTP');
    return res.status(400).json({ success: false, message: 'Email and OTP required' });
  }

  const { data, error } = await supabase
    .from('otp_tokens')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
    console.log('❌ OTP not found or DB error for:', email);
    return res.status(400).json({ success: false, message: "Invalid OTP or session expired" });
  }

  console.log('🔑 Verifying OTP:', otp, 'against stored:', data.otp);

  if (data.otp !== otp) {
    console.log('❌ Invalid OTP for:', email);
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  const otpTimestamp = new Date(data.created_at).getTime();
  const now = new Date().getTime();
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes

  if (now - otpTimestamp > fiveMinutes) {
    console.log('❌ Expired OTP for:', email);
    await supabase.from('otp_tokens').delete().eq('email', email);
    return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
  }

  // Success! Delete the used OTP
  await supabase.from('otp_tokens').delete().eq('email', email);
  
  console.log('✅ OTP verified successfully for:', email);
  return res.json({ success: true, message: "OTP verified!" });
});


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
