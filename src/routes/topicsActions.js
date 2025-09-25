const express = require('express');
const router = express.Router();

// POST /api/topics/:id/toggle-status - Toggle topic status
router.post('/topics/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;

    // Get current status
    const current = await req.pool.query('SELECT status FROM topics WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }

    const currentStatus = current.rows[0].status;
    let newStatus;
    
    // Toggle logic
    switch (currentStatus) {
      case 'draft':
        newStatus = 'published';
        break;
      case 'published':
        newStatus = 'archived';
        break;
      case 'archived':
        newStatus = 'draft';
        break;
      default:
        newStatus = 'draft';
    }

    // Update status and published_at if publishing
    let updateQuery = 'UPDATE topics SET status = $1, updated_at = CURRENT_TIMESTAMP';
    let queryParams = [newStatus, id];

    if (newStatus === 'published' && currentStatus !== 'published') {
      updateQuery += ', published_at = CURRENT_TIMESTAMP';
    }

    updateQuery += ' WHERE id = $2 RETURNING *';

    const result = await req.pool.query(updateQuery, queryParams);
    const topic = result.rows[0];

    res.json({
      success: true,
      data: {
        id: topic.id,
        status: topic.status,
        publishedAt: topic.published_at?.toISOString(),
        updatedAt: topic.updated_at?.toISOString()
      }
    });

  } catch (err) {
    console.error('Error in POST /topics/:id/toggle-status:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST /api/topics/:id/toggle-featured - Toggle featured status
router.post('/topics/:id/toggle-featured', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.pool.query(`
      UPDATE topics 
      SET is_featured = NOT is_featured, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING id, is_featured, updated_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }

    const topic = result.rows[0];

    res.json({
      success: true,
      data: {
        id: topic.id,
        isFeatured: topic.is_featured,
        updatedAt: topic.updated_at?.toISOString()
      }
    });

  } catch (err) {
    console.error('Error in POST /topics/:id/toggle-featured:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST /api/topics/:id/duplicate - Duplicate a topic
router.post('/topics/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;

    // Get original topic
    const original = await req.pool.query('SELECT * FROM topics WHERE id = $1', [id]);
    if (original.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }

    const topic = original.rows[0];

    // Generate new title and slug
    const newTitle = `${topic.title} (Copy)`;
    const baseSlug = newTitle
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    let newSlug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (true) {
      const existing = await req.pool.query('SELECT id FROM topics WHERE slug = $1', [newSlug]);
      if (existing.rows.length === 0) break;
      newSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create duplicate
    const result = await req.pool.query(`
      INSERT INTO topics (
        title, description, content, slug, category_id, subcategory_id,
        difficulty, status, is_featured, is_free, price, duration_minutes,
        thumbnail_url, tags, meta_title, meta_description, meta_keywords, author_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'draft', false, $9, $10, $11, $12, $13, $14, $15, $16, $17
      ) RETURNING *
    `, [
      newTitle,
      topic.description,
      topic.content,
      newSlug,
      topic.category_id,
      topic.subcategory_id,
      topic.difficulty,
      topic.is_free,
      topic.price,
      topic.duration_minutes,
      topic.thumbnail_url,
      topic.tags,
      topic.meta_title,
      topic.meta_description,
      topic.meta_keywords,
      topic.author_id
    ]);

    const newTopic = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: newTopic.id,
        title: newTopic.title,
        slug: newTopic.slug,
        status: newTopic.status,
        createdAt: newTopic.created_at?.toISOString()
      }
    });

  } catch (err) {
    console.error('Error in POST /topics/:id/duplicate:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST /api/topics/:id/publish - Publish a topic
router.post('/topics/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.pool.query(`
      UPDATE topics 
      SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status != 'published'
      RETURNING id, status, published_at, updated_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found or already published'
      });
    }

    const topic = result.rows[0];

    res.json({
      success: true,
      data: {
        id: topic.id,
        status: topic.status,
        publishedAt: topic.published_at?.toISOString(),
        updatedAt: topic.updated_at?.toISOString()
      }
    });

  } catch (err) {
    console.error('Error in POST /topics/:id/publish:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST /api/topics/:id/archive - Archive a topic
router.post('/topics/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.pool.query(`
      UPDATE topics 
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status != 'archived'
      RETURNING id, status, updated_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found or already archived'
      });
    }

    const topic = result.rows[0];

    res.json({
      success: true,
      data: {
        id: topic.id,
        status: topic.status,
        updatedAt: topic.updated_at?.toISOString()
      }
    });

  } catch (err) {
    console.error('Error in POST /topics/:id/archive:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/export - Export topics to CSV/JSON
router.get('/topics/export', async (req, res) => {
  try {
    const { format = 'json', status } = req.query;

    let whereClause = '';
    const queryParams = [];

    if (status) {
      whereClause = 'WHERE t.status = $1';
      queryParams.push(status);
    }

    const result = await req.pool.query(`
      SELECT 
        t.*,
        c.name as category_name,
        sc.name as subcategory_name
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      ${whereClause}
      ORDER BY t.created_at DESC
    `, queryParams);

    const topics = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      category: row.category_name,
      subcategory: row.subcategory_name,
      difficulty: row.difficulty,
      status: row.status,
      isFeatured: row.is_featured,
      isFree: row.is_free,
      price: parseFloat(row.price || 0),
      durationMinutes: row.duration_minutes,
      tags: row.tags || [],
      viewCount: row.view_count,
      enrollmentCount: row.enrollment_count,
      publishedAt: row.published_at?.toISOString(),
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    }));

    if (format === 'csv') {
      // Convert to CSV
      const csv = topics.map(topic => 
        Object.values(topic).map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      ).join('\n');

      const headers = Object.keys(topics[0] || {}).join(',');
      const csvContent = `${headers}\n${csv}`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="topics.csv"');
      res.send(csvContent);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="topics.json"');
      res.json({
        success: true,
        data: topics,
        exportedAt: new Date().toISOString(),
        count: topics.length
      });
    }

  } catch (err) {
    console.error('Error in GET /topics/export:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST /api/topics/import - Import topics from JSON
router.post('/topics/import', async (req, res) => {
  try {
    const { topics } = req.body;

    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({
        success: false,
        error: 'Topics array is required'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      
      try {
        // Validate required fields
        if (!topic.title) {
          errors.push({ index: i, error: 'Title is required' });
          continue;
        }

        // Generate slug
        const baseSlug = topic.title
          .toLowerCase()
          .replace(/[^a-z0-9 -]/g, '')
          .replace(/\s+/g, '-');

        let slug = baseSlug;
        let counter = 1;

        // Ensure unique slug
        while (true) {
          const existing = await req.pool.query('SELECT id FROM topics WHERE slug = $1', [slug]);
          if (existing.rows.length === 0) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        const result = await req.pool.query(`
          INSERT INTO topics (
            title, description, content, slug, category_id, subcategory_id,
            difficulty, status, is_featured, is_free, price, duration_minutes,
            thumbnail_url, tags, meta_title, meta_description, meta_keywords
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          ) RETURNING id, title, slug
        `, [
          topic.title,
          topic.description || null,
          topic.content || null,
          slug,
          topic.categoryId || null,
          topic.subcategoryId || null,
          topic.difficulty || 'beginner',
          topic.status || 'draft',
          topic.isFeatured || false,
          topic.isFree !== undefined ? topic.isFree : true,
          parseFloat(topic.price || 0),
          parseInt(topic.durationMinutes || 0),
          topic.thumbnailUrl || null,
          JSON.stringify(topic.tags || []),
          topic.metaTitle || null,
          topic.metaDescription || null,
          topic.metaKeywords || null
        ]);

        results.push({
          index: i,
          id: result.rows[0].id,
          title: result.rows[0].title,
          slug: result.rows[0].slug
        });

      } catch (err) {
        errors.push({
          index: i,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        imported: results.length,
        failed: errors.length,
        results,
        errors
      }
    });

  } catch (err) {
    console.error('Error in POST /topics/import:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

module.exports = router;
