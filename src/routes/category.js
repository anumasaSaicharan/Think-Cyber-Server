const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories with pagination and sorting
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page (default 10)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, name, description, status, topicsCount, createdAt, updatedAt, priority]
 *         description: Field to sort by (default priority)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (default desc)
 *     responses:
 *       200:
 *         description: List of categories with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *                 pagination:
 *                   type: object
 *   post:
 *     summary: Add a new category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Cybersecurity Fundamentals'
 *               description:
 *                 type: string
 *                 example: 'Basic cybersecurity concepts and principles'
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Draft]
 *                 example: 'Active'
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *                 message:
 *                   type: string
 *
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Advanced Cybersecurity'
 *               description:
 *                 type: string
 *                 example: 'Advanced cybersecurity concepts and practices'
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Draft]
 *                 example: 'Active'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *                 message:
 *                   type: string
 *       404:
 *         description: Category not found
 *   delete:
 *     summary: Delete a category by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
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
 *         description: Cannot delete category with subcategories
 *       404:
 *         description: Category not found
 */

// Sample GET all categories with pagination and sorting
router.get('/categories', async (req, res) => {
  try {
    // Extract query parameters with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'priority';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const offset = (page - 1) * limit;

    // Validate sortBy field to prevent SQL injection
    const allowedSortFields = ['id', 'name', 'description', 'price', 'bundle_price', 'plan_type', 'status', 'topicsCount', 'topics_count', 'createdAt', 'created_at', 'updatedAt', 'updated_at', 'priority'];
    let sortField = allowedSortFields.includes(sortBy) ? sortBy : 'priority';
    
    // Map camelCase to snake_case for database columns
    if (sortField === 'createdAt') {
      sortField = 'created_at';
    } else if (sortField === 'updatedAt') {
      sortField = 'updated_at';
    } else if (sortField === 'topicsCount') {
      sortField = 'topics_count';
    } else if (sortField === 'displayOrder') {
      sortField = 'display_order';
    }

    // Build the query
    const query = `
      SELECT 
        id,
        name,
        description,
        subscription_plan_id,
        plan_type,
        bundle_price,
        price,
        annual_subscription,
        bundled_access,
        future_topics_included,
        flexible_purchase,
        topics_count,
        status,
        priority,
        created_at,
        updated_at
      FROM category 
      ORDER BY
      CASE 
        CASE WHEN display_order = 0 THEN 1 ELSE 0 END,
      display_order ASC, ${sortField} ${sortOrder} 
      LIMIT $1 OFFSET $2
    `;

    // Get total count for pagination info
    const countQuery = 'SELECT COUNT(*) as total FROM category';

    // Execute both queries
    const [result, countResult] = await Promise.all([
      req.pool.query(query, [limit, offset]),
      req.pool.query(countQuery)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Format the response data to match the requested structure
    const formattedData = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      subscription_plan_id: row.subscription_plan_id,
      plan_type: row.plan_type,
      bundle_price: row.bundle_price,
      price: row.price,
      annual_subscription: !!row.annual_subscription,
      bundled_access: !!row.bundled_access,
      future_topics_included: !!row.future_topics_included,
      flexible_purchase: !!row.flexible_purchase,
      topicsCount: row.topics_count,
      status: row.status,
      priority: row.priority,
      createdAt: row.created_at ? row.created_at.toISOString().split('T')[0] : null,
      updatedAt: row.updated_at ? row.updated_at.toISOString().split('T')[0] : null
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Error in GET /categories:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// Sample POST category
router.post('/categories', async (req, res) => {
  const { name, description, price, status, plan_type, bundle_price, subscription_plan_id, priority = 0,
    annual_subscription = false,
    bundled_access = false,
    future_topics_included = false,
    flexible_purchase = false } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Category name is required'
    });
  }

  if (!description || description.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Category description is required'
    });
  }

  // Validate status if provided
  const validStatuses = ['Active', 'Inactive', 'Draft'];
  const categoryStatus = status && validStatuses.includes(status) ? status : 'Active';

  // Validate plan type
  const validPlanTypes = ['FREE', 'INDIVIDUAL', 'BUNDLE', 'FLEXIBLE'];
  if (!plan_type || !validPlanTypes.includes(plan_type)) {
    return res.status(400).json({
      success: false,
      error: 'plan_type is required and must be one of FREE, INDIVIDUAL, BUNDLE, FLEXIBLE'
    });
  }

  if (!subscription_plan_id) {
    return res.status(400).json({
      success: false,
      error: 'subscription_plan_id is required'
    });
  }

  const normalizedBundlePrice = (plan_type === 'BUNDLE' || plan_type === 'FLEXIBLE') ? Number(bundle_price || 0) : 0;
  if ((plan_type === 'BUNDLE' || plan_type === 'FLEXIBLE') && (!normalizedBundlePrice || normalizedBundlePrice <= 0)) {
    return res.status(400).json({
      success: false,
      error: 'bundle_price must be greater than 0 for BUNDLE or FLEXIBLE plan types'
    });
  }

  try {
    const result = await req.pool.query(
      `INSERT INTO category (name, description, price, status, plan_type, bundle_price, subscription_plan_id, priority,
        annual_subscription, bundled_access, future_topics_included, flexible_purchase)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`, 
      [name.trim(), description.trim(), price, categoryStatus, plan_type, normalizedBundlePrice, subscription_plan_id, priority,
        !!annual_subscription, !!bundled_access, !!future_topics_included, !!flexible_purchase]
    );

    // Format the response data
    const formattedData = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      subscription_plan_id: result.rows[0].subscription_plan_id,
      plan_type: result.rows[0].plan_type,
      bundle_price: result.rows[0].bundle_price,
      price: result.rows[0].price,
      priority: result.rows[0].priority,
      annual_subscription: !!result.rows[0].annual_subscription,
      bundled_access: !!result.rows[0].bundled_access,
      future_topics_included: !!result.rows[0].future_topics_included,
      flexible_purchase: !!result.rows[0].flexible_purchase,
      topicsCount: result.rows[0].topics_count || 0,
      status: result.rows[0].status,
      createdAt: result.rows[0].created_at ? result.rows[0].created_at.toISOString().split('T')[0] : null,
      updatedAt: result.rows[0].updated_at ? result.rows[0].updated_at.toISOString().split('T')[0] : null
    };

    res.status(201).json({
      success: true,
      data: formattedData,
      message: 'Category created successfully'
    });
  } catch (err) {
    console.error('Error in POST /categories:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// PUT update category by ID
router.put('/categories/:id', async (req, res) => {
  const categoryId = parseInt(req.params.id);
  const { name, description, price, status, plan_type, bundle_price, subscription_plan_id, priority,
    annual_subscription = false,
    bundled_access = false,
    future_topics_included = false,
    flexible_purchase = false } = req.body;
  
  if (!categoryId || isNaN(categoryId)) {
    return res.status(400).json({
      success: false,
      error: 'Valid category ID is required'
    });
  }

  if (!name || name.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Category name is required'
    });
  }

  if (!description || description.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Category description is required'
    });
  }

  // Validate status if provided
  const validStatuses = ['Active', 'Inactive', 'Draft'];
  const categoryStatus = status && validStatuses.includes(status) ? status : 'Active';

  // Validate plan type
  const validPlanTypes = ['FREE', 'INDIVIDUAL', 'BUNDLE', 'FLEXIBLE'];
  if (!plan_type || !validPlanTypes.includes(plan_type)) {
    return res.status(400).json({
      success: false,
      error: 'plan_type is required and must be one of FREE, INDIVIDUAL, BUNDLE, FLEXIBLE'
    });
  }

  if (!subscription_plan_id) {
    return res.status(400).json({
      success: false,
      error: 'subscription_plan_id is required'
    });
  }

  const normalizedBundlePrice = (plan_type === 'BUNDLE' || plan_type === 'FLEXIBLE') ? Number(bundle_price || 0) : 0;
  if ((plan_type === 'BUNDLE' || plan_type === 'FLEXIBLE') && (!normalizedBundlePrice || normalizedBundlePrice <= 0)) {
    return res.status(400).json({
      success: false,
      error: 'bundle_price must be greater than 0 for BUNDLE or FLEXIBLE plan types'
    });
  }

  try {
    // Check if category exists
    const existingCategory = await req.pool.query(
      'SELECT id FROM category WHERE id = $1',
      [categoryId]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Default display order to 0 if not provided (though for update we might want to keep existing if not provided... but user asked "if no entry is given... by default 0")
    // Use coalesce in query or check existing. Actually usually PUT updates provided fields. 
    // But if we want to ensure it has a valid integer even if they send null.
    // Let's assume if they don't send it, we keep it (or update if provided).
    // The user said "if no entry is given in display order field then by default 0". This applies more to creation. 
    // For update, if they send it, update it.

    // However, to be safe with the "default 0" logic on update:
    const order = displayOrder !== undefined && displayOrder !== null ? parseInt(displayOrder) : 0;

    // Update the category
    // NOTE: This OVERWRITES display_order to 0 if not provided in PUT. 
    // Ideally patch is better, but this is PUT. 
    // IF the user wants PUT to be a full update, then missing fields might be reset. 
    // But usually we just update what is there or keep existing.
    // Let's assume standard PUT behavior but ensuring '0' if they explicitly send null or empty.
    // Actually, looking at the code, it updates everything. So if I don't fetch existing display_order, I might overwrite it.
    // BUT the SQL query uses specific values. 

    // Let's use COALESCE in SQL ideally, or just fetch existing first?
    // The existing code doesn't Partial Update. It updates ALL fields: name=$1, description=$2...
    // So I must provide a value for display_order. 
    // If the client doesn't send it, it will be set to 0 with my logic above.

    // Let's check if we want to preserve existing if partial. 
    // The query is: `UPDATE category SET name = $1...`
    // It seems to expect all fields.
    // I see the previous code didn't do partial updates. It required name, description etc.
    // So I will require them to send it or default to 0.

    const result = await req.pool.query(
      `UPDATE category 
       SET name = $1, description = $2, price = $3, status = $4, plan_type = $5, bundle_price = $6, subscription_plan_id = $7,
           annual_subscription = $8, bundled_access = $9, future_topics_included = $10, flexible_purchase = $11, priority = $12,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $13 RETURNING *`, 
      [name.trim(), description.trim(), price, categoryStatus, plan_type, normalizedBundlePrice, subscription_plan_id,
        !!annual_subscription, !!bundled_access, !!future_topics_included, !!flexible_purchase, priority || 0, categoryId]
    );

    // Format the response data
    const formattedData = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      subscription_plan_id: result.rows[0].subscription_plan_id,
      plan_type: result.rows[0].plan_type,
      bundle_price: result.rows[0].bundle_price,
      price: result.rows[0].price,
      priority: result.rows[0].priority,
      annual_subscription: !!result.rows[0].annual_subscription,
      bundled_access: !!result.rows[0].bundled_access,
      future_topics_included: !!result.rows[0].future_topics_included,
      flexible_purchase: !!result.rows[0].flexible_purchase,
      topicsCount: result.rows[0].topics_count || 0,
      status: result.rows[0].status,
      displayOrder: result.rows[0].display_order,
      createdAt: result.rows[0].created_at ? result.rows[0].created_at.toISOString().split('T')[0] : null,
      updatedAt: result.rows[0].updated_at ? result.rows[0].updated_at.toISOString().split('T')[0] : null
    };

    res.json({
      success: true,
      data: formattedData,
      message: 'Category updated successfully'
    });
  } catch (err) {
    console.error('Error in PUT /categories/:id:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// DELETE category by ID
router.delete('/categories/:id', async (req, res) => {
  const categoryId = parseInt(req.params.id);

  if (!categoryId || isNaN(categoryId)) {
    return res.status(400).json({
      success: false,
      error: 'Valid category ID is required'
    });
  }

  try {
    // Check if category exists
    const existingCategory = await req.pool.query(
      'SELECT id, name FROM category WHERE id = $1',
      [categoryId]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if category has subcategories
    const subcategoryCheck = await req.pool.query(
      'SELECT COUNT(*) as count FROM subcategory WHERE category_id = $1',
      [categoryId]
    );

    const subcategoryCount = parseInt(subcategoryCheck.rows[0].count);

    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. It has ${subcategoryCount} subcategories. Please delete subcategories first.`
      });
    }

    // Delete the category
    await req.pool.query(
      'DELETE FROM category WHERE id = $1',
      [categoryId]
    );

    res.json({
      success: true,
      message: `Category '${existingCategory.rows[0].name}' deleted successfully`
    });
  } catch (err) {
    console.error('Error in DELETE /categories/:id:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

module.exports = router;
