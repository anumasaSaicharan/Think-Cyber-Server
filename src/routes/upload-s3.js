const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { uploadToS3, deleteFromS3, uploadMultipleToS3 } = require('../utils/s3-helper');
const router = express.Router();

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// File type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/wmv', 'video/quicktime'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    thumbnail: ['image/jpeg', 'image/png', 'image/webp']
  };

  const uploadType = req.body.uploadType || req.path.split('/')[1] || 'general';
  const allowed = allowedTypes[uploadType] || [...allowedTypes.image, ...allowedTypes.video, ...allowedTypes.document];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowed.join(', ')}`), false);
  }
};

// File size limits (in bytes)
const fileLimits = {
  image: 10 * 1024 * 1024, // 10MB
  video: 1000 * 1024 * 1024, // 1GB
  document: 50 * 1024 * 1024, // 50MB
  thumbnail: 5 * 1024 * 1024 // 5MB
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1000 * 1024 * 1024 // 1GB max
  }
});

// Helper function to validate file size
const validateFileSize = (file, type) => {
  const maxSize = fileLimits[type] || fileLimits.document;
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size for ${type}: ${Math.round(maxSize / (1024 * 1024))}MB`);
  }
};

/**
 * @swagger
 * /api/upload-s3/image:
 *   post:
 *     summary: Upload image to S3
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         required: true
 *         description: Image file to upload
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 */
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    console.log('POST /api/upload-s3/image called');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    validateFileSize(req.file, 'image');

    // Upload to S3
    const result = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'images'
    );

    const fileData = {
      id: crypto.randomUUID(),
      ...result,
      uploadedAt: new Date().toISOString(),
      type: req.body.type || 'general',
      category: req.body.category || 'uncategorized'
    };

    // Save metadata to database (optional)
    if (req.pool) {
      try {
        await req.pool.query(`
          INSERT INTO uploads (id, filename, original_name, file_path, file_size, mime_type, upload_type, category, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          fileData.id,
          fileData.filename,
          fileData.originalName,
          result.key,
          fileData.size,
          fileData.mimeType,
          'image',
          fileData.category,
          new Date()
        ]);
      } catch (dbError) {
        console.warn('Failed to save upload metadata to database:', dbError.message);
      }
    }

    res.json({
      success: true,
      data: fileData,
      message: 'Image uploaded successfully to S3'
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
 * /api/upload-s3/video:
 *   post:
 *     summary: Upload video to S3
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
 *         description: Video duration in minutes
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
 */
router.post('/video', upload.single('video'), async (req, res) => {
  try {
    console.log('POST /api/upload-s3/video called');
    console.log('File:', req.file ? `${req.file.originalname} (${Math.round(req.file.size / 1024 / 1024)}MB)` : 'No file');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    validateFileSize(req.file, 'video');

    const { title, description, duration, topicId, moduleId } = req.body;

    console.log('Uploading to S3...', {
      filename: req.file.originalname,
      size: `${Math.round(req.file.size / 1024 / 1024)}MB`,
      topicId,
      moduleId
    });

    // Upload to S3
    const result = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'videos'
    );

    console.log('S3 upload successful:', result.url);

    const fileData = {
      id: crypto.randomUUID(),
      ...result,
      uploadedAt: new Date().toISOString(),
      title: title || req.file.originalname,
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
          INSERT INTO topic_videos (topic_id, module_id, title, description, video_url, duration_seconds, video_type, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `, [
          topicId,
          moduleId,
          fileData.title,
          fileData.description,
          result.url,  // S3 URL
          durationSeconds,
          'mp4',
          new Date(),
          new Date()
        ]);
        
        fileData.videoId = videoResult.rows[0].id;
        console.log('Video saved to database with ID:', fileData.videoId);
      } catch (dbError) {
        console.error('Failed to save video to database:', dbError);
        // Don't fail the request, video is already uploaded to S3
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
          result.key,  // S3 key
          fileData.size,
          fileData.mimeType,
          'video',
          JSON.stringify({ title, description, duration, topicId, moduleId }),
          new Date()
        ]);
      } catch (dbError) {
        console.warn('Failed to save upload metadata to database:', dbError.message);
      }
    }

    res.json({
      success: true,
      data: fileData,
      message: 'Video uploaded successfully to S3'
    });

  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload video'
    });
  }
});

/**
 * @swagger
 * /api/upload-s3/thumbnail:
 *   post:
 *     summary: Upload thumbnail to S3
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: thumbnail
 *         type: file
 *         required: true
 *         description: Thumbnail image file
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

    // Upload to S3
    const result = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'thumbnails'
    );

    const fileData = {
      id: crypto.randomUUID(),
      ...result,
      uploadedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: fileData,
      message: 'Thumbnail uploaded successfully to S3'
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
 * /api/upload-s3/multiple:
 *   post:
 *     summary: Upload multiple files to S3
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
 *         name: folder
 *         type: string
 *         description: Folder path in S3 bucket
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 */
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided'
      });
    }

    const folder = req.body.folder || 'general';
    
    // Prepare files for upload
    const filesToUpload = req.files.map(file => ({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype
    }));

    // Upload all files to S3
    const results = await uploadMultipleToS3(filesToUpload, folder);

    res.json({
      success: true,
      data: results,
      message: `${results.length} files uploaded successfully to S3`
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload files'
    });
  }
});

/**
 * @swagger
 * /api/upload-s3/delete:
 *   delete:
 *     summary: Delete file from S3
 *     parameters:
 *       - in: query
 *         name: key
 *         type: string
 *         required: true
 *         description: S3 file key to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 */
router.delete('/delete', async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'File key is required'
      });
    }

    await deleteFromS3(key);

    res.json({
      success: true,
      message: 'File deleted successfully from S3'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete file'
    });
  }
});

module.exports = router;
