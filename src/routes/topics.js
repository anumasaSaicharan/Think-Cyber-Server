const express = require('express');
const router = express.Router();

// Helper function to format topic data consistently
function formatTopicData(topic, modules = []) {
  // Create slugs from names if needed, but keep the original IDs
  const categorySlug = topic.category_slug || (topic.category_name ? generateSlug(topic.category_name) : null);
  const subcategorySlug = topic.subcategory_slug || (topic.subcategory_name ? generateSlug(topic.subcategory_name) : null);
  
  return {
    id: topic.id,
    title: topic.title,
    description: topic.description,
    content: topic.content,
    slug: topic.slug,
    categoryId: topic.category_id,
    subcategoryId: topic.subcategory_id,
    category: topic.category_id ? topic.category_id.toString() : null, // Return category ID as string
    subcategory: topic.subcategory_id ? topic.subcategory_id.toString() : null, // Return subcategory ID as string
    categoryName: topic.category_name, // Also include names for reference
    subcategoryName: topic.subcategory_name,
    difficulty: topic.difficulty,
    status: topic.status,
    isFeatured: topic.is_featured,
    featured: topic.is_featured, // Alternative field name
    isFree: topic.is_free,
    price: parseFloat(topic.price || 0),
    durationMinutes: topic.duration_minutes,
    duration: topic.duration_minutes ? (topic.duration_minutes / 60).toFixed(1) : "0", // Convert to hours
    thumbnailUrl: topic.thumbnail_url,
    thumbnail: topic.thumbnail_url, // Alternative field name
    tags: topic.tags || [],
    metaTitle: topic.meta_title,
    metaDescription: topic.meta_description,
    metaKeywords: topic.meta_keywords,
    authorId: topic.author_id,
    emoji: topic.emoji,
    learningObjectives: topic.learning_objectives,
    targetAudience: topic.target_audience || [],
    prerequisites: topic.prerequisites,
    publishedAt: topic.published_at?.toISOString(),
    viewCount: topic.view_count,
    likeCount: topic.like_count,
    enrollmentCount: topic.enrollment_count,
    rating: topic.rating, // This might come from joins
    reviewCount: topic.review_count, // This might come from joins
    createdAt: topic.created_at?.toISOString(),
    updatedAt: topic.updated_at?.toISOString(),
    modules: modules || []
  };
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Topic:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "Introduction to Ethical Hacking"
 *         description:
 *           type: string
 *           example: "Learn the fundamentals of ethical hacking"
 *         content:
 *           type: string
 *           example: "This comprehensive course covers..."
 *         slug:
 *           type: string
 *           example: "introduction-to-ethical-hacking"
 *         categoryId:
 *           type: integer
 *           example: 1
 *         subcategoryId:
 *           type: integer
 *           example: 1
 *         difficulty:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *           example: "beginner"
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *           example: "published"
 *         isFeatured:
 *           type: boolean
 *           example: true
 *         isFree:
 *           type: boolean
 *           example: true
 *         price:
 *           type: number
 *           example: 49.99
 *         durationMinutes:
 *           type: integer
 *           example: 180
 *         thumbnailUrl:
 *           type: string
 *           example: "https://example.com/thumbnail.jpg"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["hacking", "security"]
 *         viewCount:
 *           type: integer
 *           example: 1250
 *         enrollmentCount:
 *           type: integer
 *           example: 85
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
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
 *           example: "Getting Started"
 *         description:
 *           type: string
 *           example: "Introduction module"
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
 *           example: "Introduction Video"
 *         description:
 *           type: string
 *           example: "Welcome to the course"
 *         videoUrl:
 *           type: string
 *           example: "https://example.com/video.mp4"
 *         videoType:
 *           type: string
 *           enum: [mp4, youtube, vimeo, stream]
 *           example: "mp4"
 *         durationSeconds:
 *           type: integer
 *           example: 300
 *         orderIndex:
 *           type: integer
 *           example: 1
 *         isPreview:
 *           type: boolean
 *           example: false
 */

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * @swagger
 * /api/topics:
 *   get:
 *     summary: Get all topics with pagination and filters
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *         description: Filter by difficulty
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: integer
 *         description: Filter by subcategory ID
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter featured topics
 *       - in: query
 *         name: free
 *         schema:
 *           type: boolean
 *         description: Filter free topics
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: Topics retrieved successfully
 *   post:
 *     summary: Create a new topic
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Topic'
 *     responses:
 *       201:
 *         description: Topic created successfully
 */

// GET /api/topics - List all topics with filters and pagination
router.get('/topics', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      difficulty,
      category,
      subcategory,
      featured,
      free,
      search,
      tag,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereConditions = [];
    const queryParams = [];
    let paramCount = 1;

    // Build WHERE conditions
    if (status) {
      whereConditions.push(`t.status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }

    if (difficulty) {
      whereConditions.push(`t.difficulty = $${paramCount}`);
      queryParams.push(difficulty);
      paramCount++;
    }

    if (category) {
      whereConditions.push(`t.category_id = $${paramCount}`);
      queryParams.push(parseInt(category));
      paramCount++;
    }

    if (subcategory) {
      whereConditions.push(`t.subcategory_id = $${paramCount}`);
      queryParams.push(parseInt(subcategory));
      paramCount++;
    }

    if (featured !== undefined) {
      whereConditions.push(`t.is_featured = $${paramCount}`);
      queryParams.push(featured === 'true');
      paramCount++;
    }

    if (free !== undefined) {
      whereConditions.push(`t.is_free = $${paramCount}`);
      queryParams.push(free === 'true');
      paramCount++;
    }

    if (search) {
      whereConditions.push(`(t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (tag) {
      whereConditions.push(`t.tags ? $${paramCount}`);
      queryParams.push(tag);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Valid sort columns
    const validSortColumns = ['created_at', 'updated_at', 'title', 'view_count', 'enrollment_count', 'published_at'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Main query
    const query = `
      SELECT 
        t.*,
        c.name as category_name,
        sc.name as subcategory_name,
        COUNT(*) OVER() as total_count
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      ${whereClause}
      ORDER BY t.${sortColumn} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await req.pool.query(query, queryParams);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    const topics = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      content: row.content,
      slug: row.slug,
      categoryId: row.category_id,
      categoryName: row.category_name,
      subcategoryId: row.subcategory_id,
      subcategoryName: row.subcategory_name,
      difficulty: row.difficulty,
      status: row.status,
      isFeatured: row.is_featured,
      isFree: row.is_free,
      price: parseFloat(row.price || 0),
      durationMinutes: row.duration_minutes,
      thumbnailUrl: row.thumbnail_url,
      tags: row.tags || [],
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      metaKeywords: row.meta_keywords,
      authorId: row.author_id,
      publishedAt: row.published_at?.toISOString(),
      viewCount: row.view_count,
      likeCount: row.like_count,
      enrollmentCount: row.enrollment_count,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    }));

    res.json({
      success: true,
      data: topics,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (err) {
    console.error('Error in GET /topics:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// POST /api/topics - Create new topic
router.post('/topics', async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      categoryId,
      subcategoryId,
      category, // Handle category slug
      subcategory, // Handle subcategory slug
      difficulty = 'beginner',
      status = 'draft',
      isFeatured = false,
      featured, // Alternative field name
      isFree = true,
      price = 0,
      duration, // Handle duration as string
      durationMinutes = 0,
      thumbnailUrl,
      thumbnail, // Alternative field name
      tags = [],
      metaTitle,
      metaDescription,
      metaKeywords,
      authorId,
      emoji,
      learningObjectives,
      targetAudience = [],
      prerequisites,
      modules = [] // Add modules support
    } = req.body;

    // Validation
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Handle alternative field names
    const finalIsFeatured = featured !== undefined ? featured : isFeatured;
    const finalThumbnailUrl = thumbnail || thumbnailUrl;
    
    // Convert duration string to minutes if needed
    let finalDurationMinutes = durationMinutes;
    if (duration && typeof duration === 'string') {
      const durationFloat = parseFloat(duration);
      if (!isNaN(durationFloat)) {
        finalDurationMinutes = Math.round(durationFloat * 60); // Convert hours to minutes
      }
    }

    // Resolve category and subcategory IDs from slugs if needed
    let finalCategoryId = categoryId;
    let finalSubcategoryId = subcategoryId;

    if (!finalCategoryId && category && typeof category === 'string') {
      // Try to find by name first, or convert slug to name-like format
      const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      let categoryResult = await req.pool.query('SELECT id FROM category WHERE LOWER(name) = LOWER($1)', [categoryName]);
      
      // If not found by converted name, try original slug as name
      if (categoryResult.rows.length === 0) {
        categoryResult = await req.pool.query('SELECT id FROM category WHERE LOWER(name) = LOWER($1)', [category]);
      }
      
      // If still not found, try partial match
      if (categoryResult.rows.length === 0) {
        categoryResult = await req.pool.query('SELECT id FROM category WHERE LOWER(name) LIKE LOWER($1)', [`%${category.replace(/-/g, '%')}%`]);
      }
      
      if (categoryResult.rows.length > 0) {
        finalCategoryId = categoryResult.rows[0].id;
      }
    }

    if (!finalSubcategoryId && subcategory && typeof subcategory === 'string') {
      // Try to find by name first, or convert slug to name-like format
      const subcategoryName = subcategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      let subcategoryResult = await req.pool.query('SELECT id FROM subcategory WHERE LOWER(name) = LOWER($1)', [subcategoryName]);
      
      // If not found by converted name, try original slug as name
      if (subcategoryResult.rows.length === 0) {
        subcategoryResult = await req.pool.query('SELECT id FROM subcategory WHERE LOWER(name) = LOWER($1)', [subcategory]);
      }
      
      // If still not found, try partial match
      if (subcategoryResult.rows.length === 0) {
        subcategoryResult = await req.pool.query('SELECT id FROM subcategory WHERE LOWER(name) LIKE LOWER($1)', [`%${subcategory.replace(/-/g, '%')}%`]);
      }
      
      if (subcategoryResult.rows.length > 0) {
        finalSubcategoryId = subcategoryResult.rows[0].id;
      }
    }

    // Generate slug
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    // Check for unique slug
    while (true) {
      const existing = await req.pool.query('SELECT id FROM topics WHERE slug = $1', [slug]);
      if (existing.rows.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Start transaction
    const client = await req.pool.connect();
    let topicId;

    try {
      await client.query('BEGIN');

      // Create topic
      const topicResult = await client.query(`
        INSERT INTO topics (
          title, description, content, slug, category_id, subcategory_id,
          difficulty, status, is_featured, is_free, price, duration_minutes,
          thumbnail_url, tags, meta_title, meta_description, meta_keywords, author_id,
          emoji, learning_objectives, target_audience, prerequisites
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING *
      `, [
        title.trim(),
        description || null,
        content || null,
        slug,
        finalCategoryId || null,
        finalSubcategoryId || null,
        difficulty,
        status,
        finalIsFeatured,
        isFree,
        parseFloat(price || 0),
        parseInt(finalDurationMinutes || 0),
        finalThumbnailUrl || null,
        JSON.stringify(tags || []),
        metaTitle || null,
        metaDescription || null,
        metaKeywords || null,
        authorId || null,
        emoji || null,
        learningObjectives || null,
        JSON.stringify(targetAudience || []),
        prerequisites || null
      ]);

      const topic = topicResult.rows[0];
      topicId = topic.id;

      // Create modules and videos if provided
      const createdModules = [];
      
      if (modules && Array.isArray(modules) && modules.length > 0) {
        for (let i = 0; i < modules.length; i++) {
          const module = modules[i];
          
          if (!module.title || module.title.trim() === '') {
            continue; // Skip modules without title
          }

          // Create module
          const moduleResult = await client.query(`
            INSERT INTO topic_modules (topic_id, title, description, order_index, is_active, duration_minutes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `, [
            topicId,
            module.title.trim(),
            module.description || null,
            module.order || (i + 1),
            module.isActive !== undefined ? module.isActive : true,
            parseInt(module.durationMinutes || 0)
          ]);

          const createdModule = moduleResult.rows[0];
          const moduleData = {
            id: createdModule.id,
            topicId: createdModule.topic_id,
            title: createdModule.title,
            description: createdModule.description,
            orderIndex: createdModule.order_index,
            isActive: createdModule.is_active,
            durationMinutes: createdModule.duration_minutes,
            createdAt: createdModule.created_at?.toISOString(),
            updatedAt: createdModule.updated_at?.toISOString(),
            videos: []
          };

          // Create videos for this module if provided
          if (module.videos && Array.isArray(module.videos) && module.videos.length > 0) {
            for (let j = 0; j < module.videos.length; j++) {
              const video = module.videos[j];
              
              if (!video.title || video.title.trim() === '') {
                continue; // Skip videos without title
              }

              // Handle alternative field names for videos
              const videoThumbnailUrl = video.thumbnail || video.thumbnailUrl;
              let videoDurationSeconds = parseInt(video.durationSeconds || 0);
              
              // Convert duration from minutes to seconds if needed
              if (video.duration && typeof video.duration === 'string') {
                const durationFloat = parseFloat(video.duration);
                if (!isNaN(durationFloat)) {
                  videoDurationSeconds = Math.round(durationFloat * 60); // Convert minutes to seconds
                }
              }

              // Validate video type
              const validVideoTypes = ['mp4', 'youtube', 'vimeo', 'stream'];
              const videoType = validVideoTypes.includes(video.videoType) ? video.videoType : 'mp4';

              const videoResult = await client.query(`
                INSERT INTO topic_videos (
                  topic_id, module_id, title, description, video_url, video_type,
                  thumbnail_url, duration_seconds, order_index, is_active, is_preview,
                  transcript, resources
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
                ) RETURNING *
              `, [
                topicId,
                createdModule.id,
                video.title.trim(),
                video.description || null,
                video.videoUrl || null,
                videoType,
                videoThumbnailUrl || null,
                videoDurationSeconds,
                video.order || (j + 1),
                video.isActive !== undefined ? video.isActive : true,
                video.isPreview !== undefined ? video.isPreview : false,
                video.transcript || null,
                JSON.stringify(video.resources || [])
              ]);

              const createdVideo = videoResult.rows[0];
              moduleData.videos.push({
                id: createdVideo.id,
                topicId: createdVideo.topic_id,
                moduleId: createdVideo.module_id,
                title: createdVideo.title,
                description: createdVideo.description,
                videoUrl: createdVideo.video_url,
                videoType: createdVideo.video_type,
                thumbnailUrl: createdVideo.thumbnail_url,
                thumbnail: createdVideo.thumbnail_url, // Alternative field name
                durationSeconds: createdVideo.duration_seconds,
                duration: createdVideo.duration_seconds ? (createdVideo.duration_seconds / 60).toFixed(0) : "0", // Convert to minutes
                orderIndex: createdVideo.order_index,
                order: createdVideo.order_index, // Alternative field name
                isActive: createdVideo.is_active,
                isPreview: createdVideo.is_preview,
                transcript: createdVideo.transcript,
                resources: createdVideo.resources || [],
                createdAt: createdVideo.created_at?.toISOString(),
                updatedAt: createdVideo.updated_at?.toISOString()
              });
            }
          }

          createdModules.push(moduleData);
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          id: topic.id,
          title: topic.title,
          description: topic.description,
          content: topic.content,
          slug: topic.slug,
          categoryId: topic.category_id,
          subcategoryId: topic.subcategory_id,
          difficulty: topic.difficulty,
          status: topic.status,
          isFeatured: topic.is_featured,
          featured: topic.is_featured, // Alternative field name
          isFree: topic.is_free,
          price: parseFloat(topic.price || 0),
          durationMinutes: topic.duration_minutes,
          duration: topic.duration_minutes ? (topic.duration_minutes / 60).toFixed(1) : "0", // Convert back to hours
          thumbnailUrl: topic.thumbnail_url,
          thumbnail: topic.thumbnail_url, // Alternative field name
          tags: topic.tags || [],
          metaTitle: topic.meta_title,
          metaDescription: topic.meta_description,
          metaKeywords: topic.meta_keywords,
          authorId: topic.author_id,
          emoji: topic.emoji,
          learningObjectives: topic.learning_objectives,
          targetAudience: topic.target_audience || [],
          prerequisites: topic.prerequisites,
          publishedAt: topic.published_at?.toISOString(),
          viewCount: topic.view_count,
          likeCount: topic.like_count,
          enrollmentCount: topic.enrollment_count,
          createdAt: topic.created_at?.toISOString(),
          updatedAt: topic.updated_at?.toISOString(),
          modules: createdModules
        }
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Error in POST /topics:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/topics/{id}:
 *   get:
 *     summary: Get topic by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Topic retrieved successfully
 *       404:
 *         description: Topic not found
 *   put:
 *     summary: Update topic by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Topic updated successfully
 *   delete:
 *     summary: Delete topic by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Topic deleted successfully
 */

// GET /api/topics/:id - Get topic by ID
router.get('/topics/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.pool.query(`
      SELECT 
        t.*,
        c.name as category_name,
        c.name as category_slug,
        sc.name as subcategory_name,
        sc.name as subcategory_slug,
        AVG(tr.rating) as rating,
        COUNT(tr.id) as review_count
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      LEFT JOIN topic_reviews tr ON t.id = tr.topic_id
      WHERE t.id = $1
      GROUP BY t.id, c.name, sc.name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }

    const topic = result.rows[0];

    // Get modules and videos
    const modulesResult = await req.pool.query(`
      SELECT * FROM topic_modules 
      WHERE topic_id = $1 
      ORDER BY order_index ASC
    `, [id]);

    const videosResult = await req.pool.query(`
      SELECT * FROM topic_videos 
      WHERE topic_id = $1 
      ORDER BY module_id ASC, order_index ASC
    `, [id]);

    const modules = modulesResult.rows.map(module => ({
      id: module.id,
      topicId: module.topic_id,
      title: module.title,
      description: module.description,
      orderIndex: module.order_index,
      order: module.order_index, // Alternative field name
      isActive: module.is_active,
      durationMinutes: module.duration_minutes,
      createdAt: module.created_at?.toISOString(),
      updatedAt: module.updated_at?.toISOString(),
      videos: videosResult.rows
        .filter(video => video.module_id === module.id)
        .map(video => ({
          id: video.id,
          topicId: video.topic_id,
          moduleId: video.module_id,
          title: video.title,
          description: video.description,
          videoUrl: video.video_url,
          videoType: video.video_type,
          thumbnailUrl: video.thumbnail_url,
          thumbnail: video.thumbnail_url, // Alternative field name
          durationSeconds: video.duration_seconds,
          duration: video.duration_seconds ? (video.duration_seconds / 60).toFixed(0) : "0", // Convert to minutes
          orderIndex: video.order_index,
          order: video.order_index, // Alternative field name
          isActive: video.is_active,
          isPreview: video.is_preview,
          transcript: video.transcript,
          resources: video.resources || [],
          createdAt: video.created_at?.toISOString(),
          updatedAt: video.updated_at?.toISOString()
        }))
    }));

    // Add additional fields to topic
    topic.category = topic.category_slug;
    topic.subcategory = topic.subcategory_slug;
    topic.rating = parseFloat(topic.rating) || 0;
    topic.review_count = parseInt(topic.review_count) || 0;

    res.json({
      success: true,
      data: formatTopicData(topic, modules)
    });

  } catch (err) {
    console.error('Error in GET /topics/:id:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// PUT /api/topics/:id - Update topic
router.put('/topics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if topic exists
    const existing = await req.pool.query('SELECT * FROM topics WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    // Handle slug update if title changes
    if (updateData.title && updateData.title !== existing.rows[0].title) {
      const baseSlug = generateSlug(updateData.title);
      let slug = baseSlug;
      let counter = 1;

      // Check for unique slug (excluding current topic)
      while (true) {
        const slugCheck = await req.pool.query(
          'SELECT id FROM topics WHERE slug = $1 AND id != $2', 
          [slug, id]
        );
        if (slugCheck.rows.length === 0) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      updateData.slug = slug;
    }

    const allowedFields = [
      'title', 'description', 'content', 'slug', 'category_id', 'subcategory_id',
      'difficulty', 'status', 'is_featured', 'is_free', 'price', 'duration_minutes',
      'thumbnail_url', 'tags', 'meta_title', 'meta_description', 'meta_keywords', 'author_id',
      'emoji', 'learning_objectives', 'target_audience', 'prerequisites'
    ];

    for (const [key, value] of Object.entries(updateData)) {
      let dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      // Handle alternative field names
      if (key === 'featured') dbField = 'is_featured';
      if (key === 'thumbnail') dbField = 'thumbnail_url';
      if (key === 'category') {
        dbField = 'category_id';
        if (typeof value === 'string') {
          // Check if it's a numeric string (ID)
          const numericValue = parseInt(value);
          if (!isNaN(numericValue)) {
            updateData[key] = numericValue;
          } else {
            // It's a category name/slug, try to find by name
            const categoryName = value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let categoryResult = await req.pool.query('SELECT id FROM category WHERE LOWER(name) = LOWER($1)', [categoryName]);
            
            if (categoryResult.rows.length === 0) {
              categoryResult = await req.pool.query('SELECT id FROM category WHERE LOWER(name) = LOWER($1)', [value]);
            }
            
            if (categoryResult.rows.length > 0) {
              updateData[key] = categoryResult.rows[0].id;
            } else {
              continue; // Skip if category not found
            }
          }
        }
      }
      if (key === 'subcategory') {
        dbField = 'subcategory_id';
        if (typeof value === 'string') {
          // Check if it's a numeric string (ID)
          const numericValue = parseInt(value);
          if (!isNaN(numericValue)) {
            updateData[key] = numericValue;
          } else {
            // It's a subcategory name/slug, try to find by name
            const subcategoryName = value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let subcategoryResult = await req.pool.query('SELECT id FROM subcategory WHERE LOWER(name) = LOWER($1)', [subcategoryName]);
            
            if (subcategoryResult.rows.length === 0) {
              subcategoryResult = await req.pool.query('SELECT id FROM subcategory WHERE LOWER(name) = LOWER($1)', [value]);
            }
            
            if (subcategoryResult.rows.length > 0) {
              updateData[key] = subcategoryResult.rows[0].id;
            } else {
              continue; // Skip if subcategory not found
            }
          }
        }
      }
      if (key === 'duration' && typeof value === 'string') {
        // Convert duration hours to minutes
        const durationFloat = parseFloat(value);
        if (!isNaN(durationFloat)) {
          dbField = 'duration_minutes';
          updateData[key] = Math.round(durationFloat * 60);
        }
      }
      
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = $${paramCount}`);
        if (key === 'tags' || key === 'targetAudience') {
          updateValues.push(JSON.stringify(value || []));
        } else {
          updateValues.push(updateData[key]);
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
    updateValues.push(id);

    const updateQuery = `
      UPDATE topics 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await req.pool.query(updateQuery, updateValues);
    const topic = result.rows[0];

    // Handle modules update if provided
    if (updateData.modules && Array.isArray(updateData.modules)) {
      const client = await req.pool.connect();
      try {
        await client.query('BEGIN');

        // Get existing modules for comparison
        const existingModules = await client.query(
          'SELECT id FROM topic_modules WHERE topic_id = $1',
          [id]
        );
        const existingModuleIds = existingModules.rows.map(m => m.id);

        // Process each module in the request
        for (const [moduleIndex, moduleData] of updateData.modules.entries()) {
          let moduleId = moduleData.id;

          if (moduleId && typeof moduleId === 'string' && moduleId.startsWith('new-')) {
            // This is a new module, insert it
            const moduleResult = await client.query(`
              INSERT INTO topic_modules (topic_id, title, description, order_index, duration_minutes, is_active)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id
            `, [
              id,
              moduleData.title || 'Untitled Module',
              moduleData.description || '',
              moduleData.order || moduleIndex + 1,
              0,
              true
            ]);
            moduleId = moduleResult.rows[0].id;

            // Handle videos for this new module
            if (moduleData.videos && Array.isArray(moduleData.videos)) {
              for (const [videoIndex, videoData] of moduleData.videos.entries()) {
                if (videoData.id && typeof videoData.id === 'string' && videoData.id.startsWith('new-')) {
                  // This is a new video for the new module
                  const durationSeconds = videoData.duration ? parseInt(videoData.duration) * 60 : 0;
                  
                  // Insert the video into topic_videos
                  const insertResult = await client.query(`
                    INSERT INTO topic_videos (topic_id, module_id, title, description, video_url, duration_seconds, order_index, video_type, is_preview)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING id
                  `, [
                    id, // topic_id
                    moduleId,
                    videoData.title || 'Untitled Video',
                    videoData.description || '',
                    videoData.videoUrl || '',
                    durationSeconds,
                    videoData.order || videoIndex + 1,
                    videoData.videoType || 'mp4',
                    videoData.isPreview || false
                  ]);

                  const videoId = insertResult.rows[0].id;

                  // If the videoUrl looks like an uploaded file, link it in uploads table
                  if (videoData.videoUrl && videoData.videoUrl.startsWith('/api/uploads/')) {
                    // Extract filename from URL (e.g., /api/uploads/videos/filename.mp4 -> filename.mp4)
                    const urlParts = videoData.videoUrl.split('/');
                    const filename = urlParts[urlParts.length - 1];
                    
                    // Update uploads table to link this file to the topic structure
                    await client.query(`
                      UPDATE uploads 
                      SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                        'topic_id', $1::text,
                        'module_id', $2::text, 
                        'video_id', $3::text,
                        'linked_at', CURRENT_TIMESTAMP::text
                      )
                      WHERE filename = $4 AND upload_type = 'video'
                    `, [id.toString(), moduleId.toString(), videoId.toString(), filename]);
                  }
                }
              }
            }
          } else if (moduleId && !isNaN(parseInt(moduleId))) {
            // This is an existing module, update it
            await client.query(`
              UPDATE topic_modules 
              SET title = $1, description = $2, order_index = $3, updated_at = CURRENT_TIMESTAMP
              WHERE id = $4 AND topic_id = $5
            `, [
              moduleData.title || 'Untitled Module',
              moduleData.description || '',
              moduleData.order || moduleIndex + 1,
              moduleId,
              id
            ]);

            // Remove this module ID from the existing list (so we don't delete it later)
            const moduleIdNum = parseInt(moduleId);
            const index = existingModuleIds.indexOf(moduleIdNum);
            if (index > -1) {
              existingModuleIds.splice(index, 1);
            }

            // Handle videos for this existing module
            if (moduleData.videos && Array.isArray(moduleData.videos)) {
              // Get existing videos for this module
              const existingVideosResult = await client.query(
                'SELECT id FROM topic_videos WHERE module_id = $1',
                [moduleId]
              );
              const existingVideoIds = existingVideosResult.rows.map(v => v.id);

              for (const [videoIndex, videoData] of moduleData.videos.entries()) {
                if (videoData.id && typeof videoData.id === 'string' && videoData.id.startsWith('new-')) {
                  // This is a new video for existing module
                  const durationSeconds = videoData.duration ? parseInt(videoData.duration) * 60 : 0;
                  
                  // Insert the video into topic_videos
                  const insertResult = await client.query(`
                    INSERT INTO topic_videos (topic_id, module_id, title, description, video_url, duration_seconds, order_index, video_type, is_preview)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING id
                  `, [
                    id, // topic_id
                    moduleId,
                    videoData.title || 'Untitled Video',
                    videoData.description || '',
                    videoData.videoUrl || '',
                    durationSeconds,
                    videoData.order || videoIndex + 1,
                    videoData.videoType || 'mp4',
                    videoData.isPreview || false
                  ]);

                  const videoId = insertResult.rows[0].id;

                  // If the videoUrl looks like an uploaded file, link it in uploads table
                  if (videoData.videoUrl && videoData.videoUrl.startsWith('/api/uploads/')) {
                    // Extract filename from URL (e.g., /api/uploads/videos/filename.mp4 -> filename.mp4)
                    const urlParts = videoData.videoUrl.split('/');
                    const filename = urlParts[urlParts.length - 1];
                    
                    // Update uploads table to link this file to the topic structure
                    await client.query(`
                      UPDATE uploads 
                      SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                        'topic_id', $1::text,
                        'module_id', $2::text, 
                        'video_id', $3::text,
                        'linked_at', CURRENT_TIMESTAMP::text
                      )
                      WHERE filename = $4 AND upload_type = 'video'
                    `, [id.toString(), moduleId.toString(), videoId.toString(), filename]);
                  }
                } else if (videoData.id && !isNaN(parseInt(videoData.id))) {
                  // This is an existing video, update it
                  const durationSeconds = videoData.duration ? parseInt(videoData.duration) * 60 : 0;
                  await client.query(`
                    UPDATE topic_videos 
                    SET title = $1, description = $2, video_url = $3, duration_seconds = $4, order_index = $5, video_type = $6, is_preview = $7, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $8 AND module_id = $9
                  `, [
                    videoData.title || 'Untitled Video',
                    videoData.description || '',
                    videoData.videoUrl || '',
                    durationSeconds,
                    videoData.order || videoIndex + 1,
                    videoData.videoType || 'mp4',
                    videoData.isPreview || false,
                    videoData.id,
                    moduleId
                  ]);

                  // If the videoUrl looks like an uploaded file, link it in uploads table
                  if (videoData.videoUrl && videoData.videoUrl.startsWith('/api/uploads/')) {
                    // Extract filename from URL (e.g., /api/uploads/videos/filename.mp4 -> filename.mp4)
                    const urlParts = videoData.videoUrl.split('/');
                    const filename = urlParts[urlParts.length - 1];
                    
                    // Update uploads table to link this file to the topic structure
                    await client.query(`
                      UPDATE uploads 
                      SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                        'topic_id', $1::text,
                        'module_id', $2::text, 
                        'video_id', $3::text,
                        'linked_at', CURRENT_TIMESTAMP::text
                      )
                      WHERE filename = $4 AND upload_type = 'video'
                    `, [id.toString(), moduleId.toString(), videoData.id.toString(), filename]);
                  }

                  // Remove this video ID from the existing list
                  const videoIdNum = parseInt(videoData.id);
                  const index = existingVideoIds.indexOf(videoIdNum);
                  if (index > -1) {
                    existingVideoIds.splice(index, 1);
                  }
                }
              }

              // Delete any videos that weren't in the update (removed videos)
              for (const videoId of existingVideoIds) {
                await client.query('DELETE FROM topic_videos WHERE id = $1', [videoId]);
              }
            }
          }
        }

        // Delete any modules that weren't in the update (removed modules)
        for (const moduleId of existingModuleIds) {
          await client.query('DELETE FROM topic_modules WHERE id = $1', [moduleId]);
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    // Fetch updated modules to include in response
    const modulesResult = await req.pool.query(`
      SELECT 
        tm.id,
        tm.title,
        tm.description,
        tm.order_index,
        tm.duration_minutes,
        tm.is_active,
        tm.created_at,
        tm.updated_at
      FROM topic_modules tm
      WHERE tm.topic_id = $1
      ORDER BY tm.order_index ASC
    `, [id]);

    const modules = [];
    for (const module of modulesResult.rows) {
      const videosResult = await req.pool.query(`
        SELECT 
          tv.id,
          tv.title,
          tv.description,
          tv.video_url,
          tv.thumbnail_url,
          tv.duration_seconds,
          tv.order_index,
          tv.video_type,
          tv.is_preview,
          tv.transcript,
          tv.created_at,
          tv.updated_at
        FROM topic_videos tv
        WHERE tv.module_id = $1
        ORDER BY tv.order_index ASC
      `, [module.id]);

      const videos = videosResult.rows.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description || '',
        duration: video.duration_seconds ? Math.ceil(video.duration_seconds / 60).toString() : '0',
        videoUrl: video.video_url,
        thumbnail: video.thumbnail_url || '',
        thumbnailUrl: video.thumbnail_url,
        order: video.order_index,
        orderIndex: video.order_index,
        videoType: video.video_type || 'mp4',
        durationSeconds: video.duration_seconds || 0,
        isPreview: video.is_preview || false,
        transcript: video.transcript
      }));

      modules.push({
        id: module.id,
        title: module.title,
        description: module.description || '',
        order: module.order_index,
        orderIndex: module.order_index,
        durationMinutes: module.duration_minutes || 0,
        isActive: module.is_active,
        videos: videos
      });
    }

    res.json({
      success: true,
      data: formatTopicData(topic, modules)
    });

  } catch (err) {
    console.error('Error in PUT /topics/:id:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// DELETE /api/topics/:id - Delete topic
router.delete('/topics/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if topic exists
    const existing = await req.pool.query('SELECT id FROM topics WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }

    // Delete topic (cascade will handle related records)
    await req.pool.query('DELETE FROM topics WHERE id = $1', [id]);

    res.json({
      success: true,
      data: {
        deleted: true
      }
    });

  } catch (err) {
    console.error('Error in DELETE /topics/:id:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/subcategory/:subcategoryId - Get topics by subcategory
router.get('/topics/subcategory/:subcategoryId', async (req, res) => {
  try {
    const { subcategoryId } = req.params;
    const { page = 1, limit = 10, status = 'published' } = req.query;
    const offset = (page - 1) * limit;

    const result = await req.pool.query(`
      SELECT t.*, c.name as category_name, sc.name as subcategory_name,
             COUNT(*) OVER() as total_count
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      WHERE t.subcategory_id = $1 AND t.status = $2
      ORDER BY t.created_at DESC
      LIMIT $3 OFFSET $4
    `, [subcategoryId, status, limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const topics = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      difficulty: row.difficulty,
      isFeatured: row.is_featured,
      isFree: row.is_free,
      price: parseFloat(row.price || 0),
      durationMinutes: row.duration_minutes,
      thumbnailUrl: row.thumbnail_url,
      tags: row.tags || [],
      viewCount: row.view_count,
      enrollmentCount: row.enrollment_count,
      createdAt: row.created_at?.toISOString()
    }));

    res.json({
      success: true,
      data: topics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/subcategory/:subcategoryId:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/category/:categoryId - Get topics by category
router.get('/topics/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10, status = 'published' } = req.query;
    const offset = (page - 1) * limit;

    const result = await req.pool.query(`
      SELECT t.*, c.name as category_name, sc.name as subcategory_name,
             COUNT(*) OVER() as total_count
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      WHERE t.category_id = $1 AND t.status = $2
      ORDER BY t.created_at DESC
      LIMIT $3 OFFSET $4
    `, [categoryId, status, limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const topics = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      difficulty: row.difficulty,
      isFeatured: row.is_featured,
      isFree: row.is_free,
      price: parseFloat(row.price || 0),
      durationMinutes: row.duration_minutes,
      thumbnailUrl: row.thumbnail_url,
      tags: row.tags || [],
      viewCount: row.view_count,
      enrollmentCount: row.enrollment_count,
      createdAt: row.created_at?.toISOString()
    }));

    res.json({
      success: true,
      data: topics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/category/:categoryId:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// DELETE /api/topics/bulk-delete - Bulk delete topics
router.delete('/topics/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of topic IDs is required'
      });
    }

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const result = await req.pool.query(
      `DELETE FROM topics WHERE id IN (${placeholders})`,
      ids
    );

    res.json({
      success: true,
      data: {
        deletedCount: result.rowCount
      }
    });

  } catch (err) {
    console.error('Error in DELETE /topics/bulk-delete:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/search - Search topics
router.get('/topics/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const result = await req.pool.query(`
      SELECT t.*, c.name as category_name, sc.name as subcategory_name,
             COUNT(*) OVER() as total_count
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      WHERE (t.title ILIKE $1 OR t.description ILIKE $1 OR t.content ILIKE $1)
        AND t.status = 'published'
      ORDER BY t.view_count DESC, t.created_at DESC
      LIMIT $2 OFFSET $3
    `, [`%${q}%`, limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const topics = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      difficulty: row.difficulty,
      isFeatured: row.is_featured,
      isFree: row.is_free,
      price: parseFloat(row.price || 0),
      durationMinutes: row.duration_minutes,
      thumbnailUrl: row.thumbnail_url,
      tags: row.tags || [],
      viewCount: row.view_count,
      enrollmentCount: row.enrollment_count,
      createdAt: row.created_at?.toISOString()
    }));

    res.json({
      success: true,
      data: topics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/search:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/list - Simple list without pagination (for dropdowns)
router.get('/topics/list', async (req, res) => {
  try {
    const { status = 'published' } = req.query;

    const result = await req.pool.query(`
      SELECT id, title, slug, status
      FROM topics
      WHERE status = $1
      ORDER BY title ASC
    `, [status]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (err) {
    console.error('Error in GET /topics/list:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/count - Get topics count
router.get('/topics/count', async (req, res) => {
  try {
    const result = await req.pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived,
        COUNT(CASE WHEN is_featured = true THEN 1 END) as featured
      FROM topics
    `);

    res.json({
      success: true,
      data: {
        total: parseInt(result.rows[0].total),
        published: parseInt(result.rows[0].published),
        drafts: parseInt(result.rows[0].drafts),
        archived: parseInt(result.rows[0].archived),
        featured: parseInt(result.rows[0].featured)
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/count:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/published - Get published topics
router.get('/topics/published', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await req.pool.query(`
      SELECT t.*, c.name as category_name, sc.name as subcategory_name,
             COUNT(*) OVER() as total_count
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      WHERE t.status = 'published'
      ORDER BY t.published_at DESC, t.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const topics = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      difficulty: row.difficulty,
      isFeatured: row.is_featured,
      isFree: row.is_free,
      price: parseFloat(row.price || 0),
      durationMinutes: row.duration_minutes,
      thumbnailUrl: row.thumbnail_url,
      tags: row.tags || [],
      viewCount: row.view_count,
      enrollmentCount: row.enrollment_count,
      publishedAt: row.published_at?.toISOString(),
      createdAt: row.created_at?.toISOString()
    }));

    res.json({
      success: true,
      data: topics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/published:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/draft - Get draft topics
router.get('/topics/draft', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await req.pool.query(`
      SELECT t.*, c.name as category_name, sc.name as subcategory_name,
             COUNT(*) OVER() as total_count
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      WHERE t.status = 'draft'
      ORDER BY t.updated_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const topics = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      difficulty: row.difficulty,
      isFeatured: row.is_featured,
      isFree: row.is_free,
      price: parseFloat(row.price || 0),
      durationMinutes: row.duration_minutes,
      thumbnailUrl: row.thumbnail_url,
      tags: row.tags || [],
      viewCount: row.view_count,
      enrollmentCount: row.enrollment_count,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    }));

    res.json({
      success: true,
      data: topics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/draft:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/featured - Get featured topics
router.get('/topics/featured', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await req.pool.query(`
      SELECT t.*, c.name as category_name, sc.name as subcategory_name,
             COUNT(*) OVER() as total_count
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      WHERE t.is_featured = true AND t.status = 'published'
      ORDER BY t.view_count DESC, t.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const topics = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      difficulty: row.difficulty,
      isFeatured: row.is_featured,
      isFree: row.is_free,
      price: parseFloat(row.price || 0),
      durationMinutes: row.duration_minutes,
      thumbnailUrl: row.thumbnail_url,
      tags: row.tags || [],
      viewCount: row.view_count,
      enrollmentCount: row.enrollment_count,
      createdAt: row.created_at?.toISOString()
    }));

    res.json({
      success: true,
      data: topics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/featured:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/free - Get free topics
router.get('/topics/free', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await req.pool.query(`
      SELECT t.*, c.name as category_name, sc.name as subcategory_name,
             COUNT(*) OVER() as total_count
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      WHERE t.is_free = true AND t.status = 'published'
      ORDER BY t.view_count DESC, t.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const topics = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      difficulty: row.difficulty,
      isFeatured: row.is_featured,
      isFree: row.is_free,
      price: parseFloat(row.price || 0),
      durationMinutes: row.duration_minutes,
      thumbnailUrl: row.thumbnail_url,
      tags: row.tags || [],
      viewCount: row.view_count,
      enrollmentCount: row.enrollment_count,
      createdAt: row.created_at?.toISOString()
    }));

    res.json({
      success: true,
      data: topics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/free:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/paid - Get paid topics
router.get('/topics/paid', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await req.pool.query(`
      SELECT t.*, c.name as category_name, sc.name as subcategory_name,
             COUNT(*) OVER() as total_count
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      WHERE t.is_free = false AND t.status = 'published'
      ORDER BY t.price DESC, t.view_count DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const topics = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      difficulty: row.difficulty,
      isFeatured: row.is_featured,
      isFree: row.is_free,
      price: parseFloat(row.price || 0),
      durationMinutes: row.duration_minutes,
      thumbnailUrl: row.thumbnail_url,
      tags: row.tags || [],
      viewCount: row.view_count,
      enrollmentCount: row.enrollment_count,
      createdAt: row.created_at?.toISOString()
    }));

    res.json({
      success: true,
      data: topics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/paid:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/difficulty/:difficulty - Get topics by difficulty
router.get('/topics/difficulty/:difficulty', async (req, res) => {
  try {
    const { difficulty } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid difficulty level'
      });
    }

    const result = await req.pool.query(`
      SELECT t.*, c.name as category_name, sc.name as subcategory_name,
             COUNT(*) OVER() as total_count
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      WHERE t.difficulty = $1 AND t.status = 'published'
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `, [difficulty, limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const topics = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      difficulty: row.difficulty,
      isFeatured: row.is_featured,
      isFree: row.is_free,
      price: parseFloat(row.price || 0),
      durationMinutes: row.duration_minutes,
      thumbnailUrl: row.thumbnail_url,
      tags: row.tags || [],
      viewCount: row.view_count,
      enrollmentCount: row.enrollment_count,
      createdAt: row.created_at?.toISOString()
    }));

    res.json({
      success: true,
      data: topics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/difficulty/:difficulty:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// GET /api/topics/tag/:tag - Get topics by tag
router.get('/topics/tag/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await req.pool.query(`
      SELECT t.*, c.name as category_name, sc.name as subcategory_name,
             COUNT(*) OVER() as total_count
      FROM topics t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN subcategory sc ON t.subcategory_id = sc.id
      WHERE t.tags ? $1 AND t.status = 'published'
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `, [tag, limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const topics = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      difficulty: row.difficulty,
      isFeatured: row.is_featured,
      isFree: row.is_free,
      price: parseFloat(row.price || 0),
      durationMinutes: row.duration_minutes,
      thumbnailUrl: row.thumbnail_url,
      tags: row.tags || [],
      viewCount: row.view_count,
      enrollmentCount: row.enrollment_count,
      createdAt: row.created_at?.toISOString()
    }));

    res.json({
      success: true,
      data: topics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('Error in GET /topics/tag/:tag:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

module.exports = router;
