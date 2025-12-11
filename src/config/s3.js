const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Configure S3 client for iBee.ai storage
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for S3-compatible storage
});

const bucketName = process.env.S3_BUCKET_NAME;

module.exports = {
  s3Client,
  bucketName
};
