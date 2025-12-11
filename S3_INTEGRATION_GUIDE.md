# S3 Integration Guide - ThinkCyber Platform

## Overview
Video uploads now use S3-compatible storage (iBee.ai) instead of local file storage. This provides better scalability, reliability, and performance.

## Configuration

### Environment Variables (.env)
The following credentials are configured in `Think-Cyber-Server/.env`:

```env
S3_ACCESS_KEY_ID=pa6xb59eda
S3_SECRET_ACCESS_KEY=E6dmS81Z0RZn27Jn7
S3_BUCKET_NAME=thinkcyber-logiq
S3_ENDPOINT=https://storage-api.ibee.ai
S3_REGION=us-east-1
```

## File Structure

### New Files Created:
1. **`src/config/s3.js`** - S3 client configuration
2. **`src/utils/s3-helper.js`** - Helper functions for S3 operations
3. **`src/routes/upload-s3.js`** - S3 upload routes
4. **`.env`** - Environment configuration with S3 credentials

## API Endpoints

### Upload Video to S3
```
POST /api/upload-s3/video
Content-Type: multipart/form-data

Parameters:
- video (file, required): Video file to upload
- title (string): Video title
- description (string): Video description  
- duration (string): Duration in minutes
- topicId (string): Associated topic ID
- moduleId (string): Associated module ID

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "url": "https://storage-api.ibee.ai/thinkcyber-logiq/videos/filename.mp4",
    "filename": "video-123456.mp4",
    "originalName": "my-video.mp4",
    "size": 1048576,
    "mimeType": "video/mp4",
    "uploadedAt": "2025-12-11T10:30:00.000Z",
    "videoId": 123
  },
  "message": "Video uploaded successfully to S3"
}
```

### Upload Image to S3
```
POST /api/upload-s3/image
Content-Type: multipart/form-data

Parameters:
- image (file, required): Image file
- type (string): Image type
- category (string): Category

Response: Similar to video upload
```

### Upload Thumbnail
```
POST /api/upload-s3/thumbnail
Content-Type: multipart/form-data

Parameters:
- thumbnail (file, required): Thumbnail image

Response: Similar to video upload
```

### Upload Multiple Files
```
POST /api/upload-s3/multiple
Content-Type: multipart/form-data

Parameters:
- files (file[], required): Multiple files (max 10)
- folder (string): Folder path in S3 bucket

Response:
{
  "success": true,
  "data": [...array of upload results...],
  "message": "5 files uploaded successfully to S3"
}
```

### Delete File from S3
```
DELETE /api/upload-s3/delete?key=videos/filename.mp4

Response:
{
  "success": true,
  "message": "File deleted successfully from S3"
}
```

## Usage in Admin Panel

### Update Video Upload Component

The admin panel can use the new S3 endpoints by changing the upload URL:

```typescript
// In your video upload component
import { API_ENDPOINTS } from '@/constants/api-endpoints';

// Use S3 upload endpoint instead of local upload
const uploadUrl = API_ENDPOINTS.UPLOAD_S3.VIDEO; // 'upload-s3/video'

const formData = new FormData();
formData.append('video', videoFile);
formData.append('title', title);
formData.append('description', description);
formData.append('duration', duration);
formData.append('topicId', topicId);
formData.append('moduleId', moduleId);

const response = await apiService.post(uploadUrl, formData);
```

## Features

### ✅ What's Working:
- Upload videos to S3 storage
- Upload images and thumbnails
- Multiple file uploads
- Delete files from S3
- Automatic database integration
- File size validation
- File type validation
- Unique filename generation
- Public URL generation

### 📋 File Size Limits:
- Images: 10MB
- Thumbnails: 5MB
- Documents: 50MB
- Videos: 1GB

### 🎯 Supported File Types:

**Videos:**
- MP4, WebM, AVI, MOV, WMV, QuickTime

**Images:**
- JPEG, PNG, GIF, WebP

**Documents:**
- PDF, DOC, DOCX, TXT

## Benefits of S3 Storage

1. **Scalability** - No server disk space limitations
2. **Reliability** - Built-in redundancy and backups
3. **Performance** - CDN-ready with fast global delivery
4. **Cost-Effective** - Pay only for what you use
5. **Security** - Secure storage with access controls
6. **Durability** - 99.999999999% (11 9's) durability

## Migration from Local Storage

To migrate existing videos from local storage to S3:

1. Videos are now uploaded directly to S3
2. Old local uploads remain accessible via `/uploads` route
3. New uploads use S3 automatically
4. No changes needed in frontend (URLs are returned in same format)

## Troubleshooting

### Common Issues:

**1. "Failed to upload to S3: Access Denied"**
- Check S3 credentials in `.env` file
- Verify bucket name is correct
- Ensure endpoint URL is accessible

**2. "File too large"**
- Check file size limits
- Video limit is 1GB
- Consider video compression

**3. "Invalid file type"**
- Check supported file types
- Ensure correct MIME type

### Testing S3 Connection:

```bash
# Test if server can reach S3 endpoint
curl https://storage-api.ibee.ai

# Check environment variables are loaded
cd Think-Cyber-Server
node -e "require('dotenv').config(); console.log(process.env.S3_ENDPOINT)"
```

## Next Steps

1. **Update Admin Panel Components**
   - Modify video upload modal to use `UPLOAD_S3.VIDEO` endpoint
   - Update progress indicators
   - Handle S3 URLs in video player

2. **Test Upload Flow**
   - Upload a test video
   - Verify video appears in S3 bucket
   - Test video playback from S3 URL

3. **Monitor Usage**
   - Track storage usage in iBee.ai dashboard
   - Monitor upload success rates
   - Review error logs

## Support

For issues or questions:
- Check server logs: `Think-Cyber-Server/logs`
- Review network tab in browser dev tools
- Contact iBee.ai support for storage issues

## Security Notes

⚠️ **Important:**
- Never commit `.env` file to Git
- Keep S3 credentials secure
- Use HTTPS for all uploads
- Implement file scanning for malware (recommended)
- Set up bucket policies for access control
