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
 *           enum: [id, name, description, status, topicsCount, createdAt, updatedAt]
 *         description: Field to sort by (default id)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (default asc)
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
    const sortBy = req.query.sortBy || 'id';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const offset = (page - 1) * limit;

    // Validate sortBy field to prevent SQL injection
    const allowedSortFields = ['id', 'name', 'description', 'status', 'topicsCount', 'topics_count', 'createdAt', 'created_at', 'updatedAt', 'updated_at'];
    let sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
    
    // Map camelCase to snake_case for database columns
    if (sortField === 'createdAt') {
      sortField = 'created_at';
    } else if (sortField === 'updatedAt') {
      sortField = 'updated_at';
    } else if (sortField === 'topicsCount') {
      sortField = 'topics_count';
    }

    // Build the query
    const query = `
      SELECT 
        id,
        name,
        description,
        topics_count,
        status,
        created_at,
        updated_at
      FROM category 
      ORDER BY ${sortField} ${sortOrder} 
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
      topicsCount: row.topics_count,
      status: row.status,
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
  const { name, description, status } = req.body;
  
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

  try {
    const result = await req.pool.query(
      'INSERT INTO category (name, description, status) VALUES ($1, $2, $3) RETURNING *', 
      [name.trim(), description.trim(), categoryStatus]
    );

    // Format the response data
    const formattedData = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
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
  const { name, description, status } = req.body;
  
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

    // Update the category
    const result = await req.pool.query(
      'UPDATE category SET name = $1, description = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *', 
      [name.trim(), description.trim(), categoryStatus, categoryId]
    );

    // Format the response data
    const formattedData = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      topicsCount: result.rows[0].topics_count || 0,
      status: result.rows[0].status,
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
