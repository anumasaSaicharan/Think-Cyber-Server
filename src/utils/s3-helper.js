const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, bucketName } = require('../config/s3');
const crypto = require('crypto');
const path = require('path');

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} originalFilename - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} folder - Folder path in bucket (e.g., 'videos', 'images')
 * @returns {Promise<object>} Upload result with URL
 */
async function uploadToS3(fileBuffer, originalFilename, mimeType, folder = 'general') {
  try {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(originalFilename);
    const name = path.basename(originalFilename, ext);
    const key = `${folder}/${name}-${uniqueSuffix}${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'public-read', // Make file publicly accessible
    });

    await s3Client.send(command);

    // Construct public URL
    const publicUrl = `${process.env.S3_ENDPOINT}/${bucketName}/${key}`;

    return {
      success: true,
      url: publicUrl,
      key: key,
      filename: `${name}-${uniqueSuffix}${ext}`,
      originalName: originalFilename,
      size: fileBuffer.length,
      mimeType: mimeType
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
}

/**
 * Delete file from S3
 * @param {string} key - File key in S3
 * @returns {Promise<boolean>} Success status
 */
async function deleteFromS3(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error(`Failed to delete from S3: ${error.message}`);
  }
}

/**
 * Generate presigned URL for temporary access
 * @param {string} key - File key in S3
 * @param {number} expiresIn - URL expiration in seconds (default: 3600)
 * @returns {Promise<string>} Presigned URL
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('S3 presigned URL error:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
}

/**
 * Upload multiple files to S3
 * @param {Array<{buffer: Buffer, filename: string, mimeType: string}>} files - Array of files
 * @param {string} folder - Folder path in bucket
 * @returns {Promise<Array<object>>} Upload results
 */
async function uploadMultipleToS3(files, folder = 'general') {
  try {
    const uploadPromises = files.map(file => 
      uploadToS3(file.buffer, file.filename, file.mimeType, folder)
    );
    
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('S3 multiple upload error:', error);
    throw new Error(`Failed to upload multiple files to S3: ${error.message}`);
  }
}

module.exports = {
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
  uploadMultipleToS3
};
