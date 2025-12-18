const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, bucketName } = require('../config/s3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Get video duration using ffprobe (DURATION-SAFE version)
 * @param {string} filePath - Path to video file
 * @returns {Promise<number>} Duration in seconds
 */
async function getVideoDurationFromPath(filePath) {
  try {
    // Verify file exists FIRST
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    // FFProbe command with timeout and absolute path
    const command = `/usr/bin/ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`;
    const output = execSync(command, {
      timeout: 10000, // 10s timeout
      encoding: 'utf8',
      stdio: 'pipe'
    });

    const duration = parseFloat(output.trim());
    if (isNaN(duration) || duration <= 0) {
      throw new Error(`Invalid duration: ${duration}`);
    }

    return Math.round(duration);
  } catch (error) {
    console.error(`FFProbe failed for ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Upload file to S3 using multipart upload (BUFFER version)
 */
async function uploadToS3(fileBuffer, originalFilename, mimeType, folder = 'general') {
  try {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(originalFilename);
    const name = path.basename(originalFilename, ext);
    const key = `${folder}/${name}-${uniqueSuffix}${ext}`;

    const parallelUploads3 = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: 'public-read',
      },
    });

    await parallelUploads3.done();
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
 * Upload file from disk path to S3 (STREAM version - FIXED for duration safety)
 * ⚠️ CALL getVideoDurationFromPath() BEFORE this function!
 */
async function uploadFileToS3(filePath, originalFilename, mimeType, folder = 'general') {
  try {
    // Double-check file exists (safety after duration check)
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const fileStream = fs.createReadStream(filePath);

    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(originalFilename);
    const name = path.basename(originalFilename, ext);
    const key = `${folder}/${name}-${uniqueSuffix}${ext}`;

    const parallelUploads3 = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
        ContentType: mimeType,
        ACL: 'public-read',
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
      leavePartsOnError: false,
    });

    parallelUploads3.on('httpUploadProgress', (progress) => {
      // Progress logging optional
    });

    await parallelUploads3.done();
    const publicUrl = `${process.env.S3_ENDPOINT}/${bucketName}/${key}`;

    return {
      success: true,
      url: publicUrl,
      key: key,
      filename: `${name}-${uniqueSuffix}${ext}`,
      originalName: originalFilename,
      size: fileSize,
      mimeType: mimeType
    };
  } catch (error) {
    console.error('S3 file upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
}

/**
 * Delete file from S3
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
  uploadFileToS3,
  getVideoDurationFromPath,  // ← NEW: Use this FIRST in upload routes
  deleteFromS3,
  getPresignedUrl,
  uploadMultipleToS3
};
