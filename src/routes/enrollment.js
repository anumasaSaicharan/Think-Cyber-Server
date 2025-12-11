
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool();
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


/**
 * @swagger
 * /enrollments/user/{user_id}:
 *   get:
 *     summary: Get all topics a user is enrolled in
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: List of enrolled topics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   topic_id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   payment_status:
 *                     type: string
 */
router.get('/user/:user_id', async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT ut.*, t.*
      FROM user_topics ut
      JOIN topics t ON ut.topic_id = t.id
      WHERE ut.user_id = $1
    `, [user_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /enrollments/check/{user_id}/{topic_id}:
 *   get:
 *     summary: Check if a user is enrolled in a topic
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the user
 *       - in: path
 *         name: topic_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the topic
 *     responses:
 *       200:
 *         description: Enrollment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enrolled:
 *                   type: boolean
 *                 payment_status:
 *                   type: string
 */
router.get('/check/:user_id/:topic_id', async (req, res) => {
  const { user_id, topic_id } = req.params;
  try {
    const result = await pool.query('SELECT payment_status FROM user_topics WHERE user_id = $1 AND topic_id = $2', [user_id, topic_id]);
    if (result.rows.length > 0) {
      res.json({ enrolled: true, payment_status: result.rows[0].payment_status });
    } else {
      res.json({ enrolled: false, payment_status: null });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/**
 * @swagger
 * /enrollments/create-order:
 *   post:
 *     summary: Create Razorpay order for course enrollment
 *     tags: [Enrollments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *               topicId:
 *                 type: integer
 *               email:
 *                 type: string
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Razorpay order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 currency:
 *                   type: string
 *                 keyId:
 *                   type: string
 */
router.post('/create-order', async (req, res) => {
  const { userId, topicId, email, currency } = req.body;
  console.log("Create order request received:", req.body);
  
  try {
    // Get topic details
    const topic = await pool.query('SELECT id, title, price FROM topics WHERE id = $1', [topicId]);
    if (!topic.rows.length) return res.status(404).json({ error: 'Topic not found' });
    
    const { title, price } = topic.rows[0];

    // If free course, enroll directly
    if (price === 0 || price === null) {
      await pool.query(
        'INSERT INTO user_topics (user_id, topic_id, payment_status) VALUES ($1, $2, $3) ON CONFLICT (user_id, topic_id) DO UPDATE SET payment_status = $3',
        [userId, topicId, 'completed']
      );
      return res.json({ success: true, message: 'Successfully enrolled in the free course' });
    }

    // Convert price to smallest currency unit (paise for INR, cents for USD)
    const amount = Math.round(Number(price) * 100);

    // Create Razorpay order
    const options = {
      amount: amount,
      currency: currency || 'INR',
      receipt: `receipt_${topicId}_${userId}_${Date.now()}`,
      notes: {
        userId: String(userId),
        topicId: String(topicId),
        email: email,
        courseName: title
      }
    };

    const order = await razorpay.orders.create(options);

    // Create pending enrollment record
    await pool.query(
      'INSERT INTO user_topics (user_id, topic_id, payment_status) VALUES ($1, $2, $3) ON CONFLICT (user_id, topic_id) DO UPDATE SET payment_status = $3',
      [userId, topicId, 'pending']
    );

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /enrollments/verify-payment:
 *   post:
 *     summary: Verify Razorpay payment and complete enrollment
 *     tags: [Enrollments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *               userId:
 *                 type: integer
 *               topicId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Payment verified
 */
router.post('/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, topicId } = req.body;
  
  try {
    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Update enrollment to completed
      await pool.query(
        'UPDATE user_topics SET payment_status = $1 WHERE user_id = $2 AND topic_id = $3',
        ['completed', userId, topicId]
      );

      res.json({ success: true, message: 'Payment verified and enrollment completed' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /enrollments/enroll:
 *   post:
 *     summary: Enroll user to topic (for free courses)
 *     tags: [Enrollments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *               topicId:
 *                 type: integer
 *               email:
 *                 type: string
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Enrollment success
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
router.post('/enroll', async (req, res) => {
  const { userId, topicId, email, currency } = req.body;
  console.log("Enroll request received:", req.body);
  try {
    // Get topic details
    const topic = await pool.query('SELECT id, title, price FROM topics WHERE id = $1', [topicId]);
    if (!topic.rows.length) return res.status(404).json({ error: 'Topic not found' });
    const { title, price } = topic.rows[0];

    // If free course, enroll directly
    if (price === 0 || price === null) {
      await pool.query(
        'INSERT INTO user_topics (user_id, topic_id, payment_status) VALUES ($1, $2, $3) ON CONFLICT (user_id, topic_id) DO UPDATE SET payment_status = $3',
        [userId, topicId, 'completed']
      );
      return res.json({ success: true, message: 'Successfully enrolled in the free course' });
    }

    // For paid courses, create Razorpay order
    const amount = Math.round(Number(price) * 100);

    const options = {
      amount: amount,
      currency: currency || 'INR',
      receipt: `receipt_${topicId}_${userId}_${Date.now()}`,
      notes: {
        userId: String(userId),
        topicId: String(topicId),
        email: email,
        courseName: title
      }
    };

    const order = await razorpay.orders.create(options);

    // Create pending enrollment record
    await pool.query(
      'INSERT INTO user_topics (user_id, topic_id, payment_status) VALUES ($1, $2, $3) ON CONFLICT (user_id, topic_id) DO UPDATE SET payment_status = $3',
      [userId, topicId, 'pending']
    );

    res.json({
      success: true,
      requiresPayment: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      message: 'Razorpay order created successfully'
    });
  } catch (err) {
    console.error('Error in enrollment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});




module.exports = router;
