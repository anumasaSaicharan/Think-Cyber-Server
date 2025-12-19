/**
 * Category Controller with Plan Type Support
 * Example implementation using planTypeValidation functions
 */

const db = require('../config/db');
const { 
  validateCategoryPricing,
  validatePurchaseRequest,
  calculatePrice,
  getTopicsToUnlock,
  validateTopicAccess
} = require('../utils/planTypeValidation');

/**
 * Create or Update Category with Plan Type
 * POST /api/categories
 * PUT /api/categories/:id
 */
exports.createOrUpdateCategory = async (req, res) => {
  try {
    const { name, description, status, subscription_plan_id, plan_type, bundle_price } = req.body;
    const categoryId = req.params.id; // undefined for create, set for update

    // Validate basic fields
    if (!name || !description || !status || !subscription_plan_id || !plan_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, status, subscription_plan_id, plan_type'
      });
    }

    // Validate pricing based on plan type
    const pricingValidation = validateCategoryPricing(
      { bundle_price },
      plan_type
    );

    if (!pricingValidation.valid) {
      return res.status(400).json({
        success: false,
        error: pricingValidation.error
      });
    }

    if (categoryId) {
      // Update
      await db.query(
        `UPDATE category 
         SET name = $1, description = $2, status = $3, 
             subscription_plan_id = $4, plan_type = $5, bundle_price = $6,
             updated_at = NOW()
         WHERE id = $7`,
        [name, description, status, subscription_plan_id, plan_type, bundle_price, categoryId]
      );
    } else {
      // Create
      await db.query(
        `INSERT INTO category (name, description, status, subscription_plan_id, plan_type, bundle_price, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [name, description, status, subscription_plan_id, plan_type, bundle_price]
      );
    }

    res.json({
      success: true,
      message: categoryId ? 'Category updated' : 'Category created'
    });
  } catch (error) {
    console.error('Error in createOrUpdateCategory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create Purchase - Handles all 4 plan types
 * POST /api/purchases/create
 */
exports.createPurchase = async (req, res) => {
  try {
    const { userId, categoryId, purchaseType, selectedTopicIds, amount } = req.body;

    if (!userId || !categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId or categoryId'
      });
    }

    // Get category info
    const categoryResult = await db.query(
      'SELECT plan_type, bundle_price FROM category WHERE id = $1',
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const { plan_type: planType, bundle_price: bundlePrice } = categoryResult.rows[0];

    // Validate purchase request
    const purchaseValidation = validatePurchaseRequest({
      planType,
      purchaseType,
      categoryId,
      topicIds: selectedTopicIds,
      userId
    });

    if (!purchaseValidation.valid) {
      return res.status(400).json({
        success: false,
        error: purchaseValidation.error
      });
    }

    // Get topics to unlock
    const topicsToUnlockResult = await db.query(
      'SELECT id FROM topics WHERE category_id = $1',
      [categoryId]
    );

    const allCategoryTopicIds = topicsToUnlockResult.rows.map(t => t.id);
    const topicsToUnlock = getTopicsToUnlock({
      planType,
      purchaseType,
      categoryTopicIds: allCategoryTopicIds,
      selectedTopicIds
    });

    // Create transaction ID
    const transactionId = `TXN_${Date.now()}_${userId}`;

    // Grant access to topics
    for (const topicId of topicsToUnlock) {
      await db.query(
        `INSERT INTO topic_enrollments (user_id, topic_id, payment_status, amount_paid, transaction_id, purchase_type, enrolled_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (user_id, topic_id) DO UPDATE SET
           payment_status = EXCLUDED.payment_status,
           purchase_type = EXCLUDED.purchase_type,
           transaction_id = COALESCE(EXCLUDED.transaction_id, topic_enrollments.transaction_id)`,
        [
          userId,
          topicId,
          planType === 'FREE' ? 'free' : 'paid',
          planType === 'FREE' ? 0 : amount / topicsToUnlock.length,
          transactionId,
          purchaseType
        ]
      );
    }

    res.json({
      success: true,
      data: {
        message: `Access granted to ${topicsToUnlock.length} topics`,
        plan_type: planType,
        purchase_type: purchaseType,
        topics_unlocked: topicsToUnlock.length,
        transaction_id: transactionId
      }
    });
  } catch (error) {
    console.error('Error in createPurchase:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Calculate Purchase Price - With plan type aware calculations
 * POST /api/purchases/calculate
 */
exports.calculatePrice = async (req, res) => {
  try {
    const { categoryId, selectedTopicIds } = req.body;

    // Get category info
    const categoryResult = await db.query(
      'SELECT plan_type, bundle_price FROM category WHERE id = $1',
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const { plan_type: planType, bundle_price: bundlePrice } = categoryResult.rows[0];

    // Get topic prices if needed
    let topicPrices = {};
    if (planType === 'INDIVIDUAL' || planType === 'FLEXIBLE') {
      const topicsResult = await db.query(
        'SELECT id, price FROM topics WHERE category_id = $1',
        [categoryId]
      );
      topicsResult.rows.forEach(t => {
        topicPrices[t.id] = t.price || 0;
      });
    }

    // Calculate price using helper
    const priceCalculation = calculatePrice({
      planType,
      bundlePrice,
      topicPrices,
      selectedTopicIds
    });

    res.json({
      success: true,
      data: priceCalculation
    });
  } catch (error) {
    console.error('Error in calculatePrice:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Check Topic Access - Enforces plan type rules
 * GET /api/topics/:topicId/access
 */
exports.checkTopicAccess = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user?.id; // From auth middleware

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Get topic info
    const topicResult = await db.query(
      `SELECT t.id, t.is_free, t.category_id, c.plan_type
       FROM topics t
       JOIN category c ON t.category_id = c.id
       WHERE t.id = $1`,
      [topicId]
    );

    if (topicResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    const { is_free: isFree, plan_type: planType } = topicResult.rows[0];

    // Get enrollment info
    const enrollmentResult = await db.query(
      `SELECT id, payment_status FROM topic_enrollments 
       WHERE topic_id = $1 AND user_id = $2`,
      [topicId, userId]
    );

    const enrollment = enrollmentResult.rows[0];

    // Validate access using helper
    const accessValidation = validateTopicAccess({
      planType,
      userId,
      topicId,
      hasFreeTopic: isFree,
      topicEnrollment: enrollment
    });

    res.json({
      success: true,
      hasAccess: accessValidation.hasAccess,
      reason: accessValidation.reason,
      message: accessValidation.hasAccess ? '✅ Access granted' : '🔒 Access denied'
    });
  } catch (error) {
    console.error('Error in checkTopicAccess:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Category with Full Details (for frontend)
 * GET /api/categories/:id/details
 */
exports.getCategoryDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
        c.id, c.name, c.description, c.status, c.plan_type, c.bundle_price,
        sp.name as plan_name,
        json_agg(json_build_object(
          'id', t.id,
          'title', t.title,
          'description', t.description,
          'price', t.price,
          'is_free', t.is_free
        )) as topics
       FROM category c
       LEFT JOIN subscription_plans sp ON c.subscription_plan_id = sp.id
       LEFT JOIN topics t ON t.category_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, c.name, c.description, c.status, c.plan_type, c.bundle_price, sp.name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error in getCategoryDetails:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get User Purchases by Category and Plan Type
 * GET /api/users/:userId/purchases
 */
exports.getUserPurchases = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT 
        c.id as category_id,
        c.name as category_name,
        c.plan_type,
        COUNT(te.id) as topics_purchased,
        SUM(te.amount_paid) as total_spent,
        MAX(te.enrolled_at) as latest_purchase,
        json_agg(json_build_object(
          'topic_id', te.topic_id,
          'purchase_type', te.purchase_type,
          'amount_paid', te.amount_paid
        )) as purchases
       FROM topic_enrollments te
       JOIN topics t ON te.topic_id = t.id
       JOIN category c ON t.category_id = c.id
       WHERE te.user_id = $1 AND te.payment_status IN ('free', 'paid')
       GROUP BY c.id, c.name, c.plan_type
       ORDER BY te.enrolled_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error in getUserPurchases:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
