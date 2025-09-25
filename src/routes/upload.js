const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadType = req.body.type || req.path.split('/')[1] || 'general';
    const uploadPath = path.join(__dirname, '../../uploads', uploadType);
    
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/wmv'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    thumbnail: ['image/jpeg', 'image/png', 'image/webp']
  };

  const uploadType = req.path.split('/')[1] || 'general';
  const allowed = allowedTypes[uploadType] || [...allowedTypes.image, ...allowedTypes.video, ...allowedTypes.document];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types for ${uploadType}: ${allowed.join(', ')}`), false);
  }
};

// File size limits (in bytes)
const fileLimits = {
  image: 10 * 1024 * 1024, // 10MB
  video: 500 * 1024 * 1024, // 500MB
  document: 50 * 1024 * 1024, // 50MB
  thumbnail: 5 * 1024 * 1024 // 5MB
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max (will be overridden per route)
  }
});

// Helper function to get file URL
const getFileUrl = (req, filename, type) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${type}/${filename}`;
};

// Helper function to validate file size for specific type
const validateFileSize = (file, type) => {
  const maxSize = fileLimits[type] || fileLimits.document;
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size for ${type}: ${Math.round(maxSize / (1024 * 1024))}MB`);
  }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     UploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             url:
 *               type: string
 *             filename:
 *               type: string
 *             originalName:
 *               type: string
 *             size:
 *               type: integer
 *             mimeType:
 *               type: string
 *             uploadedAt:
 *               type: string
 *               format: date-time
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     summary: Upload image file
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         required: true
 *         description: Image file to upload
 *       - in: formData
 *         name: type
 *         type: string
 *         description: Image type (thumbnail, banner, etc.)
 *       - in: formData
 *         name: category
 *         type: string
 *         description: Category for organization
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Invalid file or request
 *       413:
 *         description: File too large
 */
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    console.log('POST /api/upload/image called');
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    validateFileSize(req.file, 'image');

    const fileData = {
      id: crypto.randomUUID(),
      url: getFileUrl(req, req.file.filename, 'image'),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      type: req.body.type || 'general',
      category: req.body.category || 'uncategorized'
    };

    // Save file metadata to database (optional)
    if (req.pool) {
      try {
        await req.pool.query(`
          INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, category, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          fileData.id,
          fileData.filename,
          fileData.originalName,
          req.file.path,
          fileData.size,
          fileData.mimeType,
          fileData.type,
          fileData.category,
          new Date()
        ]);
      } catch (dbError) {
        console.warn('Failed to save upload metadata to database:', dbError);
      }
    }

    res.json({
      success: true,
      data: fileData,
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload image'
    });
  }
});

/**
 * @swagger
 * /api/upload/video:
 *   post:
 *     summary: Upload video file
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: video
 *         type: file
 *         required: true
 *         description: Video file to upload
 *       - in: formData
 *         name: title
 *         type: string
 *         description: Video title
 *       - in: formData
 *         name: description
 *         type: string
 *         description: Video description
 *       - in: formData
 *         name: duration
 *         type: string
 *         description: Video duration
 *       - in: formData
 *         name: topicId
 *         type: string
 *         description: Associated topic ID
 *       - in: formData
 *         name: moduleId
 *         type: string
 *         description: Associated module ID
 *     responses:
 *       200:
 *         description: Video uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 */
router.post('/video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    validateFileSize(req.file, 'video');

    const { title, description, duration, topicId, moduleId } = req.body;

    const fileData = {
      id: crypto.randomUUID(),
      url: getFileUrl(req, req.file.filename, 'video'),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      title: title || path.basename(req.file.originalname, path.extname(req.file.originalname)),
      description: description || '',
      duration: duration || '0',
      topicId: topicId || null,
      moduleId: moduleId || null
    };

    // Save to database if topic_videos table exists
    if (req.pool && moduleId && topicId) {
      try {
        const durationSeconds = duration ? parseInt(duration) * 60 : 0;
        const videoResult = await req.pool.query(`
          INSERT INTO topic_videos (topic_id, module_id, title, description, video_url, duration_seconds, video_type, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [
          topicId,
          moduleId,
          fileData.title,
          fileData.description,
          fileData.url,
          durationSeconds,
          'mp4',
          new Date()
        ]);
        
        fileData.videoId = videoResult.rows[0].id;
      } catch (dbError) {
        console.warn('Failed to save video to database:', dbError);
      }
    }

    // Save upload metadata
    if (req.pool) {
      try {
        await req.pool.query(`
          INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          fileData.id,
          fileData.filename,
          fileData.originalName,
          req.file.path,
          fileData.size,
          fileData.mimeType,
          'video',
          JSON.stringify({ title, description, duration, topicId, moduleId }),
          new Date()
        ]);
      } catch (dbError) {
        console.warn('Failed to save upload metadata to database:', dbError);
      }
    }

    res.json({
      success: true,
      data: fileData,
      message: 'Video uploaded successfully'
    });

  } catch (error) {
    console.error('Video upload error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload video'
    });
  }
});

/**
 * @swagger
 * /api/upload/document:
 *   post:
 *     summary: Upload document file
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: document
 *         type: file
 *         required: true
 *         description: Document file to upload
 *       - in: formData
 *         name: title
 *         type: string
 *         description: Document title
 *       - in: formData
 *         name: description
 *         type: string
 *         description: Document description
 *       - in: formData
 *         name: category
 *         type: string
 *         description: Document category
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 */
router.post('/document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No document file provided'
      });
    }

    validateFileSize(req.file, 'document');

    const { title, description, category } = req.body;

    const fileData = {
      id: crypto.randomUUID(),
      url: getFileUrl(req, req.file.filename, 'document'),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      title: title || path.basename(req.file.originalname, path.extname(req.file.originalname)),
      description: description || '',
      category: category || 'general'
    };

    // Save to database
    if (req.pool) {
      try {
        await req.pool.query(`
          INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, category, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          fileData.id,
          fileData.filename,
          fileData.originalName,
          req.file.path,
          fileData.size,
          fileData.mimeType,
          'document',
          fileData.category,
          JSON.stringify({ title, description }),
          new Date()
        ]);
      } catch (dbError) {
        console.warn('Failed to save upload metadata to database:', dbError);
      }
    }

    res.json({
      success: true,
      data: fileData,
      message: 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload document'
    });
  }
});

/**
 * @swagger
 * /api/upload/thumbnail:
 *   post:
 *     summary: Upload thumbnail image
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: thumbnail
 *         type: file
 *         required: true
 *         description: Thumbnail image file
 *       - in: formData
 *         name: videoId
 *         type: string
 *         description: Associated video ID
 *       - in: formData
 *         name: topicId
 *         type: string
 *         description: Associated topic ID
 *     responses:
 *       200:
 *         description: Thumbnail uploaded successfully
 */
router.post('/thumbnail', upload.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No thumbnail file provided'
      });
    }

    validateFileSize(req.file, 'thumbnail');

    const { videoId, topicId } = req.body;

    const fileData = {
      id: crypto.randomUUID(),
      url: getFileUrl(req, req.file.filename, 'thumbnail'),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      videoId: videoId || null,
      topicId: topicId || null
    };

    // Update associated video or topic with thumbnail
    if (req.pool) {
      try {
        if (videoId) {
          await req.pool.query(
            'UPDATE topic_videos SET thumbnail_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [fileData.url, videoId]
          );
        }
        
        if (topicId) {
          await req.pool.query(
            'UPDATE topics SET thumbnail_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [fileData.url, topicId]
          );
        }

        // Save upload metadata
        await req.pool.query(`
          INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          fileData.id,
          fileData.filename,
          fileData.originalName,
          req.file.path,
          fileData.size,
          fileData.mimeType,
          'thumbnail',
          JSON.stringify({ videoId, topicId }),
          new Date()
        ]);
      } catch (dbError) {
        console.warn('Failed to update database with thumbnail:', dbError);
      }
    }

    res.json({
      success: true,
      data: fileData,
      message: 'Thumbnail uploaded successfully'
    });

  } catch (error) {
    console.error('Thumbnail upload error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload thumbnail'
    });
  }
});

/**
 * @swagger
 * /api/upload/topics/{topicId}/modules/{moduleId}/video:
 *   post:
 *     summary: Upload video to specific topic module
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *       - in: formData
 *         name: video
 *         type: file
 *         required: true
 *         description: Video file to upload
 *       - in: formData
 *         name: title
 *         type: string
 *         required: true
 *         description: Video title
 *       - in: formData
 *         name: description
 *         type: string
 *         description: Video description
 *       - in: formData
 *         name: duration
 *         type: string
 *         description: Video duration in minutes
 *       - in: formData
 *         name: order
 *         type: integer
 *         description: Video order in module
 *     responses:
 *       200:
 *         description: Video uploaded successfully
 */
router.post('/topics/:topicId/modules/:moduleId/video', upload.single('video'), async (req, res) => {
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

    validateFileSize(req.file, 'video');

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
      url: getFileUrl(req, req.file.filename, 'video'),
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
          INSERT INTO topic_videos (topic_id, module_id, title, description, video_url, duration_seconds, video_type, order_index, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
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
        
        videoId = videoResult.rows[0].id;
        fileData.videoId = videoId;

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

      } catch (dbError) {
        console.error('Failed to save video to database:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Failed to save video to database'
        });
      }
    }

    // Save upload metadata
    if (req.pool) {
      try {
        await req.pool.query(`
          INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          fileData.id,
          fileData.filename,
          fileData.originalName,
          req.file.path,
          fileData.size,
          fileData.mimeType,
          'video',
          JSON.stringify({ 
            title: fileData.title, 
            description: fileData.description, 
            duration: fileData.duration, 
            topicId, 
            moduleId,
            videoId,
            order: fileData.order
          }),
          new Date()
        ]);
      } catch (dbError) {
        console.warn('Failed to save upload metadata to database:', dbError);
      }
    }

    res.json({
      success: true,
      data: {
        ...fileData,
        videoId,
        durationSeconds: duration ? parseFloat(duration) * 60 : 0
      },
      message: 'Video uploaded successfully to module'
    });

  } catch (error) {
    console.error('Topic video upload error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload video to module'
    });
  }
});

/**
 * @swagger
 * /api/upload/topics/{topicId}/thumbnail:
 *   post:
 *     summary: Upload thumbnail for topic
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *       - in: formData
 *         name: thumbnail
 *         type: file
 *         required: true
 *         description: Thumbnail image file
 *     responses:
 *       200:
 *         description: Thumbnail uploaded successfully
 */
router.post('/topics/:topicId/thumbnail', upload.single('thumbnail'), async (req, res) => {
  try {
    const { topicId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No thumbnail file provided'
      });
    }

    validateFileSize(req.file, 'thumbnail');

    // Verify topic exists
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
    }

    const fileData = {
      id: crypto.randomUUID(),
      url: getFileUrl(req, req.file.filename, 'thumbnail'),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      topicId: topicId
    };

    // Update topic with thumbnail
    if (req.pool) {
      try {
        await req.pool.query(
          'UPDATE topics SET thumbnail_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [fileData.url, topicId]
        );

        // Save upload metadata
        await req.pool.query(`
          INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          fileData.id,
          fileData.filename,
          fileData.originalName,
          req.file.path,
          fileData.size,
          fileData.mimeType,
          'thumbnail',
          JSON.stringify({ topicId }),
          new Date()
        ]);
      } catch (dbError) {
        console.error('Failed to update topic with thumbnail:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update topic with thumbnail'
        });
      }
    }

    res.json({
      success: true,
      data: fileData,
      message: 'Topic thumbnail uploaded successfully'
    });

  } catch (error) {
    console.error('Topic thumbnail upload error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload topic thumbnail'
    });
  }
});

/**
 * @swagger
 * /api/upload/videos/{videoId}/thumbnail:
 *   post:
 *     summary: Upload thumbnail for video
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *       - in: formData
 *         name: thumbnail
 *         type: file
 *         required: true
 *         description: Thumbnail image file
 *     responses:
 *       200:
 *         description: Video thumbnail uploaded successfully
 */
router.post('/videos/:videoId/thumbnail', upload.single('thumbnail'), async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No thumbnail file provided'
      });
    }

    validateFileSize(req.file, 'thumbnail');

    // Verify video exists
    if (req.pool) {
      const videoCheck = await req.pool.query(
        'SELECT id FROM topic_videos WHERE id = $1',
        [videoId]
      );
      
      if (videoCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        });
      }
    }

    const fileData = {
      id: crypto.randomUUID(),
      url: getFileUrl(req, req.file.filename, 'thumbnail'),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      videoId: videoId
    };

    // Update video with thumbnail
    if (req.pool) {
      try {
        await req.pool.query(
          'UPDATE topic_videos SET thumbnail_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [fileData.url, videoId]
        );

        // Save upload metadata
        await req.pool.query(`
          INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          fileData.id,
          fileData.filename,
          fileData.originalName,
          req.file.path,
          fileData.size,
          fileData.mimeType,
          'thumbnail',
          JSON.stringify({ videoId }),
          new Date()
        ]);
      } catch (dbError) {
        console.error('Failed to update video with thumbnail:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update video with thumbnail'
        });
      }
    }

    res.json({
      success: true,
      data: fileData,
      message: 'Video thumbnail uploaded successfully'
    });

  } catch (error) {
    console.error('Video thumbnail upload error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload video thumbnail'
    });
  }
});

/**
 * @swagger
 * /api/upload/bulk:
 *   post:
 *     summary: Upload multiple files
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: files
 *         type: array
 *         items:
 *           type: file
 *         required: true
 *         description: Multiple files to upload
 *       - in: formData
 *         name: type
 *         type: string
 *         description: Upload type for all files
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 */
router.post('/bulk', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided'
      });
    }

    const uploadType = req.body.type || 'general';
    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        validateFileSize(file, uploadType);

        const fileData = {
          id: crypto.randomUUID(),
          url: getFileUrl(req, file.filename, uploadType),
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date().toISOString()
        };

        // Save to database
        if (req.pool) {
          try {
            await req.pool.query(`
              INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              fileData.id,
              fileData.filename,
              fileData.originalName,
              file.path,
              fileData.size,
              fileData.mimeType,
              uploadType,
              new Date()
            ]);
          } catch (dbError) {
            console.warn('Failed to save upload metadata:', dbError);
          }
        }

        results.push(fileData);
      } catch (fileError) {
        errors.push({
          filename: file.originalname,
          error: fileError.message
        });
      }
    }

    const response = {
      success: true,
      data: {
        uploaded: results,
        errors: errors,
        totalUploaded: results.length,
        totalErrors: errors.length
      },
      message: `Bulk upload completed: ${results.length} files uploaded successfully${errors.length > 0 ? `, ${errors.length} files failed` : ''}`
    };

    res.json(response);

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload files'
    });
  }
});

/**
 * @swagger
 * /api/upload/videos/{videoId}/replace:
 *   put:
 *     summary: Replace existing video file
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID to replace
 *       - in: formData
 *         name: video
 *         type: file
 *         required: true
 *         description: New video file
 *       - in: formData
 *         name: title
 *         type: string
 *         description: Updated video title
 *       - in: formData
 *         name: description
 *         type: string
 *         description: Updated video description
 *       - in: formData
 *         name: duration
 *         type: string
 *         description: Updated video duration in minutes
 *     responses:
 *       200:
 *         description: Video replaced successfully
 */
router.put('/videos/:videoId/replace', upload.single('video'), async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, description, duration } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    validateFileSize(req.file, 'video');

    // Get existing video info
    let existingVideo = null;
    if (req.pool) {
      const videoResult = await req.pool.query(
        'SELECT * FROM topic_videos WHERE id = $1',
        [videoId]
      );
      
      if (videoResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        });
      }
      
      existingVideo = videoResult.rows[0];
    }

    const fileData = {
      id: crypto.randomUUID(),
      url: getFileUrl(req, req.file.filename, 'video'),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      title: title?.trim() || existingVideo?.title,
      description: description?.trim() || existingVideo?.description || '',
      duration: duration || (existingVideo?.duration_seconds / 60).toString(),
      videoId: videoId
    };

    // Update video in database
    if (req.pool) {
      try {
        const durationSeconds = duration ? parseFloat(duration) * 60 : existingVideo?.duration_seconds || 0;
        
        await req.pool.query(`
          UPDATE topic_videos 
          SET 
            title = $1,
            description = $2,
            video_url = $3,
            duration_seconds = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [
          fileData.title,
          fileData.description,
          fileData.url,
          durationSeconds,
          videoId
        ]);

        // Update module duration
        if (existingVideo?.module_id) {
          await req.pool.query(`
            UPDATE topic_modules 
            SET duration_minutes = (
              SELECT COALESCE(SUM(duration_seconds), 0) / 60 
              FROM topic_videos 
              WHERE module_id = $1
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [existingVideo.module_id]);

          // Update topic duration
          const moduleResult = await req.pool.query(
            'SELECT topic_id FROM topic_modules WHERE id = $1',
            [existingVideo.module_id]
          );
          
          if (moduleResult.rows.length > 0) {
            await req.pool.query(`
              UPDATE topics 
              SET duration_minutes = (
                SELECT COALESCE(SUM(tm.duration_minutes), 0)
                FROM topic_modules tm 
                WHERE tm.topic_id = $1
              ),
              updated_at = CURRENT_TIMESTAMP
              WHERE id = $1
            `, [moduleResult.rows[0].topic_id]);
          }
        }

        // Save upload metadata
        await req.pool.query(`
          INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          fileData.id,
          fileData.filename,
          fileData.originalName,
          req.file.path,
          fileData.size,
          fileData.mimeType,
          'video',
          JSON.stringify({ 
            videoId,
            action: 'replace',
            title: fileData.title, 
            description: fileData.description, 
            duration: fileData.duration,
            moduleId: existingVideo?.module_id
          }),
          new Date()
        ]);

        fileData.durationSeconds = durationSeconds;

      } catch (dbError) {
        console.error('Failed to update video in database:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update video in database'
        });
      }
    }

    res.json({
      success: true,
      data: fileData,
      message: 'Video replaced successfully'
    });

  } catch (error) {
    console.error('Video replace error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to replace video'
    });
  }
});

/**
 * @swagger
 * /api/upload/files:
 *   get:
 *     summary: Get uploaded files list
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by upload type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Files list retrieved successfully
 */
router.get('/files', async (req, res) => {
  try {
    if (!req.pool) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const { type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM uploads';
    let countQuery = 'SELECT COUNT(*) as total FROM uploads';
    const queryParams = [];
    let paramIndex = 1;

    if (type) {
      query += ' WHERE upload_type = $' + paramIndex;
      countQuery += ' WHERE upload_type = $' + paramIndex;
      queryParams.push(type);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
    queryParams.push(parseInt(limit), offset);

    const [filesResult, countResult] = await Promise.all([
      req.pool.query(query, queryParams),
      req.pool.query(countQuery, type ? [type] : [])
    ]);

    const files = filesResult.rows.map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.original_name,
      url: getFileUrl(req, file.filename, file.upload_type),
      size: file.file_size,
      mimeType: file.mime_type,
      type: file.upload_type,
      category: file.category,
      uploadedAt: file.created_at?.toISOString()
    }));

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: files,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      },
      message: `Retrieved ${files.length} files`
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve files'
    });
  }
});

/**
 * @swagger
 * /api/upload/files/{id}:
 *   delete:
 *     summary: Delete uploaded file
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 */
router.delete('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.pool) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    // Get file info
    const fileResult = await req.pool.query(
      'SELECT * FROM uploads WHERE id = $1',
      [id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const file = fileResult.rows[0];

    // Delete physical file
    try {
      await fs.unlink(file.file_path);
    } catch (fsError) {
      console.warn('Failed to delete physical file:', fsError);
    }

    // Delete from database
    await req.pool.query('DELETE FROM uploads WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete file'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Upload route error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files'
      });
    }
  }

  res.status(400).json({
    success: false,
    error: error.message || 'Upload failed'
  });
});

// Simple test endpoint to verify router is loaded
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Upload router is working!' });
});

module.exports = router;
