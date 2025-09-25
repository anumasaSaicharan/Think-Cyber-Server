
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Pool } = require('pg');
const pool = new Pool();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
/**
 * @swagger
 * /enrollments/verify-payment:
 *   post:
 *     summary: Verify Stripe payment and update enrollment status
 *     tags: [Enrollments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 topicId:
 *                   type: integer
 *                 error:
 *                   type: string
 */
router.post('/verify-payment', async (req, res) => {
  const { sessionId } = req.body;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') {
      // Update user_topics table to set payment_status = 'completed'
      const userId = session.metadata.user_id;
      const topicId = session.metadata.topic_id;
      await pool.query(
        'UPDATE user_topics SET payment_status = $1 WHERE user_id = $2 AND topic_id = $3',
        ['completed', userId, topicId]
      );
      // Fetch user data
      const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      const user = userRes.rows[0];
      // Generate JWT token
      const sessionToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, user, sessionToken, topicId });
    }
    res.json({ success: false });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
 * /enrollments/enroll:
 *   post:
 *     summary: Enroll user to topic and create Stripe Checkout session
 *     tags: [Enrollments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *               topic_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Stripe Checkout URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 */
router.post('/enroll', async (req, res) => {
  const { userId, topicId,email } = req.body;
  console.log("Enroll request received:", req.body);
  try {
    // Get topic price and name
  const topic = await pool.query('SELECT id, title, price FROM topics WHERE id = $1', [topicId]);
  if (!topic.rows.length) return res.status(404).json({ error: 'Topic not found' });
  const { title, price } = topic.rows[0];

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: title },
          unit_amount: Math.round(Number(price) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
      metadata: { user_id: String(userId), topic_id: String(topicId) },
    });

    // Optionally, create a pending enrollment record here
    await pool.query('INSERT INTO user_topics (user_id, topic_id, payment_status) VALUES ($1, $2, $3) ON CONFLICT (user_id, topic_id) DO NOTHING', [userId, topicId, 'pending']);

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * @swagger
 * /enrollments/webhook:
 *   post:
 *     summary: Stripe webhook to handle payment events
 *     tags: [Enrollments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const user_id = session.metadata.user_id;
    const topic_id = session.metadata.topic_id;
    // Update payment_status to 'paid'
    try {
      await pool.query('UPDATE user_topics SET payment_status = $1 WHERE user_id = $2 AND topic_id = $3', ['paid', user_id, topic_id]);
    } catch (err) {
      return res.status(500).send('Database update failed');
    }
  }
  res.json({ received: true });
});

module.exports = router;
