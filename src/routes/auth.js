const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const pool = new Pool();

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = '15m';
const APP_URL = process.env.APP_URL || 'https://yourapp.com';

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
router.get('/me', async (req, res) => {
  // Get JWT from Authorization header
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (!userRes.rows.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user: userRes.rows[0] });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});


// Google SMTP config from .env
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_PASS
//   }
// });
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});
/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstname
 *               - lastname
 *             properties:
 *               email:
 *                 type: string
 *                 example: 'user@example.com'
 *               firstname:
 *                 type: string
 *                 example: 'Sai'
 *               lastname:
 *                 type: string
 *                 example: 'Kumar'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *       400:
 *         description: Invalid input or user exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */

// POST /auth/signup
router.post('/signup', async (req, res) => {
  const { email, firstname, lastname } = req.body;
  if (!email || !firstname || !lastname) {
    return res.status(400).json({ success: false, error: 'Email, firstname, and lastname required' });
  }
  const name = `${firstname} ${lastname}`;
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }
    const result = await pool.query(
      'INSERT INTO users (email, name, is_verified) VALUES ($1, $2, $3) RETURNING *',
      [email, name, false]
    );
    // Generate OTP for signup
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
    await pool.query(
      'INSERT INTO otp_verifications (user_id, otp, expires_at) VALUES ($1, $2, $3)',
      [result.rows[0].id, otp, expiresAt]
    );
    await transporter.sendMail({
      from: `"ThinkCyber Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Verify Your ThinkCyber Account - OTP Inside",
      html: `
  <div style="font-family: Arial, sans-serif; background-color:#f9fafb; padding:20px;">
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:8px; padding:30px; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      <h2 style="color:#1a73e8; text-align:center;">Welcome to ThinkCyber 👋</h2>
      <p style="font-size:16px; color:#333;">Hi <b>${firstname}</b>,</p>
      <p style="font-size:15px; color:#444; line-height:1.6;">
        Thank you for signing up with <b>ThinkCyber</b>.  
        To complete your signup, please verify your email address using the OTP below:
      </p>
      
      <div style="text-align:center; margin:30px 0;">
        <span style="display:inline-block; background:#1a73e8; color:#ffffff; font-size:24px; font-weight:bold; padding:12px 24px; border-radius:6px; letter-spacing:3px;">
          ${otp}
        </span>
      </div>
      
      <p style="font-size:14px; color:#666;">
        ⚠️ This OTP is valid for <b>10 minutes</b>.  
        If you didn’t request this, please ignore this email.
      </p>
      
      <hr style="margin:30px 0; border:none; border-top:1px solid #eee;">
      <p style="font-size:12px; color:#999; text-align:center;">
        ThinkCyber © ${new Date().getFullYear()}<br>
        Secure • Smart • Future-Ready
      </p>
    </div>
  </div>
  `
    });

    res.status(201).json({ success: true, user: result.rows[0], message: 'Signup successful, OTP sent to email.' });
  } catch (err) {
    console.error('Signup DB error:', err); // This will print the real error to your server logs
    res.status(500).json({ success: false, error: 'DB error' });
  }
});
/**
 * @swagger
 * /api/auth/verify-signup-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify signup OTP and activate user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: 'user@example.com'
 *               otp:
 *                 type: string
 *                 example: '123456'
 *     responses:
 *       200:
 *         description: User verified and activated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                 sessionToken:
 *                   type: string
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */

// POST /auth/verify-signup-otp
router.post('/verify-signup-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email and OTP required' });
  }
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!userRes.rows.length) {
      return res.status(400).json({ success: false, error: 'User not found' });
    }
    const userId = userRes.rows[0].id;
    const otpRes = await pool.query(
      'SELECT * FROM otp_verifications WHERE user_id = $1 AND otp = $2 ORDER BY created_at DESC LIMIT 1',
      [userId, otp]
    );
    if (!otpRes.rows.length || new Date() > new Date(otpRes.rows[0].expires_at)) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }
    // Mark user as verified
    await pool.query('UPDATE users SET is_verified = true WHERE id = $1', [userId]);
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    // Issue session JWT
    // Delete OTP after use
    await pool.query('DELETE FROM otp_verifications WHERE id = $1', [otpRes.rows[0].id]);
    const sessionToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' }); 
    res.json({ success: true, user, sessionToken });
  } catch (err) {
    res.status(500).json({ success: false, error: 'DB error' });
  }
});
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out user and remove FCM token
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fcmToken:
 *                 type: string
 *                 description: FCM token to remove for this device
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

// POST /auth/logout
router.post('/logout', async (req, res) => {
  const { fcmToken } = req.body;
  
  // Remove FCM token if provided (for push notifications)
  if (fcmToken) {
    try {
      await pool.query('DELETE FROM user_fcm_tokens WHERE fcm_token = $1', [fcmToken]);
    } catch (fcmErr) {
      console.error('Error removing FCM token on logout:', fcmErr);
      // Don't fail logout if FCM removal fails
    }
  }
  
  // For JWT, logout is client-side (delete token).
  // For server-side sessions, destroy session here.
  res.json({ success: true, message: 'Logged out. Please delete your token on client.' });
});
// ...existing code...

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Passwordless Magic Link Authentication
 */

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP to user's email for login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: 'user@example.com'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Server or email error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and log in user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: 'user@example.com'
 *               otp:
 *                 type: string
 *                 example: '123456'
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging token for push notifications
 *                 example: 'fMZvQVn5RJa...'
 *               deviceId:
 *                 type: string
 *                 description: Unique device identifier
 *                 example: 'abc123-device-id'
 *               deviceType:
 *                 type: string
 *                 enum: [android, ios, web]
 *                 description: Type of device
 *                 example: 'android'
 *               deviceName:
 *                 type: string
 *                 description: Human-readable device name
 *                 example: 'Samsung Galaxy S21'
 *     responses:
 *       200:
 *         description: User verified and session token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                 sessionToken:
 *                   type: string
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */

// POST /auth/send-otp
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Valid email required' });
  }
  let user;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    console.log(result.rows.length);
    // DEBUG: Inspect result
    if (!result.rows.length) {
      return res.status(400).json({ success: false, error: 'User not found. Please register first.' });
    }
    user = result.rows[0];
    if (!user.is_verified) {
      return res.status(403).json({ success: false, error: 'Please verify your email to login' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: 'DB error' });
  }
  // Generate OTP (6 digits)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Store OTP in otp_verifications table
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
  try {
    await pool.query(
      'INSERT INTO otp_verifications (user_id, otp, expires_at) VALUES ($1, $2, $3)',
      [user.id, otp, expiresAt]
    );
    await transporter.sendMail({
      from: `"ThinkCyber Security" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🔐 Your ThinkCyber Login OTP",
      html: `
  <div style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:20px;">
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background:#0d6efd; padding:20px; text-align:center; color:#ffffff;">
        <h2 style="margin:0; font-size:22px;">ThinkCyber Login Verification</h2>
      </div>
      
      <!-- Body -->
      <div style="padding:30px; color:#333333;">
        <p style="font-size:16px;">Hello,</p>
        <p style="font-size:16px;">
          Use the following One-Time Password (OTP) to complete your login. 
          This code is valid for <b>10 minutes</b>.
        </p>
        
        <div style="text-align:center; margin:30px 0;">
          <div style="display:inline-block; background:#f0f8ff; border:2px dashed #0d6efd; padding:15px 30px; font-size:24px; font-weight:bold; letter-spacing:4px; color:#0d6efd; border-radius:6px;">
            ${otp}
          </div>
        </div>
        
        <p style="font-size:14px; color:#555;">
          If you didn’t request this, please ignore this email or contact support immediately.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background:#f9f9f9; padding:15px; text-align:center; font-size:12px; color:#999;">
        © ${new Date().getFullYear()} ThinkCyber Security. All rights reserved.
      </div>
      
    </div>
  </div>
  `
    });

    res.status(200).json({ success: true, message: 'OTP sent' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Email send failed' });
  }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, otp, fcmToken, deviceId, deviceType, deviceName } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email and OTP required' });
  }
  // Find OTP for user in DB
  let user;
  try {
    // Only allow login for registered and verified users
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!userRes.rows.length) {
      return res.status(400).json({ success: false, error: 'User not found. Please register first.' });
    }
    user = userRes.rows[0];
    if (!user.is_verified) {
      return res.status(403).json({ success: false, error: 'User not verified. Please complete registration and verification.' });
    }
    const otpRes = await pool.query(
      'SELECT * FROM otp_verifications WHERE user_id = $1 AND otp = $2 ORDER BY created_at DESC LIMIT 1',
      [user.id, otp]
    );
    if (!otpRes.rows.length || new Date() > new Date(otpRes.rows[0].expires_at)) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }


    // Issue session JWT (longer expiry)
    const sessionToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    // Delete OTP after use
    await pool.query('DELETE FROM otp_verifications WHERE id = $1', [otpRes.rows[0].id]);

    // Register FCM token if provided (for push notifications)
    if (fcmToken) {
      try {
        await pool.query(
          `INSERT INTO user_fcm_tokens (user_id, fcm_token, device_id, device_type, device_name, is_active, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, fcm_token)
           DO UPDATE SET 
             device_id = EXCLUDED.device_id,
             device_type = EXCLUDED.device_type,
             device_name = EXCLUDED.device_name,
             is_active = true,
             updated_at = CURRENT_TIMESTAMP`,
          [user.id, fcmToken, deviceId || null, deviceType || null, deviceName || null]
        );
      } catch (fcmErr) {
        console.error('Error registering FCM token on login:', fcmErr);
        // Don't fail login if FCM registration fails
      }
    }
      
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: true, // use only over HTTPS
      sameSite: 'Strict', // or 'Lax'
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.json({ success: true, user, sessionToken }); // Do NOT send sessionToken in JSON

  } catch (err) {
    res.status(500).json({ success: false, error: 'DB error' });
  }
});
/**
 * @swagger
 * /api/auth/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Verify magic link token and log in
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: JWT token from magic link
 *     responses:
 *       200:
 *         description: User verified and session token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                 sessionToken:
 *                   type: string
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */



/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP to user's email for login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: 'user@example.com'
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid email or user not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       403:
 *         description: User not verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Server or email error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */

// POST /auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Valid email required' });
  }
  let user;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) {
      return res.status(400).json({ success: false, error: 'User not found. Please register first.' });
    }
    user = result.rows[0];
  } catch (err) {
    return res.status(500).json({ success: false, error: 'DB error' });
  }
  // Generate OTP (6 digits)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Store OTP in otp_verifications table
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
  try {
    await pool.query(
      'INSERT INTO otp_verifications (user_id, otp, expires_at) VALUES ($1, $2, $3)',
      [user.id, otp, expiresAt]
    );
    
    // Try to send email, but don't fail if email service is down
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Your ThinkCyber Login OTP',
        html: `<p>Your OTP is: <b>${otp}</b><br>This code is valid for 10 minutes.</p>`
      });
      res.status(200).json({ success: true, message: 'OTP resent successfully', otp: process.env.NODE_ENV === 'development' ? otp : undefined });
    } catch (emailErr) {
      console.error('Resend OTP email error:', emailErr);
      // Still return success since OTP was stored, but indicate email failed
      res.status(200).json({ 
        success: true, 
        message: 'OTP generated but email failed to send. Please check console for OTP.',
        emailFailed: true,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined // Only show OTP in development
      });
    }
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate OTP' });
  }
});

module.exports = router;

// DEBUG: Inspect users table
router.get('/debug/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users LIMIT 5');
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
