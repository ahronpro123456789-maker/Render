const express = require('express');
const cors = require('cors');
const { Resend } = require('resend'); // ⭐️ Import Resend
const fetch = require('node-fetch');

const app = express();

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY; // ⭐️ Get Resend key

// --- CORS Setup ---
const corsOptions = {
  origin: CORS_ORIGIN
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Resend Setup ---
const resend = new Resend(RESEND_API_KEY);

// In-memory OTP store
const otpStore = {}; 

// --- /send-otp ROUTE (with reCAPTCHA and Resend) ---
app.post('/send-otp', async (req, res) => {
  console.log('📧 Received OTP request for:', req.body.email);

  // 1. Get email and reCAPTCHA token
  const { email, recaptchaToken } = req.body;

  // 2. Verify the reCAPTCHA token (if provided)
  if (recaptchaToken) {
    console.log('🔍 Verifying reCAPTCHA token...');
    
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
      timestamp: Date.now()
  }; 
  console.log('🔑 Generated OTP for', email, ':', otp);

  // 5. Send the email using Resend
  try {
    const { data, error } = await resend.emails.send({
      // ⭐️ IMPORTANT: Use this "from" address for testing.
      // After you verify your domain, change this to "alerts@your-domain.com"
      from: 'Campus Hub <onboarding@resend.dev>',
      to: [email],
      subject: 'Your Campus Login OTP Code',
      // We embed the HTML directly - no need for emailTemplates.js
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 20px; border-radius: 8px; text-align: center;">
            <h2 style="color: #333;">Your Verification Code</h2>
            <p style="font-size: 16px;">Your 6-digit code is:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 5px; background-color: #eee; padding: 15px; border-radius: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #777; font-size: 14px;">This code will expire in 5 minutes.</p>
          </div>
        </div>
      `
    });

    if (error) {
      // Handle Resend-specific error
      console.error('❌ Email send error:', error);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email.' });
    }

    // Success!
    console.log('✅ OTP sent successfully via Resend:', data.id);
    res.json({ success: true, message: 'OTP sent' });

  } catch (exception) {
    // Handle any other unexpected server error
    console.error('❌ Email send exception:', exception);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
  }
});


// --- /verify-otp ROUTE (No changes needed) ---
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
  
  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() - storedData.timestamp > fiveMinutes) {
      console.log('❌ Expired OTP for:', email);
      delete otpStore[email];
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
  }
  
  if (storedData.otp === otp) {
    console.log('✅ OTP verified successfully for:', email);
    delete otpStore[email];
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
