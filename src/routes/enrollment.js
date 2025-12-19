
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
      const paymentStatus = result.rows[0].payment_status;
      // Only consider the user enrolled if payment is completed
      const isEnrolled = paymentStatus === 'completed';
      res.json({ enrolled: isEnrolled, payment_status: paymentStatus });
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
  const { userId, topicId, categoryId, amount, email, currency, isBundle } = req.body;
  console.log("Create order request received:", req.body);
  
  try {
    let title, price;

    // Handle bundle purchase
    if (isBundle && categoryId) {
      const category = await pool.query('SELECT id, name, bundle_price FROM category WHERE id = $1', [categoryId]);
      if (!category.rows.length) return res.status(404).json({ error: 'Category not found' });
      
      title = `${category.rows[0].name} - Bundle`;
      price = category.rows[0].bundle_price || amount;

      // Check if already purchased
      const existing = await pool.query(
        'SELECT * FROM user_category_bundles WHERE user_id = $1 AND category_id = $2 AND payment_status = $3',
        [userId, categoryId, 'completed']
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'You have already purchased this bundle' });
      }
    } else if (topicId) {
      // Handle individual topic purchase
      const topic = await pool.query('SELECT id, title, price FROM topics WHERE id = $1', [topicId]);
      if (!topic.rows.length) return res.status(404).json({ error: 'Topic not found' });
      
      title = topic.rows[0].title;
      price = topic.rows[0].price;

      // If free course, enroll directly
      if (price === 0 || price === null) {
        await pool.query(
          'INSERT INTO user_topics (user_id, topic_id, payment_status) VALUES ($1, $2, $3) ON CONFLICT (user_id, topic_id) DO UPDATE SET payment_status = $3',
          [userId, topicId, 'completed']
        );
        return res.json({ success: true, message: 'Successfully enrolled in the free course' });
      }
    } else {
      return res.status(400).json({ error: 'Either topicId or categoryId with isBundle must be provided' });
    }

    // Convert price to smallest currency unit (paise for INR, cents for USD)
    const razorpayAmount = Math.round(Number(price) * 100);

    // Create Razorpay order
    const options = {
      amount: razorpayAmount,
      currency: currency || 'INR',
      receipt: isBundle 
        ? `bundle_${categoryId}_${userId}_${Date.now()}`
        : `receipt_${topicId}_${userId}_${Date.now()}`,
      notes: {
        userId: String(userId),
        email: email,
        itemName: title,
        ...(isBundle ? { categoryId: String(categoryId), isBundle: 'true' } : { topicId: String(topicId) })
      }
    };

    const order = await razorpay.orders.create(options);

    // Create pending record
    if (isBundle) {
      await pool.query(
        'INSERT INTO user_category_bundles (user_id, category_id, payment_status, order_id) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, category_id) DO UPDATE SET payment_status = $3, order_id = $4',
        [userId, categoryId, 'pending', order.id]
      );
    } else {
      await pool.query(
        'INSERT INTO user_topics (user_id, topic_id, payment_status) VALUES ($1, $2, $3) ON CONFLICT (user_id, topic_id) DO UPDATE SET payment_status = $3',
        [userId, topicId, 'pending']
      );
    }

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
 * /enrollments/verify-bundle-payment:
 *   post:
 *     summary: Verify Razorpay payment for category bundle and enroll in all topics
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
 *               categoryId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Bundle payment verified and all topics enrolled
 */
router.post('/verify-bundle-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, categoryId } = req.body;
  
  try {
    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Fetch category to get plan_type (determines future_topics_included)
      const categoryResult = await pool.query(
        'SELECT plan_type FROM category WHERE id = $1',
        [categoryId]
      );
      
      if (!categoryResult.rows.length) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      
      const planType = categoryResult.rows[0].plan_type;
      
      // Determine future_topics_included based on plan type
      // BUNDLE plans: future_topics_included = true (get all new topics automatically)
      // FLEXIBLE plans: future_topics_included = false (only get topics at time of purchase)
      // INDIVIDUAL plans: future_topics_included = false (only get purchased topics)
      const futureTopicsIncluded = planType === 'BUNDLE' ? true : false;
      console.log(`🎁 Bundle purchase - Plan type: ${planType}, future_topics_included set to: ${futureTopicsIncluded}`);
      
      // Update bundle purchase to completed with future_topics_included flag
      await pool.query(
        'UPDATE user_category_bundles SET payment_status = $1, payment_id = $2, future_topics_included = $3, enrolled_at = NOW(), updated_at = NOW() WHERE user_id = $4 AND category_id = $5',
        ['completed', razorpay_payment_id, futureTopicsIncluded, userId, categoryId]
      );

      // Get all topics in this category (at time of purchase)
      const topicsResult = await pool.query(
        'SELECT id FROM topics WHERE category_id = $1 ORDER BY created_at ASC',
        [categoryId]
      );

      // Enroll user in all current topics of this category
      // Future topics will be checked based on futureTopicsIncluded flag and enrolled_at timestamp
      for (const topic of topicsResult.rows) {
        await pool.query(
          'INSERT INTO user_topics (user_id, topic_id, payment_status) VALUES ($1, $2, $3) ON CONFLICT (user_id, topic_id) DO UPDATE SET payment_status = $3',
          [userId, topic.id, 'completed']
        );
      }

      res.json({ 
        success: true, 
        message: 'Bundle payment verified and enrollment completed',
        enrolledTopics: topicsResult.rows.length,
        futureTopicsIncluded: futureTopicsIncluded
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (err) {
    console.error('Error verifying bundle payment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /enrollments/check-bundle/{user_id}/{category_id}:
 *   get:
 *     summary: Check if a user has purchased a bundle
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the user
 *       - in: path
 *         name: category_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the category
 *     responses:
 *       200:
 *         description: Bundle enrollment status
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
router.get('/check-bundle/:user_id/:category_id', async (req, res) => {
  const { user_id, category_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT payment_status FROM user_category_bundles WHERE user_id = $1 AND category_id = $2',
      [user_id, category_id]
    );
    if (result.rows.length > 0) {
      const paymentStatus = result.rows[0].payment_status;
      // Only consider the user enrolled if payment is completed
      const isEnrolled = paymentStatus === 'completed';
      res.json({ enrolled: isEnrolled, payment_status: paymentStatus });
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

    console.log(`Topic ${topicId} price:`, price);

    // If free course, enroll directly (treat null, 0, or prices < 1 as free)
    const numericPrice = Number(price) || 0;
    if (numericPrice < 1) {
      console.log(`Enrolling user ${userId} in free topic ${topicId}`);
      await pool.query(
        'INSERT INTO user_topics (user_id, topic_id, payment_status) VALUES ($1, $2, $3) ON CONFLICT (user_id, topic_id) DO UPDATE SET payment_status = $3',
        [userId, topicId, 'completed']
      );
      return res.json({ success: true, message: 'Successfully enrolled in the free course' });
    }

    // For paid courses, create Razorpay order
    const amount = Math.round(numericPrice * 100);

    console.log(`Creating Razorpay order for topic ${topicId}, amount: ${amount} paise`);

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

/**
 * @swagger
 * /enrollments/user-topic-access/{user_id}/{topic_id}:
 *   get:
 *     summary: Check if user has access to a topic considering plan type and future topics
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: integer
 *         required: true
 *       - in: path
 *         name: topic_id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Topic access status
 */
router.get('/user-topic-access/:user_id/:topic_id', async (req, res) => {
  const { user_id, topic_id } = req.params;
  try {
    // Check direct enrollment (individual purchase)
    const directEnrollment = await pool.query(
      'SELECT payment_status FROM user_topics WHERE user_id = $1 AND topic_id = $2',
      [user_id, topic_id]
    );

    if (directEnrollment.rows.length > 0) {
      const status = directEnrollment.rows[0].payment_status;
      return res.json({ 
        hasAccess: status === 'completed', 
        accessType: 'individual',
        enrollmentStatus: status
      });
    }

    // Check bundle enrollment considering future topics
    const topic = await pool.query(
      'SELECT category_id, created_at FROM topics WHERE id = $1',
      [topic_id]
    );

    if (topic.rows.length === 0) {
      return res.json({ hasAccess: false, accessType: 'none' });
    }

    const { category_id, created_at: topicCreatedAt } = topic.rows[0];
    
    const bundleEnrollment = await pool.query(
      `SELECT payment_status, enrolled_at, future_topics_included 
       FROM user_category_bundles 
       WHERE user_id = $1 AND category_id = $2 AND payment_status = 'completed'`,
      [user_id, category_id]
    );

    if (bundleEnrollment.rows.length === 0) {
      return res.json({ hasAccess: false, accessType: 'none' });
    }

    const { enrolled_at: bundleEnrolledAt, future_topics_included: futureIncluded } = bundleEnrollment.rows[0];

    // User has bundle access to current topics (enrolled at purchase time)
    let hasAccess = new Date(topicCreatedAt) <= new Date(bundleEnrolledAt);

    // Check if future topics are included in the bundle
    if (!hasAccess && futureIncluded) {
      hasAccess = true; // Future topics are included in this bundle
    }

    res.json({ 
      hasAccess, 
      accessType: 'bundle',
      enrollmentStatus: 'completed',
      futureTopicsIncluded: futureIncluded,
      topicCreatedAt: topicCreatedAt?.toISOString(),
      bundleEnrolledAt: bundleEnrolledAt?.toISOString()
    });
  } catch (err) {
    console.error('Error checking topic access:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /enrollments/category-topics-access/{user_id}/{category_id}:
 *   get:
 *     summary: Get all topics user has access to in a category
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: integer
 *         required: true
 *       - in: path
 *         name: category_id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: List of accessible topic IDs
 */
router.get('/category-topics-access/:user_id/:category_id', async (req, res) => {
  const { user_id, category_id } = req.params;
  console.log('📋 GET /category-topics-access - user:', user_id, 'category:', category_id);
  
  try {
    const accessibleTopicIds = new Set();

    // 1. Get bundle enrollment info and add all accessible topics from bundle
    const bundleEnrollment = await pool.query(
      `SELECT payment_status, enrolled_at, future_topics_included 
       FROM user_category_bundles 
       WHERE user_id = $1 AND category_id = $2 AND payment_status = 'completed'`,
      [user_id, category_id]
    );

    console.log('🔍 Bundle enrollment found:', bundleEnrollment.rows.length > 0);
    
    if (bundleEnrollment.rows.length > 0) {
      const { enrolled_at: bundleEnrolledAt, future_topics_included: futureIncluded } = bundleEnrollment.rows[0];
      console.log('📅 Enrolled at:', bundleEnrolledAt, 'Future topics included:', futureIncluded);

      // Get all topics in category
      const topics = await pool.query(
        'SELECT id, created_at FROM topics WHERE category_id = $1',
        [category_id]
      );

      console.log('📚 Total topics in category:', topics.rows.length);

      // Add bundle accessible topics
      topics.rows.forEach(topic => {
        const topicCreatedDate = new Date(topic.created_at);
        const enrolledDate = new Date(bundleEnrolledAt);
        
        // Topics created before or at enrollment time
        if (topicCreatedDate <= enrolledDate) {
          accessibleTopicIds.add(topic.id);
          console.log('✅ Topic', topic.id, 'accessible (created before enrollment)');
        }
        // Future topics if included in bundle
        else if (futureIncluded) {
          accessibleTopicIds.add(topic.id);
          console.log('🆕 Topic', topic.id, 'accessible (future topic included)');
        } else {
          console.log('❌ Topic', topic.id, 'NOT accessible (created after enrollment, no future access)');
        }
      });
    }

    // 2. Also add directly enrolled topics for this category
    const directEnrollments = await pool.query(
      `SELECT DISTINCT ut.topic_id 
       FROM user_topics ut
       JOIN topics t ON ut.topic_id = t.id
       WHERE ut.user_id = $1 AND t.category_id = $2 AND ut.payment_status = 'completed'`,
      [user_id, category_id]
    );

    console.log('🎓 Direct enrollments found:', directEnrollments.rows.length);
    
    directEnrollments.rows.forEach(row => {
      accessibleTopicIds.add(row.topic_id);
      console.log('➕ Adding directly enrolled topic:', row.topic_id);
    });

    console.log('✨ Final accessible topics:', Array.from(accessibleTopicIds));
    
    res.json({ 
      accessibleTopics: Array.from(accessibleTopicIds),
      futureTopicsIncluded: bundleEnrollment.rows[0]?.future_topics_included || false,
      bundleEnrolledAt: bundleEnrollment.rows[0]?.enrolled_at?.toISOString() || null,
      totalAccessibleCount: accessibleTopicIds.size
    });
  } catch (err) {
    console.error('Error getting category topics access:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /enrollments/user-bundles/{user_id}:
 *   get:
 *     summary: Get all bundle enrollments for a user
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
 *         description: List of bundle enrollments
 */
router.get('/user-bundles/:user_id', async (req, res) => {
  const { user_id } = req.params;
  console.log('📦 Fetching bundles for user:', user_id);
  
  try {
    // Get all completed bundle enrollments for the user with category details
    const bundles = await pool.query(
      `SELECT 
        ucb.id,
        ucb.user_id,
        ucb.category_id,
        ucb.payment_status,
        ucb.enrolled_at,
        ucb.future_topics_included,
        COALESCE(COUNT(DISTINCT t.id), 0) as accessible_topics_count,
        c.name as category_name,
        c.bundle_price,
        c.plan_type,
        c.description
      FROM user_category_bundles ucb
      LEFT JOIN topics t ON t.category_id = ucb.category_id
      LEFT JOIN category c ON c.id = ucb.category_id
      WHERE ucb.user_id = $1 AND ucb.payment_status = 'completed'
      GROUP BY ucb.id, ucb.user_id, ucb.category_id, ucb.payment_status, ucb.enrolled_at, ucb.future_topics_included, c.id, c.name, c.bundle_price, c.plan_type, c.description
      ORDER BY ucb.enrolled_at DESC`,
      [user_id]
    );

    console.log('✅ Found', bundles.rows.length, 'bundle enrollments');
    bundles.rows.forEach(row => {
      console.log(`   Category ${row.category_id} (${row.category_name}): ${row.accessible_topics_count} topics`);
    });

    res.json({
      success: true,
      bundles: bundles.rows
    });
  } catch (err) {
    console.error('Error fetching user bundles:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

module.exports = router;
