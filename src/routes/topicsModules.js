const express = require('express');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     TopicModule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         topicId:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "Introduction Module"
 *         description:
 *           type: string
 *           example: "Getting started with the basics"
 *         orderIndex:
 *           type: integer
 *           example: 1
 *         isActive:
 *           type: boolean
 *           example: true
 *         durationMinutes:
 *           type: integer
 *           example: 45
 *     TopicVideo:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         topicId:
 *           type: integer
 *           example: 1
 *         moduleId:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "Welcome Video"
 *         description:
 *           type: string
 *           example: "Introduction to the course"
 *         videoUrl:
 *           type: string
 *           example: "https://example.com/video.mp4"
 *         videoType:
 *           type: string
 *           enum: [mp4, youtube, vimeo, stream]
 *           example: "mp4"
 *         thumbnailUrl:
 *           type: string
 *           example: "https://example.com/thumb.jpg"
 *         durationSeconds:
 *           type: integer
 *           example: 300
 *         orderIndex:
 *           type: integer
 *           example: 1
 *         isActive:
 *           type: boolean
 *           example: true
 *         isPreview:
 *           type: boolean
 *           example: false
 *         transcript:
 *           type: string
 *           example: "Video transcript content..."
 *         resources:
 *           type: array
 *           items:
 *             type: object
 *           example: [{"name": "slides.pdf", "url": "https://example.com/slides.pdf"}]
 */

// MODULES ROUTES

/**
 * @swagger
 * /api/topics/{topicId}/modules:
 *   get:
 *     summary: Get all modules for a topic
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Modules retrieved successfully
 *   post:
 *     summary: Create a new module for a topic
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Introduction Module"
 *               description:
 *                 type: string
 *                 example: "Getting started with basics"
 *               orderIndex:
 *                 type: integer
 *                 example: 1
 *               durationMinutes:
 *                 type: integer
 *                 example: 45
 *     responses:
 *       201:
 *         description: Module created successfully
 */

// GET /api/topics/:topicId/modules - Get all modules for a topic
router.get('/topics/:topicId/modules', async (req, res) => {
  try {
    const { topicId } = req.params;

    // Verify topic exists
    const topicCheck = await req.pool.query('SELECT id FROM topics WHERE id = $1', [topicId]);
    if (topicCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }

    const result = await req.pool.query(`
      SELECT * FROM topic_modules 
      WHERE topic_id = $1 
      ORDER BY order_index ASC, created_at ASC
    `, [topicId]);

    const modules = result.rows.map(row => ({
      id: row.id,
      topicId: row.topic_id,
      title: row.title,
      description: row.description,
      orderIndex: row.order_index,
      isActive: row.is_active,
      durationMinutes: row.duration_minutes,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    }));

    res.json({
      success: true,
      data: modules
    });

  } catch (err) {
    console.error('Error in GET /topics/:topicId/modules:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST /api/topics/:topicId/modules - Create new module
router.post('/topics/:topicId/modules', async (req, res) => {
  try {
    const { topicId } = req.params;
    const { title, description, orderIndex, durationMinutes = 0, isActive = true } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Module title is required'
      });
    }

    // Verify topic exists
    const topicCheck = await req.pool.query('SELECT id FROM topics WHERE id = $1', [topicId]);
    if (topicCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }

    // Get next order index if not provided
    let moduleOrder = orderIndex;
    if (!moduleOrder) {
      const maxOrderResult = await req.pool.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM topic_modules WHERE topic_id = $1',
        [topicId]
      );
      moduleOrder = maxOrderResult.rows[0].next_order;
    }

    const result = await req.pool.query(`
      INSERT INTO topic_modules (topic_id, title, description, order_index, is_active, duration_minutes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [topicId, title.trim(), description || null, moduleOrder, isActive, parseInt(durationMinutes)]);

    const module = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: module.id,
        topicId: module.topic_id,
        title: module.title,
        description: module.description,
        orderIndex: module.order_index,
        isActive: module.is_active,
        durationMinutes: module.duration_minutes,
        createdAt: module.created_at?.toISOString(),
        updatedAt: module.updated_at?.toISOString()
      }
    });

  } catch (err) {
    console.error('Error in POST /topics/:topicId/modules:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/topics/{topicId}/modules/{moduleId}:
 *   get:
 *     summary: Get module by ID
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Module retrieved successfully
 *   put:
 *     summary: Update module by ID
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Module updated successfully
 *   delete:
 *     summary: Delete module by ID
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Module deleted successfully
 */

// GET /api/topics/:topicId/modules/:moduleId - Get module by ID
router.get('/topics/:topicId/modules/:moduleId', async (req, res) => {
  try {
    const { topicId, moduleId } = req.params;

    const result = await req.pool.query(`
      SELECT * FROM topic_modules 
      WHERE id = $1 AND topic_id = $2
    `, [moduleId, topicId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Module not found'
      });
    }

    const module = result.rows[0];

    // Get videos for this module
    const videosResult = await req.pool.query(`
      SELECT * FROM topic_videos 
      WHERE module_id = $1 
      ORDER BY order_index ASC
    `, [moduleId]);

    const videos = videosResult.rows.map(video => ({
      id: video.id,
      topicId: video.topic_id,
      moduleId: video.module_id,
      title: video.title,
      description: video.description,
      videoUrl: video.video_url,
      videoType: video.video_type,
      thumbnailUrl: video.thumbnail_url,
      durationSeconds: video.duration_seconds,
      orderIndex: video.order_index,
      isActive: video.is_active,
      isPreview: video.is_preview,
      transcript: video.transcript,
      resources: video.resources || [],
      createdAt: video.created_at?.toISOString(),
      updatedAt: video.updated_at?.toISOString()
    }));

    res.json({
      success: true,
      data: {
        id: module.id,
        topicId: module.topic_id,
        title: module.title,
        description: module.description,
        orderIndex: module.order_index,
        isActive: module.is_active,
        durationMinutes: module.duration_minutes,
        createdAt: module.created_at?.toISOString(),
        updatedAt: module.updated_at?.toISOString(),
        videos
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/:topicId/modules/:moduleId:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// PUT /api/topics/:topicId/modules/:moduleId - Update module
router.put('/topics/:topicId/modules/:moduleId', async (req, res) => {
  try {
    const { topicId, moduleId } = req.params;
    const updateData = req.body;

    // Check if module exists
    const existing = await req.pool.query(
      'SELECT * FROM topic_modules WHERE id = $1 AND topic_id = $2',
      [moduleId, topicId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Module not found'
      });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    const allowedFields = ['title', 'description', 'order_index', 'is_active', 'duration_minutes'];

    for (const [key, value] of Object.entries(updateData)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(moduleId);

    const updateQuery = `
      UPDATE topic_modules 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await req.pool.query(updateQuery, updateValues);
    const module = result.rows[0];

    res.json({
      success: true,
      data: {
        id: module.id,
        topicId: module.topic_id,
        title: module.title,
        description: module.description,
        orderIndex: module.order_index,
        isActive: module.is_active,
        durationMinutes: module.duration_minutes,
        createdAt: module.created_at?.toISOString(),
        updatedAt: module.updated_at?.toISOString()
      }
    });

  } catch (err) {
    console.error('Error in PUT /topics/:topicId/modules/:moduleId:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// DELETE /api/topics/:topicId/modules/:moduleId - Delete module
router.delete('/topics/:topicId/modules/:moduleId', async (req, res) => {
  try {
    const { topicId, moduleId } = req.params;

    // Check if module exists
    const existing = await req.pool.query(
      'SELECT id FROM topic_modules WHERE id = $1 AND topic_id = $2',
      [moduleId, topicId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Module not found'
      });
    }

    // Delete module (cascade will handle videos)
    await req.pool.query('DELETE FROM topic_modules WHERE id = $1', [moduleId]);

    res.json({
      success: true,
      data: {
        deleted: true
      }
    });

  } catch (err) {
    console.error('Error in DELETE /topics/:topicId/modules/:moduleId:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST /api/topics/:topicId/modules/reorder - Reorder modules
router.post('/topics/:topicId/modules/reorder', async (req, res) => {
  try {
    const { topicId } = req.params;
    const { moduleIds } = req.body;

    if (!moduleIds || !Array.isArray(moduleIds)) {
      return res.status(400).json({
        success: false,
        error: 'Array of module IDs is required'
      });
    }

    // Update order for each module
    const client = await req.pool.connect();
    
    try {
      await client.query('BEGIN');

      for (let i = 0; i < moduleIds.length; i++) {
        await client.query(
          'UPDATE topic_modules SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND topic_id = $3',
          [i + 1, moduleIds[i], topicId]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        data: {
          reordered: moduleIds.length
        }
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Error in POST /topics/:topicId/modules/reorder:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

module.exports = router;
