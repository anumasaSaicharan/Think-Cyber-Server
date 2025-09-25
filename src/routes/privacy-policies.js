const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/privacy:
 *   get:
 *     summary: Get all privacy policies with pagination and sorting
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
 *           enum: [id, title, version, language, status, effectiveDate, createdAt, updatedAt]
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
 *           enum: [Draft, Active, Inactive, Archived]
 *         description: Filter by status
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by language (e.g., en, es, fr)
 *     responses:
 *       200:
 *         description: List of privacy policies
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
 *                     $ref: '#/components/schemas/PrivacyPolicy'
 *                 meta:
 *                   type: object
 *   post:
 *     summary: Create new privacy policy
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - version
 *             properties:
 *               title:
 *                 type: string
 *                 example: 'Privacy Policy for ThinkCyber Platform'
 *               content:
 *                 type: string
 *                 example: 'This privacy policy explains how we collect, use, and protect your personal information...'
 *               version:
 *                 type: string
 *                 example: '1.0'
 *               language:
 *                 type: string
 *                 example: 'en'
 *               status:
 *                 type: string
 *                 enum: [Draft, Active, Inactive, Archived]
 *                 example: 'Draft'
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *                 example: '2025-08-01'
 *               createdBy:
 *                 type: string
 *                 example: 'admin'
 *     responses:
 *       201:
 *         description: Privacy policy created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PrivacyPolicy'
 *
 * /api/privacy/{id}:
 *   get:
 *     summary: Get privacy policy by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Privacy policy ID
 *     responses:
 *       200:
 *         description: Privacy policy details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PrivacyPolicy'
 *       404:
 *         description: Privacy policy not found
 *   put:
 *     summary: Update privacy policy by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Privacy policy ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - version
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               version:
 *                 type: string
 *               language:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Draft, Active, Inactive, Archived]
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *               updatedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Privacy policy updated successfully
 *       404:
 *         description: Privacy policy not found
 *   delete:
 *     summary: Delete privacy policy by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Privacy policy ID
 *     responses:
 *       200:
 *         description: Privacy policy deleted successfully
 *       404:
 *         description: Privacy policy not found
 *
 * /api/privacy/{id}/publish:
 *   post:
 *     summary: Publish privacy policy by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Privacy policy ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *                 example: '2025-08-01'
 *               publishedBy:
 *                 type: string
 *                 example: 'admin'
 *     responses:
 *       200:
 *         description: Privacy policy published successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PrivacyPolicy'
 *       404:
 *         description: Privacy policy not found
 *       400:
 *         description: Privacy policy cannot be published (invalid status)
 */

// GET all privacy policies
router.get('/privacy', async (req, res) => {
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
    const statusFilter = req.query.status;
    const languageFilter = req.query.language;
    const offset = (page - 1) * limit;

    // Validate sortBy field to prevent SQL injection
    const allowedSortFields = ['id', 'title', 'version', 'language', 'status', 'effective_date', 'effectiveDate', 'created_at', 'createdAt', 'updated_at', 'updatedAt'];
    let sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
    
    // Map camelCase to snake_case for database columns
    if (sortField === 'effectiveDate') {
      sortField = 'effective_date';
    } else if (sortField === 'createdAt') {
      sortField = 'created_at';
    } else if (sortField === 'updatedAt') {
      sortField = 'updated_at';
    }

    // Build WHERE clause for filters
    let whereClause = '';
    let queryParams = [limit, offset];
    let paramCount = 2;

    if (statusFilter) {
      whereClause += ` WHERE status = $${++paramCount}`;
      queryParams.push(statusFilter);
    }

    if (languageFilter) {
      whereClause += statusFilter ? ' AND' : ' WHERE';
      whereClause += ` language = $${++paramCount}`;
      queryParams.push(languageFilter);
    }

    // Build the main query
    const query = `
      SELECT 
        id,
        title,
        content,
        version,
        language,
        status,
        effective_date,
        created_at,
        updated_at,
        created_by,
        updated_by
      FROM privacy_policies 
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder} 
      LIMIT $1 OFFSET $2
    `;
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM privacy_policies${whereClause}`;
    const countParams = queryParams.slice(2); // Remove limit and offset
    
    // Execute both queries
    const [result, countResult] = await Promise.all([
      req.pool.query(query, queryParams),
      req.pool.query(countQuery, countParams)
    ]);

    // Add null checks for safety
    if (!result || !result.rows || !countResult || !countResult.rows) {
      throw new Error('Database query returned unexpected result');
    }

    const total = parseInt(countResult.rows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit);

    // Format the response data
    const formattedData = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      version: row.version,
      language: row.language,
      status: row.status,
      effectiveDate: row.effective_date ? row.effective_date.toISOString().split('T')[0] : null,
      createdAt: row.created_at ? row.created_at.toISOString() : null,
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    }));

    res.json({
      success: true,
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Error in GET /privacy-policies:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST create privacy policy
router.post('/privacy', async (req, res) => {
  const { title, content, version, language, status, effectiveDate, createdBy } = req.body;
  
  if (!title || title.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Title is required' 
    });
  }

  if (!content || content.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Content is required' 
    });
  }

  if (!version || version.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Version is required' 
    });
  }

  // Validate status if provided
  const validStatuses = ['Draft', 'Active', 'Inactive', 'Archived'];
  const policyStatus = status && validStatuses.includes(status) ? status : 'Draft';
  const policyLanguage = language && language.trim() !== '' ? language.trim() : 'en';
  const policyCreatedBy = createdBy && createdBy.trim() !== '' ? createdBy.trim() : 'admin';

  try {
    const result = await req.pool.query(
      `INSERT INTO privacy_policies 
       (title, content, version, language, status, effective_date, created_by, updated_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, 
      [
        title.trim(), 
        content.trim(), 
        version.trim(), 
        policyLanguage, 
        policyStatus, 
        effectiveDate || null,
        policyCreatedBy,
        policyCreatedBy
      ]
    );

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Failed to create privacy policy');
    }

    // Format the response data
    const formattedData = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      content: result.rows[0].content,
      version: result.rows[0].version,
      language: result.rows[0].language,
      status: result.rows[0].status,
      effectiveDate: result.rows[0].effective_date ? result.rows[0].effective_date.toISOString().split('T')[0] : null,
      createdAt: result.rows[0].created_at ? result.rows[0].created_at.toISOString() : null,
      updatedAt: result.rows[0].updated_at ? result.rows[0].updated_at.toISOString() : null,
      createdBy: result.rows[0].created_by,
      updatedBy: result.rows[0].updated_by
    };
    
    res.status(201).json({
      success: true,
      message: 'Privacy policy created successfully',
      data: formattedData
    });
  } catch (err) {
    console.error('Error in POST /privacy-policies:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET single privacy policy by ID
router.get('/privacy/:id', async (req, res) => {
  const policyId = parseInt(req.params.id);
  
  if (!policyId || isNaN(policyId)) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid privacy policy ID is required' 
    });
  }

  try {
    const result = await req.pool.query(
      `SELECT 
        id, title, content, version, language, status, effective_date,
        created_at, updated_at, created_by, updated_by
       FROM privacy_policies 
       WHERE id = $1`, 
      [policyId]
    );
    
    if (!result || !result.rows || result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Privacy policy not found' 
      });
    }

    const row = result.rows[0];
    const formattedData = {
      id: row.id,
      title: row.title,
      content: row.content,
      version: row.version,
      language: row.language,
      status: row.status,
      effectiveDate: row.effective_date ? row.effective_date.toISOString().split('T')[0] : null,
      createdAt: row.created_at ? row.created_at.toISOString() : null,
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };

    res.json({
      success: true,
      data: formattedData
    });
  } catch (err) {
    console.error('Error in GET /privacy-policies/:id:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// PUT update privacy policy by ID
router.put('/privacy/:id', async (req, res) => {
  const policyId = parseInt(req.params.id);
  const { title, content, version, language, status, effectiveDate, updatedBy } = req.body;
  
  if (!policyId || isNaN(policyId)) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid privacy policy ID is required' 
    });
  }

  if (!title || title.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Title is required' 
    });
  }

  if (!content || content.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Content is required' 
    });
  }

  if (!version || version.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Version is required' 
    });
  }

  // Validate status if provided
  const validStatuses = ['Draft', 'Active', 'Inactive', 'Archived'];
  const policyStatus = status && validStatuses.includes(status) ? status : 'Draft';
  const policyLanguage = language && language.trim() !== '' ? language.trim() : 'en';
  const policyUpdatedBy = updatedBy && updatedBy.trim() !== '' ? updatedBy.trim() : 'admin';

  try {
    // Check if policy exists
    const existingPolicy = await req.pool.query(
      'SELECT id FROM privacy_policies WHERE id = $1', 
      [policyId]
    );
    
    if (!existingPolicy || !existingPolicy.rows || existingPolicy.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Privacy policy not found' 
      });
    }

    // Update the privacy policy
    const result = await req.pool.query(
      `UPDATE privacy_policies 
       SET title = $1, content = $2, version = $3, language = $4, status = $5, 
           effective_date = $6, updated_by = $7, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $8 RETURNING *`, 
      [
        title.trim(), 
        content.trim(), 
        version.trim(), 
        policyLanguage, 
        policyStatus, 
        effectiveDate || null,
        policyUpdatedBy,
        policyId
      ]
    );

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Failed to update privacy policy');
    }

    // Format the response data
    const formattedData = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      content: result.rows[0].content,
      version: result.rows[0].version,
      language: result.rows[0].language,
      status: result.rows[0].status,
      effectiveDate: result.rows[0].effective_date ? result.rows[0].effective_date.toISOString().split('T')[0] : null,
      createdAt: result.rows[0].created_at ? result.rows[0].created_at.toISOString() : null,
      updatedAt: result.rows[0].updated_at ? result.rows[0].updated_at.toISOString() : null,
      createdBy: result.rows[0].created_by,
      updatedBy: result.rows[0].updated_by
    };

    res.json({
      success: true,
      message: 'Privacy policy updated successfully',
      data: formattedData
    });
  } catch (err) {
    console.error('Error in PUT /privacy-policies/:id:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// DELETE privacy policy by ID
router.delete('/privacy/:id', async (req, res) => {
  const policyId = parseInt(req.params.id);
  
  if (!policyId || isNaN(policyId)) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid privacy policy ID is required' 
    });
  }

  try {
    // Check if policy exists
    const existingPolicy = await req.pool.query(
      'SELECT id, title FROM privacy_policies WHERE id = $1', 
      [policyId]
    );
    
    if (!existingPolicy || !existingPolicy.rows || existingPolicy.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Privacy policy not found' 
      });
    }

    // Delete the privacy policy
    await req.pool.query(
      'DELETE FROM privacy_policies WHERE id = $1', 
      [policyId]
    );

    res.json({
      success: true,
      message: `Privacy policy '${existingPolicy.rows[0].title}' deleted successfully`
    });
  } catch (err) {
    console.error('Error in DELETE /privacy-policies/:id:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST publish privacy policy by ID
router.post('/privacy/:id/publish', async (req, res) => {
  const policyId = parseInt(req.params.id);
  const { effectiveDate, publishedBy } = req.body;
  
  if (!policyId || isNaN(policyId)) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid privacy policy ID is required' 
    });
  }

  try {
    // Check if privacy policy exists and get current status
    const existingPolicy = await req.pool.query(
      'SELECT id, title, status FROM privacy_policies WHERE id = $1', 
      [policyId]
    );
    
    if (!existingPolicy || !existingPolicy.rows || existingPolicy.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Privacy policy not found' 
      });
    }

    const currentStatus = existingPolicy.rows[0].status;
    
    // Check if policy can be published (only Draft and Inactive can be published)
    if (currentStatus === 'Active') {
      return res.status(400).json({ 
        success: false,
        error: 'Privacy policy is already active/published' 
      });
    }

    if (currentStatus === 'Archived') {
      return res.status(400).json({ 
        success: false,
        error: 'Archived privacy policy cannot be published' 
      });
    }

    // Set effective date - use provided date or current date
    const publishEffectiveDate = effectiveDate || new Date().toISOString().split('T')[0];
    const publisher = publishedBy || 'admin';

    // Update policy to Active status with effective date
    const result = await req.pool.query(
      `UPDATE privacy_policies 
       SET status = 'Active', 
           effective_date = $1, 
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $2
       WHERE id = $3 
       RETURNING *`, 
      [publishEffectiveDate, publisher, policyId]
    );

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Failed to publish privacy policy');
    }

    // Format the response data
    const formattedData = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      content: result.rows[0].content,
      version: result.rows[0].version,
      language: result.rows[0].language || 'en',
      status: result.rows[0].status,
      effectiveDate: result.rows[0].effective_date ? result.rows[0].effective_date.toISOString().split('T')[0] : null,
      createdAt: result.rows[0].created_at ? result.rows[0].created_at.toISOString() : null,
      updatedAt: result.rows[0].updated_at ? result.rows[0].updated_at.toISOString() : null,
      createdBy: result.rows[0].created_by || 'admin',
      updatedBy: result.rows[0].updated_by || 'admin'
    };

    res.json({
      success: true,
      message: `Privacy policy '${existingPolicy.rows[0].title}' published successfully`,
      data: formattedData
    });
  } catch (err) {
    console.error('Error in POST /privacy/:id/publish:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

module.exports = router;
