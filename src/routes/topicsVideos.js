const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { uploadToS3, uploadFileToS3, deleteFromS3 } = require('../utils/s3-helper');
const ffmpeg = require('fluent-ffmpeg');
const { Readable } = require('stream');
const ffprobe = require('ffprobe-static');
const fs = require('fs');
const os = require('os');
const router = express.Router();

// Set ffprobe path
ffmpeg.setFfprobePath(ffprobe.path);

// Configure multer for disk storage
const uploadDir = path.join(os.tmpdir(), 'upload-videos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomUUID();
    cb(null, `video-${uniqueSuffix}${path.extname(file.originalname)}`);
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
    fileSize: 1000 * 1024 * 1024 // 1GB max
  }
});

// Helper function to validate file size
const validateFileSize = (file) => {
  const maxSize = 1000 * 1024 * 1024; // 1GB
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size: 1GB`);
  }
};

// Helper function to get video duration from file path
const getVideoDurationFromPath = async (filePath) => {
  return new Promise((resolve, reject) => {
    // Only run metadata probe, no full analysis
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('ffprobe error:', err);
        return resolve(0); // Resolve with 0 on error
      }

      // Check metadata.format.duration first
      let duration = parseFloat(metadata.format?.duration);

      // Fallback to video stream duration if format duration is missing/invalid
      if (!duration || isNaN(duration) || duration <= 0) {
        const videoStream = metadata.streams?.find(s => s.codec_type === 'video');
        if (videoStream?.duration) {
          duration = parseFloat(videoStream.duration);
        }
      }

      console.log(`Duration check for ${filePath}: ${duration}s`);

      if (!duration || isNaN(duration) || duration <= 0) {
        resolve(0);
      } else {
        resolve(duration);
      }
    });
  });
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

// POST /api/topics/:topicId/modules/:moduleId/videos/upload - FIXED Single Video Upload
router.post('/topics/:topicId/modules/:moduleId/videos/upload', upload.single('video'), async (req, res) => {
  let uploadedFilePath = null;
  try {
    const { topicId, moduleId } = req.params;
    const { title, description, duration, order } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    uploadedFilePath = req.file.path;
    console.log('✅ Processing SINGLE video upload:', uploadedFilePath, req.file.originalname);

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Video title is required'
      });
    }

    // Verify topic/module exist
    if (req.pool) {
      const topicCheck = await req.pool.query('SELECT id FROM topics WHERE id = $1', [topicId]);
      if (topicCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Topic not found' });
      }

      const moduleCheck = await req.pool.query(
        'SELECT id FROM topic_modules WHERE id = $1 AND topic_id = $2',
        [moduleId, topicId]
      );
      if (moduleCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Module not found in this topic' });
      }
    }

    // ✅ 1. DURATION FIRST - File guaranteed to exist
    let durationSeconds = 1; // Safe minimum
    const clientDuration = duration;

    // File exists verification
    if (!fs.existsSync(uploadedFilePath)) {
      throw new Error(`File missing before processing: ${uploadedFilePath}`);
    }

    try {
      // Import FIXED getVideoDurationFromPath from s3-helper
      const { getVideoDurationFromPath } = require('../utils/s3-helper');
      durationSeconds = await getVideoDurationFromPath(uploadedFilePath);
      console.log(`✅ FFProbe SUCCESS ${req.file.originalname}: ${durationSeconds}s`);
    } catch (durErr) {
      console.warn(`⚠️ FFProbe FAILED ${req.file.originalname}:`, durErr.message);
      // Fallback to client duration (MM:SS or minutes → seconds)
      if (clientDuration && !isNaN(parseFloat(clientDuration)) && parseFloat(clientDuration) > 0) {
        durationSeconds = Math.round(parseFloat(clientDuration) * 60);
        console.log(`✅ Client fallback duration: ${durationSeconds}s`);
      } else {
        console.warn(`⚠️ No valid fallback, using default: 1s`);
      }
    }

    // Ensure positive integer
    durationSeconds = Math.max(Math.round(durationSeconds), 1);
    console.log(`🎯 FINAL duration for DB: ${durationSeconds}s`);

    // ✅ 2. THEN S3 upload (file still exists)
    const s3Result = await uploadFileToS3(uploadedFilePath, req.file.originalname, req.file.mimetype, 'videos');
    console.log(`✅ S3 upload success: ${s3Result.url}`);

    // ✅ 3. THEN DB insert with confirmed duration
    const fileData = {
      id: crypto.randomUUID(),
      url: s3Result.url,
      filename: s3Result.key,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      title: title.trim(),
      description: description?.trim() || '',
      order: parseInt(order) || 1,
    };

    console.log(`📹 Saving to DB: "${fileData.title}" (${durationSeconds}s) → ${s3Result.url}`);

    let videoId = null;
    if (req.pool) {
      const videoResult = await req.pool.query(`
        INSERT INTO topic_videos (
          topic_id, module_id, title, description, video_url, 
          duration_seconds, video_type, order_index, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)
        RETURNING id, title, description, video_url, duration_seconds, order_index, is_active, created_at, updated_at
      `, [
        topicId, moduleId, fileData.title, fileData.description, fileData.url,
        durationSeconds, 'mp4', fileData.order, new Date(), new Date()
      ]);

      const video = videoResult.rows[0];
      videoId = video.id;

      console.log(`✅ DB saved! Video ID: ${videoId}, Duration: ${video.duration_seconds}s`);

      // Update aggregate durations
      await req.pool.query(`
        UPDATE topic_modules SET 
        duration_minutes = (
          SELECT CEIL(COALESCE(SUM(duration_seconds), 0) / 60.0)::int 
          FROM topic_videos WHERE module_id = $1
        ), updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [moduleId]);

      await req.pool.query(`
        UPDATE topics SET 
        duration_minutes = (
          SELECT COALESCE(SUM(tm.duration_minutes), 0) 
          FROM topic_modules tm WHERE tm.topic_id = $1
        ), updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [topicId]);

      // Save upload metadata
      await req.pool.query(`
        INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, category, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        fileData.id, fileData.filename, fileData.originalName, fileData.url,
        fileData.size, fileData.mimeType, 'video', 'topic-videos',
        JSON.stringify({
          title: fileData.title,
          description: fileData.description,
          duration: durationSeconds,
          topicId: parseInt(topicId),
          moduleId: parseInt(moduleId),
          videoId: videoId,
          order: fileData.order,
          linkedAt: new Date().toISOString()
        }),
        new Date()
      ]);

      res.json({
        success: true,
        data: {
          id: video.id,
          title: video.title,
          description: video.description || '',
          videoUrl: video.video_url,
          durationSeconds: video.duration_seconds,  // ✅ CORRECT!
          duration: Math.floor(video.duration_seconds / 60).toString().padStart(2, '0') + ':' +
            (video.duration_seconds % 60).toString().padStart(2, '0'),  // MM:SS
          order: video.order_index,
          isActive: video.is_active,
          createdAt: video.created_at?.toISOString(),
          updatedAt: video.updated_at?.toISOString(),
          uploadInfo: {
            uploadId: fileData.id,
            filename: fileData.filename,
            s3Key: fileData.filename,
            originalName: fileData.originalName,
            size: fileData.size
          }
        },
        message: `Video "${video.title}" uploaded successfully (${video.duration_seconds}s)`
      });

    } else {
      throw new Error('Database connection missing');
    }

  } catch (err) {
    console.error('❌ Error in POST /videos/upload:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  } finally {
    // ✅ Cleanup temp file AFTER all processing
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
        console.log('🧹 Cleaned up temp file:', uploadedFilePath);
      } catch (e) {
        console.error('Failed to delete temp file:', uploadedFilePath, e);
      }
    }
  }
});


// POST /api/topics/:topicId/modules/:moduleId/videos/upload-multiple - Upload multiple videos
router.post('/topics/:topicId/modules/:moduleId/videos/upload-multiple', upload.array('videos', 10), async (req, res) => {
  const uploadedFiles = [];
  try {
    const { topicId, moduleId } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No video files provided'
      });
    }

    // Keep track for cleanup
    req.files.forEach(f => uploadedFiles.push(f.path));

    // Verify topic and module exist
    if (req.pool) {
      const topicCheck = await req.pool.query('SELECT id FROM topics WHERE id = $1', [topicId]);
      if (topicCheck.rows.length === 0) return res.status(404).json({ success: false, error: 'Topic not found' });

      const moduleCheck = await req.pool.query('SELECT id FROM topic_modules WHERE id = $1 AND topic_id = $2', [moduleId, topicId]);
      if (moduleCheck.rows.length === 0) return res.status(404).json({ success: false, error: 'Module not found in this topic' });
    }

    const results = [];
    const errors = [];

    // Process videos in parallel
    const uploadPromises = req.files.map(async (file, i) => {
      try {
        // Calculate Duration
        let durationSeconds = 0;
        const clientDuration = req.body.durations?.[i];

        try {
          // Note: multiple ffprobes might be CPU intensive, but much faster than sequential
          const calculatedDuration = await getVideoDurationFromPath(file.path);
          if (calculatedDuration > 0) {
            durationSeconds = calculatedDuration;
          } else {
            console.warn(`Duration invalid for ${file.originalname}, checking fallback`);
            if (clientDuration && !isNaN(parseFloat(clientDuration)) && parseFloat(clientDuration) > 0) {
              durationSeconds = parseFloat(clientDuration) * 60;
            } else {
              durationSeconds = 1;
            }
          }
        } catch (durErr) {
          console.warn('Duration calculation error for ' + file.originalname, durErr);
          if (clientDuration && !isNaN(parseFloat(clientDuration)) && parseFloat(clientDuration) > 0) {
            durationSeconds = parseFloat(clientDuration) * 60;
          } else {
            durationSeconds = 1;
          }
        }

        // Ensure integer for DB
        durationSeconds = Math.round(durationSeconds);

        // Upload to S3 (Parallel thanks to Promise.all)
        const s3Result = await uploadFileToS3(file.path, file.originalname, file.mimetype, 'videos');

        const fileData = {
          id: crypto.randomUUID(),
          url: s3Result.url,
          filename: s3Result.key,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date().toISOString(),
          title: req.body.titles?.[i] || file.originalname.replace(/\.[^/.]+$/, ''),
          description: req.body.descriptions?.[i] || '',
          order: parseInt(req.body.orders?.[i] || (i + 1)),
          topicId: topicId,
          moduleId: moduleId
        };

        let videoId = null;
        const finalDuration = parseInt(Math.round(durationSeconds), 10);
        // Confirm duration before insert
        console.log(`[Video Upload] Title: ${file.originalname}, Calculated Duration: ${durationSeconds}`);
        console.log(`🎯 FINAL: ${finalDuration}s (type: ${typeof finalDuration})`);

        if (req.pool) {
          const videoResult = await req.pool.query(`
            INSERT INTO topic_videos (
              topic_id, module_id, title, description, video_url, 
              duration_seconds, video_type, order_index, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, title, description, video_url, duration_seconds, order_index, is_active, created_at, updated_at
          `, [
            topicId,          // $1
            moduleId,         // $2  
            fileData.title,   // $3
            fileData.description, // $4
            fileData.url,     // $5
            Math.max(1, Number(finalDuration)),    // $6  ← INTEGER!
            'mp4',            // $7
            fileData.order,   // $8
            true,             // $9  ← is_active
            new Date(),       // $10
            new Date()        // $11
          ]);
          console.log(
            `🧪 DB CONFIRM: id=${videoResult.rows[0].id}, duration_seconds=${videoResult.rows[0].duration_seconds}`
          );

          const video = videoResult.rows[0];
          videoId = video.id;

          // Save upload metadata
          await req.pool.query(`
            INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, category, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            fileData.id, fileData.filename, fileData.originalName, fileData.url,
            fileData.size, fileData.mimeType, 'video', 'topic-videos',
            JSON.stringify({
              title: fileData.title,
              description: fileData.description,
              duration: durationSeconds,
              topicId: parseInt(topicId),
              moduleId: parseInt(moduleId),
              videoId: videoId,
              order: fileData.order,
              bulkUpload: true,
              linkedAt: new Date().toISOString()
            }),
            new Date()
          ]);

          return {
            success: true,
            data: {
              id: video.id,
              title: video.title,
              videoUrl: video.video_url, // Proof of S3 URL
              s3Key: fileData.filename,
              durationSeconds: video.duration_seconds,
              order: video.order_index,
            }
          };
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        return {
          success: false,
          error: {
            filename: file.originalname,
            error: fileError.message
          }
        };
      }
    });

    // Wait for all uploads to finish
    const processingResults = [];
    for (let i = 0; i < uploadPromises.length; i++) {
      processingResults.push(await uploadPromises[i]);
    }
    // Separate successes and errors
    processingResults.forEach(r => {
      if (r && r.success) {
        results.push(r.data);
      } else if (r && !r.success) {
        errors.push(r.error);
      }
    });

    // Update aggregate durations
    if (req.pool && results.length > 0) {
      try {
        await req.pool.query(`
          UPDATE topic_modules SET duration_minutes = (
            SELECT CEIL(COALESCE(SUM(duration_seconds), 0) / 60.0)::int FROM topic_videos WHERE module_id = $1
          ), updated_at = CURRENT_TIMESTAMP WHERE id = $1
        `, [moduleId]);

        await req.pool.query(`
          UPDATE topics SET duration_minutes = (
            SELECT COALESCE(SUM(tm.duration_minutes), 0) FROM topic_modules tm WHERE tm.topic_id = $1
          ), updated_at = CURRENT_TIMESTAMP WHERE id = $1
        `, [topicId]);
      } catch (e) {
        console.warn("Duration update failed:", e);
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
      message: `Bulk processed: ${results.length} success, ${errors.length} failed`
    });

  } catch (err) {
    console.error('Error in POST /upload-multiple:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    // Cleanup all uploaded files from disk
    for (const filePath of uploadedFiles) {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error('Failed to cleanup:', filePath, e);
        }
      }
    }
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
