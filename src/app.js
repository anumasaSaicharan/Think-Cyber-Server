const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const { Pool } = require('pg');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ThinkCyber API Documentation',
      version: '1.0.0',
      description: 'API documentation for ThinkCyber platform',
    },
    servers: [
      {
        url: 'https://thinkcyber-server.onrender.com',
      },
    ],
    components: {
      schemas: {
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Cybersecurity Fundamentals' },
            description: { type: 'string', example: 'Basic cybersecurity concepts and principles' },
            topicsCount: { type: 'integer', example: 25 },
            status: { type: 'string', enum: ['Active', 'Inactive', 'Draft'], example: 'Active' },
            createdAt: { type: 'string', format: 'date', example: '2024-01-15' },
            updatedAt: { type: 'string', format: 'date', example: '2024-01-15' },
          },
        },
        SubCategory: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Network Security' },
            description: { type: 'string', example: 'Understanding network security protocols and practices' },
            categoryId: { type: 'integer', example: 1 },
            categoryName: { type: 'string', example: 'Cybersecurity Fundamentals' },
            topicsCount: { type: 'integer', example: 12 },
            status: { type: 'string', enum: ['Active', 'Inactive', 'Draft'], example: 'Active' },
            createdAt: { type: 'string', format: 'date', example: '2024-01-16' },
            updatedAt: { type: 'string', format: 'date', example: '2024-01-16' },
          },
        },
        Homepage: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'homepage_en_001' },
            language: { type: 'string', example: 'en' },
            hero: { $ref: '#/components/schemas/Hero' },
            about: { $ref: '#/components/schemas/About' },
            contact: { $ref: '#/components/schemas/Contact' },
            faqs: { type: 'array', items: { $ref: '#/components/schemas/FAQ' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            version: { type: 'integer', example: 1 },
          },
        },
        Hero: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'hero_001' },
            title: { type: 'string', example: 'Welcome to ThinkCyber' },
            subtitle: { type: 'string', example: 'Advanced Cybersecurity Training Platform' },
            backgroundImage: { type: 'string', example: 'https://example.com/hero-bg.jpg' },
            ctaText: { type: 'string', example: 'Get Started' },
            ctaLink: { type: 'string', example: '/dashboard' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        About: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'about_001' },
            title: { type: 'string', example: 'About Our Platform' },
            content: { type: 'string', example: 'We provide comprehensive cybersecurity training...' },
            image: { type: 'string', example: 'https://example.com/about-image.jpg' },
            features: { type: 'array', items: { type: 'string' }, example: ['Interactive Learning', 'Real-world Scenarios', 'Expert Instructors'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Contact: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'contact_001' },
            email: { type: 'string', example: 'info@thinkcyber.com' },
            phone: { type: 'string', example: '+1-555-0123' },
            address: { type: 'string', example: '123 Security St, Cyber City, CC 12345' },
            hours: { type: 'string', example: '9 AM - 6 PM EST' },
            description: { type: 'string', example: 'Get in touch with our team' },
            supportEmail: { type: 'string', example: 'support@thinkcyber.com' },
            salesEmail: { type: 'string', example: 'sales@thinkcyber.com' },
            socialLinks: {
              type: 'object',
              properties: {
                facebook: { type: 'string', example: 'https://facebook.com/thinkcyber' },
                twitter: { type: 'string', example: 'https://twitter.com/thinkcyber' },
                linkedin: { type: 'string', example: 'https://linkedin.com/company/thinkcyber' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        FAQ: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'faq_001' },
            question: { type: 'string', example: 'What is cybersecurity training?' },
            answer: { type: 'string', example: 'Cybersecurity training teaches you to protect systems...' },
            order: { type: 'integer', example: 1 },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        TermsConditions: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Terms and Conditions for ThinkCyber Platform' },
            content: { type: 'string', example: 'These terms and conditions outline the rules and regulations...' },
            version: { type: 'string', example: '1.0' },
            language: { type: 'string', example: 'en' },
            status: { type: 'string', enum: ['Draft', 'Active', 'Inactive', 'Archived'], example: 'Draft' },
            effectiveDate: { type: 'string', format: 'date', example: '2025-08-01' },
            createdAt: { type: 'string', format: 'date-time', example: '2025-08-01T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-08-01T10:30:00Z' },
            createdBy: { type: 'string', example: 'admin' },
            updatedBy: { type: 'string', example: 'admin' },
          },
        },
        PrivacyPolicy: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Privacy Policy for ThinkCyber Platform' },
            content: { type: 'string', example: 'This privacy policy explains how we collect, use, and protect...' },
            version: { type: 'string', example: '1.0' },
            language: { type: 'string', example: 'en' },
            status: { type: 'string', enum: ['Draft', 'Active', 'Inactive', 'Archived'], example: 'Draft' },
            effectiveDate: { type: 'string', format: 'date', example: '2025-08-01' },
            createdAt: { type: 'string', format: 'date-time', example: '2025-08-01T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-08-01T10:30:00Z' },
            createdBy: { type: 'string', example: 'admin' },
            updatedBy: { type: 'string', example: 'admin' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec), cookieParser());

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
}); 
// Importing routes
const customerRoutes = require('./routes/customer');
const categoryRoutes = require('./routes/category');
const subcategoryRoutes = require('./routes/subcategory');
const termsConditionsRoutes = require('./routes/terms-conditions');
const privacyPoliciesRoutes = require('./routes/privacy-policies');
const homepageRoutes = require('./routes/homepage');
const topicsRoutes = require('./routes/topics');
const topicsActionsRoutes = require('./routes/topicsActions');
const topicsModulesRoutes = require('./routes/topicsModules');
const topicsVideosRoutes = require('./routes/topicsVideos');
const uploadRoutes = require('./routes/upload');
const uploadS3Routes = require('./routes/upload-s3');
const authRouter = require('./routes/auth');
const enrollmentRoutes = require('./routes/enrollment');

// settings
app.set('port', process.env.PORT || 8080);

// middlewares
app.use(morgan('dev'));
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:8082', 'http://localhost:3000'], // your frontend URLs
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Make pool available in req
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Routes
app.use('/api', customerRoutes);
app.use('/api', categoryRoutes);
app.use('/api', subcategoryRoutes);
app.use('/api', termsConditionsRoutes);
app.use('/api', privacyPoliciesRoutes);
app.use('/api', homepageRoutes);
app.use('/api', topicsRoutes);
app.use('/api', topicsActionsRoutes);
app.use('/api', topicsModulesRoutes);
app.use('/api', topicsVideosRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/upload-s3', uploadS3Routes);

app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/auth', authRouter);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Starting the server
app.listen(app.get('port'), () => {
  console.log('Server on port ' + app.get('port'));
});
