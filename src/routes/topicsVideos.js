const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads', 'video');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/wmv'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  }
});

// Helper function to get file URL
const getFileUrl = (req, filename) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/video/${filename}`;
};

// Helper function to validate file size
const validateFileSize = (file) => {
  const maxSize = 500 * 1024 * 1024; // 500MB
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size: 500MB`);
  }
};

// VIDEOS ROUTES

/**
 * @swagger
 * /api/topics/{topicId}/modules/{moduleId}/videos:
 *   get:
 *     summary: Get all videos for a module
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
 *         description: Videos retrieved successfully
 *   post:
 *     summary: Create a new video for a module
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
 *                 example: "Introduction Video"
 *               description:
 *                 type: string
 *                 example: "Welcome to the course"
 *               videoUrl:
 *                 type: string
 *                 example: "https://example.com/video.mp4"
 *               videoType:
 *                 type: string
 *                 enum: [mp4, youtube, vimeo, stream]
 *                 example: "mp4"
 *               thumbnailUrl:
 *                 type: string
 *                 example: "https://example.com/thumb.jpg"
 *               durationSeconds:
 *                 type: integer
 *                 example: 300
 *               orderIndex:
 *                 type: integer
 *                 example: 1
 *               isPreview:
 *                 type: boolean
 *                 example: false
 *               transcript:
 *                 type: string
 *                 example: "Video transcript..."
 *               resources:
 *                 type: array
 *                 items:
 *                   type: object
 *                 example: [{"name": "slides.pdf", "url": "https://example.com/slides.pdf"}]
 *     responses:
 *       201:
 *         description: Video created successfully
 */

// GET /api/topics/:topicId/modules/:moduleId/videos - Get all videos for a module
router.get('/topics/:topicId/modules/:moduleId/videos', async (req, res) => {
  try {
    const { topicId, moduleId } = req.params;
    const { includeInactive = false } = req.query;

    // Verify module exists
    const moduleCheck = await req.pool.query(
      'SELECT id FROM topic_modules WHERE id = $1 AND topic_id = $2',
      [moduleId, topicId]
    );

    if (moduleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Module not found'
      });
    }

    let whereClause = 'WHERE module_id = $1';
    const queryParams = [moduleId];

    if (includeInactive !== 'true') {
      whereClause += ' AND is_active = true';
    }

    const result = await req.pool.query(`
      SELECT * FROM topic_videos 
      ${whereClause}
      ORDER BY order_index ASC, created_at ASC
    `, queryParams);

    const videos = result.rows.map(row => ({
      id: row.id,
      topicId: row.topic_id,
      moduleId: row.module_id,
      title: row.title,
      description: row.description,
      videoUrl: row.video_url,
      videoType: row.video_type,
      thumbnailUrl: row.thumbnail_url,
      durationSeconds: row.duration_seconds,
      orderIndex: row.order_index,
      isActive: row.is_active,
      isPreview: row.is_preview,
      transcript: row.transcript,
      resources: row.resources || [],
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    }));

    res.json({
      success: true,
      data: videos
    });

  } catch (err) {
    console.error('Error in GET /topics/:topicId/modules/:moduleId/videos:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST /api/topics/:topicId/modules/:moduleId/videos - Create new video
router.post('/topics/:topicId/modules/:moduleId/videos', async (req, res) => {
  try {
    const { topicId, moduleId } = req.params;
    const {
      title,
      description,
      videoUrl,
      videoType = 'mp4',
      thumbnailUrl,
      durationSeconds = 0,
      orderIndex,
      isActive = true,
      isPreview = false,
      transcript,
      resources = []
    } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Video title is required'
      });
    }

    // Verify module exists
    const moduleCheck = await req.pool.query(
      'SELECT id FROM topic_modules WHERE id = $1 AND topic_id = $2',
      [moduleId, topicId]
    );

    if (moduleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Module not found'
      });
    }

    // Get next order index if not provided
    let videoOrder = orderIndex;
    if (!videoOrder) {
      const maxOrderResult = await req.pool.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM topic_videos WHERE module_id = $1',
        [moduleId]
      );
      videoOrder = maxOrderResult.rows[0].next_order;
    }

    // Validate video type
    const validVideoTypes = ['mp4', 'youtube', 'vimeo', 'stream'];
    if (!validVideoTypes.includes(videoType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid video type'
      });
    }

    const result = await req.pool.query(`
      INSERT INTO topic_videos (
        topic_id, module_id, title, description, video_url, video_type,
        thumbnail_url, duration_seconds, order_index, is_active, is_preview,
        transcript, resources
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *
    `, [
      topicId,
      moduleId,
      title.trim(),
      description || null,
      videoUrl || null,
      videoType,
      thumbnailUrl || null,
      parseInt(durationSeconds),
      videoOrder,
      isActive,
      isPreview,
      transcript || null,
      JSON.stringify(resources)
    ]);

    const video = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
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
      }
    });

  } catch (err) {
    console.error('Error in POST /topics/:topicId/modules/:moduleId/videos:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/topics/{topicId}/modules/{moduleId}/videos/{videoId}:
 *   get:
 *     summary: Get video by ID
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
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Video retrieved successfully
 *   put:
 *     summary: Update video by ID
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
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Video updated successfully
 *   delete:
 *     summary: Delete video by ID
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
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Video deleted successfully
 */

// GET /api/topics/:topicId/modules/:moduleId/videos/:videoId - Get video by ID
router.get('/topics/:topicId/modules/:moduleId/videos/:videoId', async (req, res) => {
  try {
    const { topicId, moduleId, videoId } = req.params;

    const result = await req.pool.query(`
      SELECT * FROM topic_videos 
      WHERE id = $1 AND module_id = $2
    `, [videoId, moduleId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    const video = result.rows[0];

    res.json({
      success: true,
      data: {
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
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/:topicId/modules/:moduleId/videos/:videoId:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// PUT /api/topics/:topicId/modules/:moduleId/videos/:videoId - Update video
router.put('/topics/:topicId/modules/:moduleId/videos/:videoId', async (req, res) => {
  try {
    const { topicId, moduleId, videoId } = req.params;
    const updateData = req.body;

    // Check if video exists
    const existing = await req.pool.query(
      'SELECT * FROM topic_videos WHERE id = $1 AND module_id = $2',
      [videoId, moduleId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Validate video type if provided
    if (updateData.videoType) {
      const validVideoTypes = ['mp4', 'youtube', 'vimeo', 'stream'];
      if (!validVideoTypes.includes(updateData.videoType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid video type'
        });
      }
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    const allowedFields = [
      'title', 'description', 'video_url', 'video_type', 'thumbnail_url',
      'duration_seconds', 'order_index', 'is_active', 'is_preview',
      'transcript', 'resources'
    ];

    for (const [key, value] of Object.entries(updateData)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = $${paramCount}`);
        if (key === 'resources') {
          updateValues.push(JSON.stringify(value || []));
        } else {
          updateValues.push(value);
        }
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
    updateValues.push(videoId);

    const updateQuery = `
      UPDATE topic_videos 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await req.pool.query(updateQuery, updateValues);
    const video = result.rows[0];

    res.json({
      success: true,
      data: {
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
      }
    });

  } catch (err) {
    console.error('Error in PUT /topics/:topicId/modules/:moduleId/videos/:videoId:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// DELETE /api/topics/:topicId/modules/:moduleId/videos/:videoId - Delete video
router.delete('/topics/:topicId/modules/:moduleId/videos/:videoId', async (req, res) => {
  try {
    const { topicId, moduleId, videoId } = req.params;

    // Check if video exists
    const existing = await req.pool.query(
      'SELECT id FROM topic_videos WHERE id = $1 AND module_id = $2',
      [videoId, moduleId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Delete video
    await req.pool.query('DELETE FROM topic_videos WHERE id = $1', [videoId]);

    res.json({
      success: true,
      data: {
        deleted: true
      }
    });

  } catch (err) {
    console.error('Error in DELETE /topics/:topicId/modules/:moduleId/videos/:videoId:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST /api/topics/:topicId/modules/:moduleId/videos/upload - Upload video file
router.post('/topics/:topicId/modules/:moduleId/videos/upload', upload.single('video'), async (req, res) => {
  try {
    const { topicId, moduleId } = req.params;
    const { title, description, duration, order } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Video title is required'
      });
    }

    validateFileSize(req.file);

    // Verify topic and module exist
    if (req.pool) {
      const topicCheck = await req.pool.query(
        'SELECT id FROM topics WHERE id = $1',
        [topicId]
      );
      
      if (topicCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Topic not found'
        });
      }

      const moduleCheck = await req.pool.query(
        'SELECT id FROM topic_modules WHERE id = $1 AND topic_id = $2',
        [moduleId, topicId]
      );
      
      if (moduleCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Module not found in this topic'
        });
      }
    }

    const fileData = {
      id: crypto.randomUUID(),
      url: getFileUrl(req, req.file.filename),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      title: title.trim(),
      description: description?.trim() || '',
      duration: duration || '0',
      order: parseInt(order) || 1,
      topicId: topicId,
      moduleId: moduleId
    };

    let videoId = null;

    // Save to topic_videos table
    if (req.pool) {
      try {
        const durationSeconds = duration ? parseFloat(duration) * 60 : 0;
        
        const videoResult = await req.pool.query(`
          INSERT INTO topic_videos (
            topic_id,
            module_id, 
            title, 
            description, 
            video_url, 
            duration_seconds, 
            video_type, 
            order_index,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, title, description, video_url, duration_seconds, order_index, created_at, updated_at
        `, [
          topicId,
          moduleId,
          fileData.title,
          fileData.description,
          fileData.url,
          durationSeconds,
          'mp4',
          fileData.order,
          new Date(),
          new Date()
        ]);
        
        const video = videoResult.rows[0];
        videoId = video.id;

        // Update module duration
        await req.pool.query(`
          UPDATE topic_modules 
          SET duration_minutes = (
            SELECT COALESCE(SUM(duration_seconds), 0) / 60 
            FROM topic_videos 
            WHERE module_id = $1
          ),
          updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [moduleId]);

        // Update topic duration
        await req.pool.query(`
          UPDATE topics 
          SET duration_minutes = (
            SELECT COALESCE(SUM(tm.duration_minutes), 0)
            FROM topic_modules tm 
            WHERE tm.topic_id = $1
          ),
          updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [topicId]);

        // Save upload metadata with proper linking
        await req.pool.query(`
          INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, category, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          fileData.id,
          fileData.filename,
          fileData.originalName,
          fileData.url, // Use the URL instead of file path for consistency
          fileData.size,
          fileData.mimeType,
          'video',
          'topic-videos',
          JSON.stringify({ 
            title: fileData.title, 
            description: fileData.description, 
            duration: fileData.duration, 
            topicId: parseInt(topicId), 
            moduleId: parseInt(moduleId),
            videoId: videoId,
            order: fileData.order,
            linkedAt: new Date().toISOString()
          }),
          new Date()
        ]);

        // Return formatted video data
        res.json({
          success: true,
          data: {
            id: video.id,
            title: video.title,
            description: video.description,
            duration: (video.duration_seconds / 60).toString(),
            videoUrl: video.video_url,
            thumbnail: '',
            thumbnailUrl: null,
            order: video.order_index,
            orderIndex: video.order_index,
            videoType: 'mp4',
            durationSeconds: video.duration_seconds,
            isPreview: false,
            transcript: null,
            createdAt: video.created_at?.toISOString(),
            updatedAt: video.updated_at?.toISOString(),
            // Upload metadata
            uploadInfo: {
              uploadId: fileData.id,
              filename: fileData.filename,
              originalName: fileData.originalName,
              size: fileData.size,
              mimeType: fileData.mimeType,
              uploadedAt: fileData.uploadedAt
            }
          },
          message: 'Video uploaded successfully to module'
        });

      } catch (dbError) {
        console.error('Failed to save video to database:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Failed to save video to database: ' + dbError.message
        });
      }
    } else {
      return res.status(500).json({
        success: false,
        error: 'Database connection not available'
      });
    }

  } catch (err) {
    console.error('Error in POST /topics/:topicId/modules/:moduleId/videos/upload:', err);
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to upload video'
    });
  }
});

// POST /api/topics/:topicId/modules/:moduleId/videos/upload-multiple - Upload multiple videos
router.post('/topics/:topicId/modules/:moduleId/videos/upload-multiple', upload.array('videos', 10), async (req, res) => {
  try {
    const { topicId, moduleId } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No video files provided'
      });
    }

    // Verify topic and module exist
    if (req.pool) {
      const topicCheck = await req.pool.query(
        'SELECT id FROM topics WHERE id = $1',
        [topicId]
      );
      
      if (topicCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Topic not found'
        });
      }

      const moduleCheck = await req.pool.query(
        'SELECT id FROM topic_modules WHERE id = $1 AND topic_id = $2',
        [moduleId, topicId]
      );
      
      if (moduleCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Module not found in this topic'
        });
      }
    }

    const results = [];
    const errors = [];

    // Process each video file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        validateFileSize(file);

        const fileData = {
          id: crypto.randomUUID(),
          url: getFileUrl(req, file.filename),
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date().toISOString(),
          title: req.body.titles?.[i] || path.basename(file.originalname, path.extname(file.originalname)),
          description: req.body.descriptions?.[i] || '',
          duration: req.body.durations?.[i] || '0',
          order: parseInt(req.body.orders?.[i] || (i + 1)),
          topicId: topicId,
          moduleId: moduleId
        };

        let videoId = null;

        // Save to topic_videos table
        if (req.pool) {
          const durationSeconds = fileData.duration ? parseFloat(fileData.duration) * 60 : 0;
          
          const videoResult = await req.pool.query(`
            INSERT INTO topic_videos (
              topic_id,
              module_id, 
              title, 
              description, 
              video_url, 
              duration_seconds, 
              video_type, 
              order_index,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, title, description, video_url, duration_seconds, order_index, created_at, updated_at
          `, [
            topicId,
            moduleId,
            fileData.title,
            fileData.description,
            fileData.url,
            durationSeconds,
            'mp4',
            fileData.order,
            new Date(),
            new Date()
          ]);
          
          const video = videoResult.rows[0];
          videoId = video.id;

          // Save upload metadata with proper linking
          await req.pool.query(`
            INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, category, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            fileData.id,
            fileData.filename,
            fileData.originalName,
            fileData.url, // Use the URL instead of file path for consistency
            fileData.size,
            fileData.mimeType,
            'video',
            'topic-videos',
            JSON.stringify({ 
              title: fileData.title, 
              description: fileData.description, 
              duration: fileData.duration, 
              topicId: parseInt(topicId), 
              moduleId: parseInt(moduleId),
              videoId: videoId,
              order: fileData.order,
              bulkUpload: true,
              linkedAt: new Date().toISOString()
            }),
            new Date()
          ]);

          results.push({
            id: video.id,
            title: video.title,
            description: video.description,
            duration: (video.duration_seconds / 60).toString(),
            videoUrl: video.video_url,
            thumbnail: '',
            thumbnailUrl: null,
            order: video.order_index,
            orderIndex: video.order_index,
            videoType: 'mp4',
            durationSeconds: video.duration_seconds,
            isPreview: false,
            transcript: null,
            createdAt: video.created_at?.toISOString(),
            updatedAt: video.updated_at?.toISOString(),
            uploadInfo: {
              uploadId: fileData.id,
              filename: fileData.filename,
              originalName: fileData.originalName,
              size: fileData.size,
              mimeType: fileData.mimeType,
              uploadedAt: fileData.uploadedAt
            }
          });
        }

      } catch (fileError) {
        errors.push({
          filename: file.originalname,
          error: fileError.message
        });
      }
    }

    // Update module and topic durations after all uploads
    if (req.pool && results.length > 0) {
      try {
        await req.pool.query(`
          UPDATE topic_modules 
          SET duration_minutes = (
            SELECT COALESCE(SUM(duration_seconds), 0) / 60 
            FROM topic_videos 
            WHERE module_id = $1
          ),
          updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [moduleId]);

        await req.pool.query(`
          UPDATE topics 
          SET duration_minutes = (
            SELECT COALESCE(SUM(tm.duration_minutes), 0)
            FROM topic_modules tm 
            WHERE tm.topic_id = $1
          ),
          updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [topicId]);
      } catch (updateError) {
        console.warn('Failed to update durations:', updateError);
      }
    }

    res.json({
      success: true,
      data: {
        uploaded: results,
        errors: errors,
        totalUploaded: results.length,
        totalErrors: errors.length
      },
      message: `Bulk video upload completed: ${results.length} videos uploaded successfully${errors.length > 0 ? `, ${errors.length} files failed` : ''}`
    });

  } catch (err) {
    console.error('Error in POST /topics/:topicId/modules/:moduleId/videos/upload-multiple:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to upload videos'
    });
  }
});

// POST /api/topics/:topicId/modules/:moduleId/videos/reorder - Reorder videos
router.post('/topics/:topicId/modules/:moduleId/videos/reorder', async (req, res) => {
  try {
    const { topicId, moduleId } = req.params;
    const { videoIds } = req.body;

    if (!videoIds || !Array.isArray(videoIds)) {
      return res.status(400).json({
        success: false,
        error: 'Array of video IDs is required'
      });
    }

    // Update order for each video
    const client = await req.pool.connect();
    
    try {
      await client.query('BEGIN');

      for (let i = 0; i < videoIds.length; i++) {
        await client.query(
          'UPDATE topic_videos SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND module_id = $3',
          [i + 1, videoIds[i], moduleId]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        data: {
          reordered: videoIds.length
        }
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Error in POST /topics/:topicId/modules/:moduleId/videos/reorder:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  console.error('Topics videos route error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'Video file too large. Maximum size is 500MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum 10 files allowed'
      });
    }
  }

  res.status(400).json({
    success: false,
    error: error.message || 'Video upload failed'
  });
});

module.exports = router;
