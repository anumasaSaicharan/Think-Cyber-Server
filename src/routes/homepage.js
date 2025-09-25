const express = require('express');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Homepage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "homepage_en_001"
 *         language:
 *           type: string
 *           example: "en"
 *         hero:
 *           $ref: '#/components/schemas/Hero'
 *         about:
 *           $ref: '#/components/schemas/About'
 *         contact:
 *           $ref: '#/components/schemas/Contact'
 *         faqs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FAQ'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         version:
 *           type: integer
 *           example: 1
 *     Hero:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "hero_001"
 *         title:
 *           type: string
 *           example: "Welcome to ThinkCyber"
 *         subtitle:
 *           type: string
 *           example: "Advanced Cybersecurity Training Platform"
 *         backgroundImage:
 *           type: string
 *           example: "https://example.com/hero-bg.jpg"
 *         ctaText:
 *           type: string
 *           example: "Get Started"
 *         ctaLink:
 *           type: string
 *           example: "/dashboard"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     About:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "about_001"
 *         title:
 *           type: string
 *           example: "About Our Platform"
 *         content:
 *           type: string
 *           example: "We provide comprehensive cybersecurity training..."
 *         image:
 *           type: string
 *           example: "https://example.com/about-image.jpg"
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Interactive Learning", "Real-world Scenarios", "Expert Instructors"]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Contact:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "contact_001"
 *         email:
 *           type: string
 *           example: "info@thinkcyber.com"
 *         phone:
 *           type: string
 *           example: "+1-555-0123"
 *         address:
 *           type: string
 *           example: "123 Security St, Cyber City, CC 12345"
 *         hours:
 *           type: string
 *           example: "9 AM - 6 PM EST"
 *         description:
 *           type: string
 *           example: "Get in touch with our team"
 *         supportEmail:
 *           type: string
 *           example: "support@thinkcyber.com"
 *         salesEmail:
 *           type: string
 *           example: "sales@thinkcyber.com"
 *         socialLinks:
 *           type: object
 *           properties:
 *             facebook:
 *               type: string
 *               example: "https://facebook.com/thinkcyber"
 *             twitter:
 *               type: string
 *               example: "https://twitter.com/thinkcyber"
 *             linkedin:
 *               type: string
 *               example: "https://linkedin.com/company/thinkcyber"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     FAQ:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "faq_001"
 *         question:
 *           type: string
 *           example: "What is cybersecurity training?"
 *         answer:
 *           type: string
 *           example: "Cybersecurity training teaches you to protect systems..."
 *         order:
 *           type: integer
 *           example: 1
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/homepage/{language}:
 *   get:
 *     summary: Get homepage content by language
 *     parameters:
 *       - in: path
 *         name: language
 *         required: true
 *         schema:
 *           type: string
 *         description: Language code (e.g., 'en', 'es')
 *         example: 'en'
 *     responses:
 *       200:
 *         description: Homepage content retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Homepage'
 *       404:
 *         description: Homepage content not found for the specified language
 */
// GET homepage content by language
router.get('/homepage/:language', async (req, res) => {
  try {
    const { language } = req.params;

    if (!language || language.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Language parameter is required'
      });
    }

    // Get homepage with all sections
    const homepageQuery = `
      SELECT 
        h.id,
        h.language,
        h.version,
        h.created_at,
        h.updated_at,
        -- Hero section
        hh.id as hero_id,
        hh.title as hero_title,
        hh.subtitle as hero_subtitle,
        hh.background_image as hero_background_image,
        hh.cta_text as hero_cta_text,
        hh.cta_link as hero_cta_link,
        hh.created_at as hero_created_at,
        hh.updated_at as hero_updated_at,
        -- About section
        ha.id as about_id,
        ha.title as about_title,
        ha.content as about_content,
        ha.image as about_image,
        ha.features as about_features,
        ha.created_at as about_created_at,
        ha.updated_at as about_updated_at,
        -- Contact section
        hc.id as contact_id,
        hc.email as contact_email,
        hc.phone as contact_phone,
        hc.address as contact_address,
        hc.hours as contact_hours,
        hc.description as contact_description,
        hc.support_email as contact_support_email,
        hc.sales_email as contact_sales_email,
        hc.social_links as contact_social_links,
        hc.created_at as contact_created_at,
        hc.updated_at as contact_updated_at
      FROM homepage h
      LEFT JOIN homepage_hero hh ON h.id = hh.homepage_id
      LEFT JOIN homepage_about ha ON h.id = ha.homepage_id
      LEFT JOIN homepage_contact hc ON h.id = hc.homepage_id
      WHERE h.language = $1 AND h.is_active = true
    `;

    const faqsQuery = `
      SELECT 
        id,
        question,
        answer,
        order_index,
        is_active,
        created_at,
        updated_at
      FROM homepage_faqs 
      WHERE homepage_id = (SELECT id FROM homepage WHERE language = $1)
        AND is_active = true
      ORDER BY order_index ASC
    `;

    const [homepageResult, faqsResult] = await Promise.all([
      req.pool.query(homepageQuery, [language]),
      req.pool.query(faqsQuery, [language])
    ]);

    if (!homepageResult.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Homepage content not found for the specified language'
      });
    }

    const row = homepageResult.rows[0];
    
    const homepageData = {
      id: `homepage_${language}_${row.id.toString().padStart(3, '0')}`,
      language: row.language,
      hero: {
        id: `hero_${row.hero_id?.toString().padStart(3, '0')}`,
        title: row.hero_title,
        subtitle: row.hero_subtitle,
        backgroundImage: row.hero_background_image,
        ctaText: row.hero_cta_text,
        ctaLink: row.hero_cta_link,
        createdAt: row.hero_created_at?.toISOString(),
        updatedAt: row.hero_updated_at?.toISOString()
      },
      about: {
        id: `about_${row.about_id?.toString().padStart(3, '0')}`,
        title: row.about_title,
        content: row.about_content,
        image: row.about_image,
        features: row.about_features || [],
        createdAt: row.about_created_at?.toISOString(),
        updatedAt: row.about_updated_at?.toISOString()
      },
      contact: {
        id: `contact_${row.contact_id?.toString().padStart(3, '0')}`,
        email: row.contact_email,
        phone: row.contact_phone,
        address: row.contact_address,
        hours: row.contact_hours,
        description: row.contact_description,
        supportEmail: row.contact_support_email,
        salesEmail: row.contact_sales_email,
        socialLinks: row.contact_social_links || {},
        createdAt: row.contact_created_at?.toISOString(),
        updatedAt: row.contact_updated_at?.toISOString()
      },
      faqs: faqsResult.rows.map(faq => ({
        id: `faq_${faq.id.toString().padStart(3, '0')}`,
        question: faq.question,
        answer: faq.answer,
        order: faq.order_index,
        isActive: faq.is_active,
        createdAt: faq.created_at?.toISOString(),
        updatedAt: faq.updated_at?.toISOString()
      })),
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString(),
      version: row.version
    };

    res.json({
      success: true,
      data: homepageData
    });

  } catch (err) {
    console.error('Error in GET /homepage/:language:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/homepage/content:
 *   post:
 *     summary: Create or update homepage content
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - language
 *               - hero
 *               - about
 *               - contact
 *             properties:
 *               language:
 *                 type: string
 *                 example: 'en'
 *               hero:
 *                 type: object
 *                 required:
 *                   - title
 *                   - subtitle
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: 'Welcome to ThinkCyber'
 *                   subtitle:
 *                     type: string
 *                     example: 'Advanced Cybersecurity Training Platform'
 *                   backgroundImage:
 *                     type: string
 *                     example: 'https://example.com/hero-bg.jpg'
 *                   ctaText:
 *                     type: string
 *                     example: 'Get Started'
 *                   ctaLink:
 *                     type: string
 *                     example: '/dashboard'
 *               about:
 *                 type: object
 *                 required:
 *                   - title
 *                   - content
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: 'About Our Platform'
 *                   content:
 *                     type: string
 *                     example: 'We provide comprehensive cybersecurity training...'
 *                   image:
 *                     type: string
 *                     example: 'https://example.com/about-image.jpg'
 *                   features:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ['Interactive Learning', 'Real-world Scenarios', 'Expert Instructors']
 *               contact:
 *                 type: object
 *                 required:
 *                   - email
 *                 properties:
 *                   email:
 *                     type: string
 *                     example: 'info@thinkcyber.com'
 *                   phone:
 *                     type: string
 *                     example: '+1-555-0123'
 *                   address:
 *                     type: string
 *                     example: '123 Security St, Cyber City, CC 12345'
 *                   hours:
 *                     type: string
 *                     example: '9 AM - 6 PM EST'
 *                   description:
 *                     type: string
 *                     example: 'Get in touch with our team'
 *                   supportEmail:
 *                     type: string
 *                     example: 'support@thinkcyber.com'
 *                   salesEmail:
 *                     type: string
 *                     example: 'sales@thinkcyber.com'
 *                   socialLinks:
 *                     type: object
 *                     properties:
 *                       facebook:
 *                         type: string
 *                         example: 'https://facebook.com/thinkcyber'
 *                       twitter:
 *                         type: string
 *                         example: 'https://twitter.com/thinkcyber'
 *                       linkedin:
 *                         type: string
 *                         example: 'https://linkedin.com/company/thinkcyber'
 *               faqs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - question
 *                     - answer
 *                   properties:
 *                     question:
 *                       type: string
 *                       example: 'What is cybersecurity training?'
 *                     answer:
 *                       type: string
 *                       example: 'Cybersecurity training teaches you to protect systems...'
 *                     order:
 *                       type: integer
 *                       example: 1
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       200:
 *         description: Homepage content updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Homepage'
 *       201:
 *         description: Homepage content created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Homepage'
 */
// POST/PUT homepage content
router.post('/homepage/content', async (req, res) => {
  try {
    const { language, hero, about, contact, faqs } = req.body;

    // Validation
    const validationErrors = [];
    
    if (!language || language.trim() === '') {
      validationErrors.push({
        field: 'language',
        message: 'Language is required',
        code: 'REQUIRED'
      });
    }

    if (!hero || !hero.title || hero.title.trim() === '') {
      validationErrors.push({
        field: 'hero.title',
        message: 'Hero title is required',
        code: 'REQUIRED'
      });
    }

    if (!hero || !hero.subtitle || hero.subtitle.trim() === '') {
      validationErrors.push({
        field: 'hero.subtitle',
        message: 'Hero subtitle is required',
        code: 'REQUIRED'
      });
    }

    if (!about || !about.title || about.title.trim() === '') {
      validationErrors.push({
        field: 'about.title',
        message: 'About title is required',
        code: 'REQUIRED'
      });
    }

    if (!about || !about.content || about.content.trim() === '') {
      validationErrors.push({
        field: 'about.content',
        message: 'About content is required',
        code: 'REQUIRED'
      });
    }

    if (!contact || !contact.email || contact.email.trim() === '') {
      validationErrors.push({
        field: 'contact.email',
        message: 'Contact email is required',
        code: 'REQUIRED'
      });
    }

    // Email format validation
    if (contact && contact.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact.email)) {
        validationErrors.push({
          field: 'contact.email',
          message: 'Invalid email format',
          code: 'INVALID_FORMAT'
        });
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: 'Required fields are missing or invalid',
        validationErrors,
        statusCode: 400
      });
    }

    const client = await req.pool.connect();
    let homepageId;
    let isUpdate = false;

    try {
      await client.query('BEGIN');

      // Check if homepage exists
      const existingHomepage = await client.query(
        'SELECT id, version FROM homepage WHERE language = $1',
        [language]
      );

      if (existingHomepage.rows.length > 0) {
        homepageId = existingHomepage.rows[0].id;
        isUpdate = true;
        
        // Update homepage version
        await client.query(
          'UPDATE homepage SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [homepageId]
        );
      } else {
        // Create new homepage
        const homepageResult = await client.query(
          'INSERT INTO homepage (language, version, is_active) VALUES ($1, 1, true) RETURNING id',
          [language]
        );
        homepageId = homepageResult.rows[0].id;
      }

      // Upsert hero section
      await client.query(`
        INSERT INTO homepage_hero (homepage_id, title, subtitle, background_image, cta_text, cta_link)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (homepage_id) 
        DO UPDATE SET 
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          background_image = EXCLUDED.background_image,
          cta_text = EXCLUDED.cta_text,
          cta_link = EXCLUDED.cta_link,
          updated_at = CURRENT_TIMESTAMP
      `, [
        homepageId,
        hero.title.trim(),
        hero.subtitle?.trim() || '',
        hero.backgroundImage || null,
        hero.ctaText || null,
        hero.ctaLink || null
      ]);

      // Upsert about section
      await client.query(`
        INSERT INTO homepage_about (homepage_id, title, content, image, features)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (homepage_id)
        DO UPDATE SET 
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          image = EXCLUDED.image,
          features = EXCLUDED.features,
          updated_at = CURRENT_TIMESTAMP
      `, [
        homepageId,
        about.title.trim(),
        about.content.trim(),
        about.image || null,
        JSON.stringify(about.features || [])
      ]);

      // Upsert contact section
      await client.query(`
        INSERT INTO homepage_contact (homepage_id, email, phone, address, hours, description, support_email, sales_email, social_links)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (homepage_id)
        DO UPDATE SET 
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          hours = EXCLUDED.hours,
          description = EXCLUDED.description,
          support_email = EXCLUDED.support_email,
          sales_email = EXCLUDED.sales_email,
          social_links = EXCLUDED.social_links,
          updated_at = CURRENT_TIMESTAMP
      `, [
        homepageId,
        contact.email.trim(),
        contact.phone || null,
        contact.address || null,
        contact.hours || null,
        contact.description || null,
        contact.supportEmail || null,
        contact.salesEmail || null,
        JSON.stringify(contact.socialLinks || {})
      ]);

      // Handle FAQs if provided
      if (faqs && Array.isArray(faqs)) {
        // Delete existing FAQs for this homepage
        await client.query('DELETE FROM homepage_faqs WHERE homepage_id = $1', [homepageId]);
        
        // Insert new FAQs
        for (let i = 0; i < faqs.length; i++) {
          const faq = faqs[i];
          if (faq.question && faq.answer) {
            await client.query(`
              INSERT INTO homepage_faqs (homepage_id, question, answer, order_index, is_active)
              VALUES ($1, $2, $3, $4, $5)
            `, [
              homepageId,
              faq.question.trim(),
              faq.answer.trim(),
              faq.order || (i + 1),
              faq.isActive !== undefined ? faq.isActive : true
            ]);
          }
        }
      }

      await client.query('COMMIT');

      // Fetch the complete updated data
      const updatedHomepage = await req.pool.query(`
        SELECT 
          h.id,
          h.language,
          h.version,
          h.created_at,
          h.updated_at,
          -- Hero section
          hh.id as hero_id,
          hh.title as hero_title,
          hh.subtitle as hero_subtitle,
          hh.background_image as hero_background_image,
          hh.cta_text as hero_cta_text,
          hh.cta_link as hero_cta_link,
          hh.created_at as hero_created_at,
          hh.updated_at as hero_updated_at,
          -- About section
          ha.id as about_id,
          ha.title as about_title,
          ha.content as about_content,
          ha.image as about_image,
          ha.features as about_features,
          ha.created_at as about_created_at,
          ha.updated_at as about_updated_at,
          -- Contact section
          hc.id as contact_id,
          hc.email as contact_email,
          hc.phone as contact_phone,
          hc.address as contact_address,
          hc.hours as contact_hours,
          hc.description as contact_description,
          hc.support_email as contact_support_email,
          hc.sales_email as contact_sales_email,
          hc.social_links as contact_social_links,
          hc.created_at as contact_created_at,
          hc.updated_at as contact_updated_at
        FROM homepage h
        LEFT JOIN homepage_hero hh ON h.id = hh.homepage_id
        LEFT JOIN homepage_about ha ON h.id = ha.homepage_id
        LEFT JOIN homepage_contact hc ON h.id = hc.homepage_id
        WHERE h.id = $1
      `, [homepageId]);

      const faqsResult = await req.pool.query(`
        SELECT 
          id,
          question,
          answer,
          order_index,
          is_active,
          created_at,
          updated_at
        FROM homepage_faqs 
        WHERE homepage_id = $1
        ORDER BY order_index ASC
      `, [homepageId]);

      const row = updatedHomepage.rows[0];
      
      const responseData = {
        id: `homepage_${language}_${row.id.toString().padStart(3, '0')}`,
        language: row.language,
        hero: {
          id: `hero_${row.hero_id?.toString().padStart(3, '0')}`,
          title: row.hero_title,
          subtitle: row.hero_subtitle,
          backgroundImage: row.hero_background_image,
          ctaText: row.hero_cta_text,
          ctaLink: row.hero_cta_link,
          createdAt: row.hero_created_at?.toISOString(),
          updatedAt: row.hero_updated_at?.toISOString()
        },
        about: {
          id: `about_${row.about_id?.toString().padStart(3, '0')}`,
          title: row.about_title,
          content: row.about_content,
          image: row.about_image,
          features: row.about_features || [],
          createdAt: row.about_created_at?.toISOString(),
          updatedAt: row.about_updated_at?.toISOString()
        },
        contact: {
          id: `contact_${row.contact_id?.toString().padStart(3, '0')}`,
          email: row.contact_email,
          phone: row.contact_phone,
          address: row.contact_address,
          hours: row.contact_hours,
          description: row.contact_description,
          supportEmail: row.contact_support_email,
          salesEmail: row.contact_sales_email,
          socialLinks: row.contact_social_links || {},
          createdAt: row.contact_created_at?.toISOString(),
          updatedAt: row.contact_updated_at?.toISOString()
        },
        faqs: faqsResult.rows.map(faq => ({
          id: `faq_${faq.id.toString().padStart(3, '0')}`,
          question: faq.question,
          answer: faq.answer,
          order: faq.order_index,
          isActive: faq.is_active,
          createdAt: faq.created_at?.toISOString(),
          updatedAt: faq.updated_at?.toISOString()
        })),
        createdAt: row.created_at?.toISOString(),
        updatedAt: row.updated_at?.toISOString(),
        version: row.version
      };

      res.status(isUpdate ? 200 : 201).json({
        success: true,
        data: responseData
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Error in POST /homepage/content:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/homepage/faqs:
 *   post:
 *     summary: Create a new FAQ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - language
 *               - question
 *               - answer
 *             properties:
 *               language:
 *                 type: string
 *                 example: 'en'
 *               question:
 *                 type: string
 *                 example: 'How do I reset my password?'
 *               answer:
 *                 type: string
 *                 example: 'Click on Forgot Password on the login page...'
 *               order:
 *                 type: integer
 *                 example: 3
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: FAQ created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/FAQ'
 */
// POST new FAQ
router.post('/homepage/faqs', async (req, res) => {
  try {
    const { language, question, answer, order, isActive } = req.body;

    // Validation
    if (!language || language.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Language is required'
      });
    }

    if (!question || question.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    if (!answer || answer.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Answer is required'
      });
    }

    // Get homepage ID
    const homepageResult = await req.pool.query(
      'SELECT id FROM homepage WHERE language = $1',
      [language]
    );

    if (!homepageResult.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Homepage not found for the specified language'
      });
    }

    const homepageId = homepageResult.rows[0].id;
    
    // Get next order if not provided
    let faqOrder = order;
    if (!faqOrder) {
      const maxOrderResult = await req.pool.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM homepage_faqs WHERE homepage_id = $1',
        [homepageId]
      );
      faqOrder = maxOrderResult.rows[0].next_order;
    }

    // Insert FAQ
    const result = await req.pool.query(`
      INSERT INTO homepage_faqs (homepage_id, question, answer, order_index, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      homepageId,
      question.trim(),
      answer.trim(),
      faqOrder,
      isActive !== undefined ? isActive : true
    ]);

    const faq = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: `faq_${faq.id.toString().padStart(3, '0')}`,
        question: faq.question,
        answer: faq.answer,
        order: faq.order_index,
        isActive: faq.is_active,
        createdAt: faq.created_at?.toISOString(),
        updatedAt: faq.updated_at?.toISOString()
      }
    });

  } catch (err) {
    console.error('Error in POST /homepage/faqs:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/homepage/faqs/{id}:
 *   put:
 *     summary: Update an FAQ by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FAQ ID (numeric part, e.g., '3' for 'faq_003')
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 example: 'How do I reset my password?'
 *               answer:
 *                 type: string
 *                 example: 'Updated answer: Click on Forgot Password and follow the email instructions...'
 *               order:
 *                 type: integer
 *                 example: 3
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: FAQ updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/FAQ'
 *       404:
 *         description: FAQ not found
 *   delete:
 *     summary: Delete an FAQ by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FAQ ID (numeric part, e.g., '3' for 'faq_003')
 *     responses:
 *       200:
 *         description: FAQ deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted:
 *                       type: boolean
 *       404:
 *         description: FAQ not found
 */
// PUT update FAQ by ID
router.put('/homepage/faqs/:id', async (req, res) => {
  try {
    const faqId = parseInt(req.params.id);
    const { question, answer, order, isActive } = req.body;

    if (!faqId || isNaN(faqId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid FAQ ID is required'
      });
    }

    // Check if FAQ exists
    const existingFaq = await req.pool.query(
      'SELECT * FROM homepage_faqs WHERE id = $1',
      [faqId]
    );

    if (!existingFaq.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'FAQ not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (question !== undefined && question.trim() !== '') {
      updateFields.push(`question = $${paramCount}`);
      updateValues.push(question.trim());
      paramCount++;
    }

    if (answer !== undefined && answer.trim() !== '') {
      updateFields.push(`answer = $${paramCount}`);
      updateValues.push(answer.trim());
      paramCount++;
    }

    if (order !== undefined) {
      updateFields.push(`order_index = $${paramCount}`);
      updateValues.push(order);
      paramCount++;
    }

    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      updateValues.push(isActive);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(faqId);

    const updateQuery = `
      UPDATE homepage_faqs 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await req.pool.query(updateQuery, updateValues);
    const updatedFaq = result.rows[0];

    res.json({
      success: true,
      data: {
        id: `faq_${updatedFaq.id.toString().padStart(3, '0')}`,
        question: updatedFaq.question,
        answer: updatedFaq.answer,
        order: updatedFaq.order_index,
        isActive: updatedFaq.is_active,
        createdAt: updatedFaq.created_at?.toISOString(),
        updatedAt: updatedFaq.updated_at?.toISOString()
      }
    });

  } catch (err) {
    console.error('Error in PUT /homepage/faqs/:id:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// DELETE FAQ by ID
router.delete('/homepage/faqs/:id', async (req, res) => {
  try {
    const faqId = parseInt(req.params.id);

    if (!faqId || isNaN(faqId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid FAQ ID is required'
      });
    }

    // Check if FAQ exists
    const existingFaq = await req.pool.query(
      'SELECT id FROM homepage_faqs WHERE id = $1',
      [faqId]
    );

    if (!existingFaq.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'FAQ not found'
      });
    }

    // Delete FAQ
    await req.pool.query('DELETE FROM homepage_faqs WHERE id = $1', [faqId]);

    res.json({
      success: true,
      data: {
        deleted: true
      }
    });

  } catch (err) {
    console.error('Error in DELETE /homepage/faqs/:id:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

module.exports = router;
