const express = require('express');
const router = express.Router();
const subscriptionPlansController = require('../controllers/subscriptionPlansController');

/**
 * @swagger
 * /api/features-plans:
 *   get:
 *     tags: [Subscription Plans]
 *     summary: Get all subscription plans
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, features, or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Draft, Inactive]
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of subscription plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                 meta:
 *                   type: object
 */
router.get('/', subscriptionPlansController.listSubscriptionPlans);

/**
 * @swagger
 * /api/features-plans/stats:
 *   get:
 *     tags: [Subscription Plans]
 *     summary: Get subscription plans statistics
 *     responses:
 *       200:
 *         description: Subscription plans statistics
 */
router.get('/stats', subscriptionPlansController.getSubscriptionPlansStats);

/**
 * @swagger
 * /api/features-plans/active:
 *   get:
 *     tags: [Subscription Plans]
 *     summary: Get active subscription plans
 *     responses:
 *       200:
 *         description: List of active subscription plans
 */
router.get('/active', subscriptionPlansController.getActiveSubscriptionPlans);

/**
 * @swagger
 * /api/features-plans:
 *   post:
 *     tags: [Subscription Plans]
 *     summary: Create a new subscription plan
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - features
 *               - description
 *               - type
 *               - status
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Basic Plan'
 *               features:
 *                 type: string
 *                 example: 'Access to basic courses, Community support'
 *               description:
 *                 type: string
 *                 example: 'Perfect for beginners starting their learning journey'
 *               type:
 *                 type: string
 *                 example: 'Basic'
 *               status:
 *                 type: string
 *                 enum: [Active, Draft, Inactive]
 *                 example: 'Active'
 *     responses:
 *       201:
 *         description: Subscription plan created
 *       400:
 *         description: Bad request
 *       409:
 *         description: Plan with same name already exists
 */
router.post('/', subscriptionPlansController.createSubscriptionPlan);

/**
 * @swagger
 * /api/features-plans/{id}:
 *   get:
 *     tags: [Subscription Plans]
 *     summary: Get subscription plan by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan details
 *       404:
 *         description: Subscription plan not found
 */
router.get('/:id', subscriptionPlansController.getSubscriptionPlan);

/**
 * @swagger
 * /api/features-plans/{id}:
 *   put:
 *     tags: [Subscription Plans]
 *     summary: Update subscription plan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - features
 *               - description
 *               - type
 *               - status
 *             properties:
 *               name:
 *                 type: string
 *               features:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription plan updated
 *       404:
 *         description: Subscription plan not found
 */
router.put('/:id', subscriptionPlansController.updateSubscriptionPlan);

/**
 * @swagger
 * /api/features-plans/{id}:
 *   delete:
 *     tags: [Subscription Plans]
 *     summary: Delete subscription plan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan deleted
 *       404:
 *         description: Subscription plan not found
 */
router.delete('/:id', subscriptionPlansController.deleteSubscriptionPlan);

module.exports = router;
