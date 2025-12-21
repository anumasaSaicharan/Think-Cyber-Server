const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/dashboard/analytics/users:
 *   get:
 *     summary: Get user analytics data
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 12m]
 *           default: 30d
 *         description: Date range for analytics
 *     responses:
 *       200:
 *         description: User analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       count:
 *                         type: integer
 */
// GET /api/dashboard/analytics/users - Get user analytics
router.get('/dashboard/analytics/users', async (req, res) => {
    try {
        const { range = '30d' } = req.query;

        let dateFilter = '';
        let interval = 'day';

        // Determine date filter and interval based on range
        if (range === '7d') {
            dateFilter = `created_at >= NOW() - INTERVAL '7 days'`;
        } else if (range === '30d') {
            dateFilter = `created_at >= NOW() - INTERVAL '30 days'`;
        } else if (range === '90d') {
            dateFilter = `created_at >= NOW() - INTERVAL '90 days'`;
        } else if (range === '12m') {
            dateFilter = `created_at >= NOW() - INTERVAL '1 year'`;
            interval = 'month';
        } else {
            // Default to 30d
            dateFilter = `created_at >= NOW() - INTERVAL '30 days'`;
        }

        const query = `
      SELECT 
        DATE_TRUNC($1, created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE ${dateFilter}
      GROUP BY date
      ORDER BY date ASC
    `;

        const result = await req.pool.query(query, [interval]);

        const data = result.rows.map(row => ({
            date: row.date,
            count: parseInt(row.count)
        }));

        res.json({
            success: true,
            data
        });

    } catch (err) {
        console.error('Error in GET /dashboard/analytics/users:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Internal server error'
        });
    }
});

module.exports = router;
