const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/subcategories:
 *   get:
 *     summary: Get all subcategories with pagination and sorting
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
 *           enum: [id, name, category_id, createdAt]
 *         description: Field to sort by (default id)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (default asc)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive, Draft]
 *         description: Filter by status
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *     responses:
 *       200:
 *         description: List of subcategories with pagination info
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
 *                     $ref: '#/components/schemas/SubCategory'
 *                 pagination:
 *                   type: object
 *   post:
 *     summary: Add a new subcategory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category_id
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Network Security'
 *               category_id:
 *                 type: integer
 *                 example: 1
 *               description:
 *                 type: string
 *                 example: 'Understanding network security protocols and practices'
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Draft]
 *                 example: 'Active'
 *     responses:
 *       201:
 *         description: Subcategory created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SubCategory'
 *                 message:
 *                   type: string
 *
 * /api/subcategories/{id}:
 *   get:
 *     summary: Get a subcategory by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subcategory ID
 *     responses:
 *       200:
 *         description: Subcategory details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SubCategory'
 *       404:
 *         description: Subcategory not found
 *   put:
 *     summary: Update a subcategory by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subcategory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category_id
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Advanced Network Security'
 *               category_id:
 *                 type: integer
 *                 example: 1
 *               description:
 *                 type: string
 *                 example: 'Advanced network security protocols and practices'
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Draft]
 *                 example: 'Active'
 *     responses:
 *       200:
 *         description: Subcategory updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SubCategory'
 *                 message:
 *                   type: string
 *       404:
 *         description: Subcategory not found
 *   delete:
 *     summary: Delete a subcategory by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subcategory ID
 *     responses:
 *       200:
 *         description: Subcategory deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Subcategory not found
 */

// GET all subcategories with pagination and sorting
router.get('/subcategories', async (req, res) => {
  try {
    // Check if database pool is available
    if (!req.pool) {
      return res.status(500).json({ 
        success: false,
        error: 'Database connection not available' 
      });
    }

    // Extract query parameters with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'id';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const status = req.query.status; // Filter by status
    const categoryId = req.query.categoryId || req.query.category_id; // Filter by category
    const offset = (page - 1) * limit;

    // Validate sortBy field to prevent SQL injection
    const allowedSortFields = ['id', 'name', 'category_id', 'createdAt', 'created_at'];
    let sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
    
    // Map camelCase to snake_case for database columns
    if (sortField === 'createdAt') {
      sortField = 'created_at';
    }

    // Build WHERE conditions for filtering
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`s.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (categoryId) {
      whereConditions.push(`s.category_id = $${paramIndex}`);
      queryParams.push(parseInt(categoryId));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build the query with category join for better information
    const query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.category_id,
        s.topics_count,
        s.status,
        s.created_at,
        s.updated_at,
        c.name as category_name 
      FROM subcategory s 
      LEFT JOIN category c ON s.category_id = c.id
      ${whereClause}
      ORDER BY s.${sortField} ${sortOrder} 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    // Add pagination parameters
    queryParams.push(limit, offset);

    // Get total count for pagination info with same filters
    const countQuery = `SELECT COUNT(*) as total FROM subcategory s ${whereClause}`;
    const countParams = queryParams.slice(0, -2); // Remove limit and offset for count query
    
    // Get stats queries
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft,
        COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive,
        COALESCE(SUM(topics_count), 0) as total_topics,
        COUNT(DISTINCT category_id) as categories_used
      FROM subcategory
    `;
    
    // Get categories list (all categories, not just those with subcategories)
    const categoriesQuery = `
      SELECT c.id, c.name 
      FROM category c 
      ORDER BY c.name
    `;
    
    // Execute all queries
    const [result, countResult, statsResult, categoriesResult] = await Promise.all([
      req.pool.query(query, queryParams),
      req.pool.query(countQuery, countParams),
      req.pool.query(statsQuery),
      req.pool.query(categoriesQuery)
    ]);

    // Add null checks for safety
    if (!result || !result.rows || !countResult || !countResult.rows || !statsResult || !statsResult.rows || !categoriesResult || !categoriesResult.rows) {
      throw new Error('Database query returned unexpected result');
    }

    const total = parseInt(countResult.rows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit);
    const stats = statsResult.rows[0];

    // Format the response data to match the requested structure
    const formattedData = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      categoryId: row.category_id,
      categoryName: row.category_name,
      topicsCount: row.topics_count || 0,
      status: row.status || 'Active',
      createdAt: row.created_at ? row.created_at.toISOString().split('T')[0] : null,
      updatedAt: row.updated_at ? row.updated_at.toISOString().split('T')[0] : null
    }));

    const averageTopics = stats.total > 0 ? (parseFloat(stats.total_topics) / parseFloat(stats.total)).toFixed(1) : '0.0';

    res.json({
      success: true,
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages
      },
      stats: {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        draft: parseInt(stats.draft),
        inactive: parseInt(stats.inactive),
        totalTopics: parseInt(stats.total_topics),
        averageTopicsPerSubcategory: averageTopics,
        categoriesUsed: parseInt(stats.categories_used)
      },
      categories: categoriesResult.rows.map(row => ({
        id: row.id,
        name: row.name
      })),
      message: `Fetched ${formattedData.length} subcategories (page ${page})`
    });
  } catch (err) {
    console.error('Error in GET /subcategories:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST subcategory
router.post('/subcategories', async (req, res) => {
  const { name, category_id, categoryId, description, status } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Subcategory name is required' 
    });
  }

  // Accept both category_id and categoryId formats
  const finalCategoryId = category_id || categoryId;
  if (!finalCategoryId) {
    return res.status(400).json({ 
      success: false,
      error: 'Category ID is required' 
    });
  }

  // Validate status if provided
  const validStatuses = ['Active', 'Inactive', 'Draft'];
  const subcategoryStatus = status && validStatuses.includes(status) ? status : 'Active';
  const subcategoryDescription = description && description.trim() !== '' ? description.trim() : 'Subcategory description';

  try {
    // Check if category exists
    const categoryCheck = await req.pool.query(
      'SELECT id, name FROM category WHERE id = $1', 
      [finalCategoryId]
    );
    
    if (!categoryCheck || !categoryCheck.rows || categoryCheck.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Category not found' 
      });
    }

    const result = await req.pool.query(
      'INSERT INTO subcategory (name, category_id, description, status, topics_count) VALUES ($1, $2, $3, $4, $5) RETURNING *', 
      [name.trim(), finalCategoryId, subcategoryDescription, subcategoryStatus, 0]
    );

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Failed to create subcategory');
    }

    // Format the response data
    const formattedData = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      categoryId: result.rows[0].category_id,
      categoryName: categoryCheck.rows[0].name,
      topicsCount: result.rows[0].topics_count || 0,
      status: result.rows[0].status,
      createdAt: result.rows[0].created_at ? result.rows[0].created_at.toISOString().split('T')[0] : null,
      updatedAt: result.rows[0].updated_at ? result.rows[0].updated_at.toISOString().split('T')[0] : null
    };
    
    res.status(201).json({
      success: true,
      data: formattedData,
      message: 'Subcategory created successfully'
    });
  } catch (err) {
    console.error('Error in POST /subcategories:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET single subcategory by ID
router.get('/subcategories/:id', async (req, res) => {
  const subcategoryId = parseInt(req.params.id);
  
  if (!subcategoryId || isNaN(subcategoryId)) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid subcategory ID is required' 
    });
  }

  try {
    const result = await req.pool.query(
      `SELECT 
        s.id,
        s.name,
        s.description,
        s.category_id,
        s.topics_count,
        s.status,
        s.created_at,
        s.updated_at,
        c.name as category_name 
       FROM subcategory s 
       LEFT JOIN category c ON s.category_id = c.id
       WHERE s.id = $1`, 
      [subcategoryId]
    );
    
    if (!result || !result.rows || result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Subcategory not found' 
      });
    }

    const row = result.rows[0];
    const formattedData = {
      id: row.id,
      name: row.name,
      description: row.description || '',
      categoryId: row.category_id,
      categoryName: row.category_name,
      topicsCount: row.topics_count || 0,
      status: row.status || 'Active',
      createdAt: row.created_at ? row.created_at.toISOString().split('T')[0] : null,
      updatedAt: row.updated_at ? row.updated_at.toISOString().split('T')[0] : null
    };

    res.json({
      success: true,
      data: formattedData
    });
  } catch (err) {
    console.error('Error in GET /subcategories/:id:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// PUT update subcategory by ID
router.put('/subcategories/:id', async (req, res) => {
  const subcategoryId = parseInt(req.params.id);
  const { name, category_id, categoryId, description, status } = req.body;
  
  if (!subcategoryId || isNaN(subcategoryId)) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid subcategory ID is required' 
    });
  }

  if (!name || name.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Subcategory name is required' 
    });
  }

  // Accept both category_id and categoryId formats
  const finalCategoryId = category_id || categoryId;
  if (!finalCategoryId) {
    return res.status(400).json({ 
      success: false,
      error: 'Category ID is required' 
    });
  }

  // Validate status if provided
  const validStatuses = ['Active', 'Inactive', 'Draft'];
  const subcategoryStatus = status && validStatuses.includes(status) ? status : 'Active';
  const subcategoryDescription = description && description.trim() !== '' ? description.trim() : 'Subcategory description';

  try {
    // Check if subcategory exists
    const existingSubcategory = await req.pool.query(
      'SELECT id FROM subcategory WHERE id = $1', 
      [subcategoryId]
    );
    
    if (!existingSubcategory || !existingSubcategory.rows || existingSubcategory.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Subcategory not found' 
      });
    }

    // Check if category exists
    const categoryCheck = await req.pool.query(
      'SELECT id, name FROM category WHERE id = $1', 
      [finalCategoryId]
    );
    
    if (!categoryCheck || !categoryCheck.rows || categoryCheck.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Category not found' 
      });
    }

    // Update the subcategory
    const result = await req.pool.query(
      'UPDATE subcategory SET name = $1, category_id = $2, description = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *', 
      [name.trim(), finalCategoryId, subcategoryDescription, subcategoryStatus, subcategoryId]
    );

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Failed to update subcategory');
    }

    // Format the response data
    const formattedData = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      categoryId: result.rows[0].category_id,
      categoryName: categoryCheck.rows[0].name,
      topicsCount: result.rows[0].topics_count || 0,
      status: result.rows[0].status,
      createdAt: result.rows[0].created_at ? result.rows[0].created_at.toISOString().split('T')[0] : null,
      updatedAt: result.rows[0].updated_at ? result.rows[0].updated_at.toISOString().split('T')[0] : null
    };

    res.json({
      success: true,
      data: formattedData,
      message: 'Subcategory updated successfully'
    });
  } catch (err) {
    console.error('Error in PUT /subcategories/:id:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// DELETE subcategory by ID
router.delete('/subcategories/:id', async (req, res) => {
  const subcategoryId = parseInt(req.params.id);
  
  if (!subcategoryId || isNaN(subcategoryId)) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid subcategory ID is required' 
    });
  }

  try {
    // Check if subcategory exists
    const existingSubcategory = await req.pool.query(
      'SELECT id, name FROM subcategory WHERE id = $1', 
      [subcategoryId]
    );
    
    if (!existingSubcategory || !existingSubcategory.rows || existingSubcategory.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Subcategory not found' 
      });
    }

    // Delete the subcategory
    await req.pool.query(
      'DELETE FROM subcategory WHERE id = $1', 
      [subcategoryId]
    );

    res.json({
      success: true,
      message: `Subcategory '${existingSubcategory.rows[0].name}' deleted successfully`
    });
  } catch (err) {
    console.error('Error in DELETE /subcategories/:id:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

module.exports = router;
