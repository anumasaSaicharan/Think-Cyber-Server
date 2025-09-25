const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/terms:
 *   get:
 *     summary: Get all terms and conditions with pagination and sorting
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
 *         description: List of terms and conditions
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
 *                     $ref: '#/components/schemas/TermsConditions'
 *                 meta:
 *                   type: object
 *   post:
 *     summary: Create new terms and conditions
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
 *                 example: 'Terms and Conditions for ThinkCyber Platform'
 *               content:
 *                 type: string
 *                 example: 'These terms and conditions outline the rules and regulations for the use of ThinkCyber Website...'
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
 *         description: Terms and conditions created successfully
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
 *                   $ref: '#/components/schemas/TermsConditions'
 *
 * /api/terms/{id}:
 *   get:
 *     summary: Get terms and conditions by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terms and conditions ID
 *     responses:
 *       200:
 *         description: Terms and conditions details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TermsConditions'
 *       404:
 *         description: Terms and conditions not found
 *   put:
 *     summary: Update terms and conditions by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terms and conditions ID
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
 *         description: Terms and conditions updated successfully
 *       404:
 *         description: Terms and conditions not found
 *   delete:
 *     summary: Delete terms and conditions by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terms and conditions ID
 *     responses:
 *       200:
 *         description: Terms and conditions deleted successfully
 *       404:
 *         description: Terms and conditions not found
 *
 * /api/terms/{id}/publish:
 *   post:
 *     summary: Publish terms and conditions by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terms and conditions ID
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
 *         description: Terms and conditions published successfully
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
 *                   $ref: '#/components/schemas/TermsConditions'
 *       404:
 *         description: Terms and conditions not found
 *       400:
 *         description: Terms and conditions cannot be published (invalid status)
 */

// GET all terms and conditions
router.get('/terms', async (req, res) => {
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
      FROM terms_conditions 
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder} 
      LIMIT $1 OFFSET $2
    `;
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM terms_conditions${whereClause}`;
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
    console.error('Error in GET /terms-conditions:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST create terms and conditions
router.post('/terms', async (req, res) => {
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
  const termsStatus = status && validStatuses.includes(status) ? status : 'Draft';
  const termsLanguage = language && language.trim() !== '' ? language.trim() : 'en';
  const termsCreatedBy = createdBy && createdBy.trim() !== '' ? createdBy.trim() : 'admin';

  try {
    const result = await req.pool.query(
      `INSERT INTO terms_conditions 
       (title, content, version, language, status, effective_date, created_by, updated_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, 
      [
        title.trim(), 
        content.trim(), 
        version.trim(), 
        termsLanguage, 
        termsStatus, 
        effectiveDate || null,
        termsCreatedBy,
        termsCreatedBy
      ]
    );

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Failed to create terms and conditions');
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
      message: 'Terms and conditions created successfully',
      data: formattedData
    });
  } catch (err) {
    console.error('Error in POST /terms-conditions:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET single terms and conditions by ID
router.get('/terms/:id', async (req, res) => {
  const termsId = parseInt(req.params.id);
  
  if (!termsId || isNaN(termsId)) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid terms and conditions ID is required' 
    });
  }

  try {
    const result = await req.pool.query(
      `SELECT 
        id, title, content, version, language, status, effective_date,
        created_at, updated_at, created_by, updated_by
       FROM terms_conditions 
       WHERE id = $1`, 
      [termsId]
    );
    
    if (!result || !result.rows || result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Terms and conditions not found' 
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
    console.error('Error in GET /terms-conditions/:id:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// PUT update terms and conditions by ID
router.put('/terms/:id', async (req, res) => {
  const termsId = parseInt(req.params.id);
  const { title, content, version, language, status, effectiveDate, updatedBy } = req.body;
  
  if (!termsId || isNaN(termsId)) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid terms and conditions ID is required' 
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
  const termsStatus = status && validStatuses.includes(status) ? status : 'Draft';
  const termsLanguage = language && language.trim() !== '' ? language.trim() : 'en';
  const termsUpdatedBy = updatedBy && updatedBy.trim() !== '' ? updatedBy.trim() : 'admin';

  try {
    // Check if terms exists
    const existingTerms = await req.pool.query(
      'SELECT id FROM terms_conditions WHERE id = $1', 
      [termsId]
    );
    
    if (!existingTerms || !existingTerms.rows || existingTerms.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Terms and conditions not found' 
      });
    }

    // Update the terms and conditions
    const result = await req.pool.query(
      `UPDATE terms_conditions 
       SET title = $1, content = $2, version = $3, language = $4, status = $5, 
           effective_date = $6, updated_by = $7, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $8 RETURNING *`, 
      [
        title.trim(), 
        content.trim(), 
        version.trim(), 
        termsLanguage, 
        termsStatus, 
        effectiveDate || null,
        termsUpdatedBy,
        termsId
      ]
    );

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Failed to update terms and conditions');
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
      message: 'Terms and conditions updated successfully',
      data: formattedData
    });
  } catch (err) {
    console.error('Error in PUT /terms-conditions/:id:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// DELETE terms and conditions by ID
router.delete('/terms/:id', async (req, res) => {
  const termsId = parseInt(req.params.id);
  
  if (!termsId || isNaN(termsId)) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid terms and conditions ID is required' 
    });
  }

  try {
    // Check if terms exists
    const existingTerms = await req.pool.query(
      'SELECT id, title FROM terms_conditions WHERE id = $1', 
      [termsId]
    );
    
    if (!existingTerms || !existingTerms.rows || existingTerms.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Terms and conditions not found' 
      });
    }

    // Delete the terms and conditions
    await req.pool.query(
      'DELETE FROM terms_conditions WHERE id = $1', 
      [termsId]
    );

    res.json({
      success: true,
      message: `Terms and conditions '${existingTerms.rows[0].title}' deleted successfully`
    });
  } catch (err) {
    console.error('Error in DELETE /terms-conditions/:id:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST publish terms and conditions by ID
router.post('/terms/:id/publish', async (req, res) => {
  const termsId = parseInt(req.params.id);
  const { effectiveDate, publishedBy } = req.body;
  
  if (!termsId || isNaN(termsId)) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid terms ID is required' 
    });
  }

  try {
    // Check if terms exist and get current status
    const existingTerms = await req.pool.query(
      'SELECT id, title, status FROM terms_conditions WHERE id = $1', 
      [termsId]
    );
    
    if (!existingTerms || !existingTerms.rows || existingTerms.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Terms and conditions not found' 
      });
    }

    const currentStatus = existingTerms.rows[0].status;
    
    // Check if terms can be published (only Draft and Inactive can be published)
    if (currentStatus === 'Active') {
      return res.status(400).json({ 
        success: false,
        error: 'Terms and conditions are already active/published' 
      });
    }

    if (currentStatus === 'Archived') {
      return res.status(400).json({ 
        success: false,
        error: 'Archived terms and conditions cannot be published' 
      });
    }

    // Set effective date - use provided date or current date
    const publishEffectiveDate = effectiveDate || new Date().toISOString().split('T')[0];
    const publisher = publishedBy || 'admin';

    // Update terms to Active status with effective date
    const result = await req.pool.query(
      `UPDATE terms_conditions 
       SET status = 'Active', 
           effective_date = $1, 
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $2
       WHERE id = $3 
       RETURNING *`, 
      [publishEffectiveDate, publisher, termsId]
    );

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Failed to publish terms and conditions');
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
      message: `Terms and conditions '${existingTerms.rows[0].title}' published successfully`,
      data: formattedData
    });
  } catch (err) {
    console.error('Error in POST /terms/:id/publish:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

module.exports = router;
