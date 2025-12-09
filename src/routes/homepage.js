const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Get dashboard overview statistics
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                     totalUsers:
 *                       type: integer
 *                       example: 16
 *                     verifiedUsers:
 *                       type: integer
 *                       example: 12
 *                     totalTopics:
 *                       type: integer
 *                       example: 31
 *                     totalEnrollments:
 *                       type: integer
 *                       example: 45
 *                     enrolledTopics:
 *                       type: integer
 *                       example: 45
 *                     completedTopics:
 *                       type: integer
 *                       example: 28
 *                     topicsInProgress:
 *                       type: integer
 *                       example: 17
 *                     totalWatchTime:
 *                       type: string
 *                       example: "125h 30m"
 *                     totalWatchTimeSeconds:
 *                       type: integer
 *                       example: 451800
 *                     newUsersThisMonth:
 *                       type: integer
 *                       example: 2
 *                     enrollmentsThisMonth:
 *                       type: integer
 *                       example: 8
 *                     userGrowth:
 *                       type: string
 *                       example: "+12.5%"
 *                     enrollmentGrowth:
 *                       type: string
 *                       example: "+8.3%"
 *                     completionRate:
 *                       type: string
 *                       example: "68.2%"
 *                     averageRating:
 *                       type: string
 *                       example: "4.6"
 */
// GET /api/dashboard/overview - Dashboard overview statistics
router.get('/dashboard/overview', async (req, res) => {
  try {
    // Get total users and verified users
    const usersQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users
      FROM users
    `;

    // Get total topics
    const topicsQuery = `
      SELECT COUNT(*) as total_topics
      FROM topics
      WHERE status = 'published'
    `;

    // Get enrollment statistics from user_topics
    const enrollmentsQuery = `
      SELECT 
        COUNT(*) as total_enrollments,
        COUNT(DISTINCT CASE WHEN payment_status = 'completed' THEN topic_id END) as completed_topics,
        COUNT(DISTINCT CASE WHEN payment_status IN ('pending', 'processing', 'active') THEN topic_id END) as topics_in_progress
      FROM user_topics
      WHERE payment_status IS NOT NULL
    `;

    // Get total watch time from user_topic_progress
    const watchTimeQuery = `
      SELECT COALESCE(SUM(watch_time), 0) as total_watch_time_seconds
      FROM user_topic_progress
    `;

    // Get new users this month
    const newUsersQuery = `
      SELECT COUNT(*) as new_users_this_month
      FROM users
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
    `;

    // Get enrollments this month from user_topics
    const enrollmentsThisMonthQuery = `
      SELECT COUNT(*) as enrollments_this_month
      FROM user_topics
      WHERE DATE_TRUNC('month', enrolled_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
    `;

    // Get user growth (compare this month vs last month)
    const userGrowthQuery = `
      SELECT 
        COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN 1 END) as current_month,
        COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP - INTERVAL '1 month') THEN 1 END) as last_month
      FROM users
    `;

    // Get enrollment growth (compare this month vs last month) from user_topics
    const enrollmentGrowthQuery = `
      SELECT 
        COUNT(CASE WHEN DATE_TRUNC('month', enrolled_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN 1 END) as current_month,
        COUNT(CASE WHEN DATE_TRUNC('month', enrolled_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP - INTERVAL '1 month') THEN 1 END) as last_month
      FROM user_topics
    `;

    // Get completion rate from user_topics
    const completionRateQuery = `
      SELECT 
        COUNT(DISTINCT topic_id) as total,
        COUNT(DISTINCT CASE WHEN payment_status = 'completed' THEN topic_id END) as completed
      FROM user_topics
      WHERE payment_status IS NOT NULL
    `;

    // Get average rating
    const averageRatingQuery = `
      SELECT COALESCE(AVG(rating), 0) as average_rating
      FROM topic_reviews
      WHERE is_approved = true
    `;

    // Execute all queries in parallel
    const [
      usersResult,
      topicsResult,
      enrollmentsResult,
      watchTimeResult,
      newUsersResult,
      enrollmentsThisMonthResult,
      userGrowthResult,
      enrollmentGrowthResult,
      completionRateResult,
      averageRatingResult
    ] = await Promise.all([
      req.pool.query(usersQuery),
      req.pool.query(topicsQuery),
      req.pool.query(enrollmentsQuery),
      req.pool.query(watchTimeQuery),
      req.pool.query(newUsersQuery),
      req.pool.query(enrollmentsThisMonthQuery),
      req.pool.query(userGrowthQuery),
      req.pool.query(enrollmentGrowthQuery),
      req.pool.query(completionRateQuery),
      req.pool.query(averageRatingQuery)
    ]);

    // Parse results
    const totalUsers = parseInt(usersResult.rows[0]?.total_users || 0);
    const verifiedUsers = parseInt(usersResult.rows[0]?.verified_users || 0);
    const totalTopics = parseInt(topicsResult.rows[0]?.total_topics || 0);
    const totalEnrollments = parseInt(enrollmentsResult.rows[0]?.total_enrollments || 0);
    const completedTopics = parseInt(enrollmentsResult.rows[0]?.completed_topics || 0);
    const topicsInProgress = parseInt(enrollmentsResult.rows[0]?.topics_in_progress || 0);
    const totalWatchTimeSeconds = parseInt(watchTimeResult.rows[0]?.total_watch_time_seconds || 0);
    const newUsersThisMonth = parseInt(newUsersResult.rows[0]?.new_users_this_month || 0);
    const enrollmentsThisMonth = parseInt(enrollmentsThisMonthResult.rows[0]?.enrollments_this_month || 0);

    // Calculate user growth percentage
    const userGrowthData = userGrowthResult.rows[0];
    const currentMonthUsers = parseInt(userGrowthData?.current_month || 0);
    const lastMonthUsers = parseInt(userGrowthData?.last_month || 0);
    let userGrowth = "+0.0%";
    if (lastMonthUsers > 0) {
      const growthPercent = ((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100;
      userGrowth = `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%`;
    } else if (currentMonthUsers > 0) {
      userGrowth = "+100.0%";
    }

    // Calculate enrollment growth percentage
    const enrollmentGrowthData = enrollmentGrowthResult.rows[0];
    const currentMonthEnrollments = parseInt(enrollmentGrowthData?.current_month || 0);
    const lastMonthEnrollments = parseInt(enrollmentGrowthData?.last_month || 0);
    let enrollmentGrowth = "+0.0%";
    if (lastMonthEnrollments > 0) {
      const growthPercent = ((currentMonthEnrollments - lastMonthEnrollments) / lastMonthEnrollments) * 100;
      enrollmentGrowth = `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%`;
    } else if (currentMonthEnrollments > 0) {
      enrollmentGrowth = "+100.0%";
    }

    // Calculate completion rate
    const completionRateData = completionRateResult.rows[0];
    const totalEnrollmentsForRate = parseInt(completionRateData?.total || 0);
    const completedEnrollments = parseInt(completionRateData?.completed || 0);
    const completionRate = totalEnrollmentsForRate > 0 
      ? `${((completedEnrollments / totalEnrollmentsForRate) * 100).toFixed(1)}%`
      : "0.0%";

    // Calculate average rating
    const avgRating = parseFloat(averageRatingResult.rows[0]?.average_rating || 0);
    const averageRating = avgRating.toFixed(1);

    // Format watch time (convert seconds to hours and minutes)
    const hours = Math.floor(totalWatchTimeSeconds / 3600);
    const minutes = Math.floor((totalWatchTimeSeconds % 3600) / 60);
    const totalWatchTime = `${hours}h ${minutes}m`;

    res.json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        totalTopics,
        totalEnrollments,
        enrolledTopics: totalEnrollments, // Same as totalEnrollments
        completedTopics,
        topicsInProgress,
        totalWatchTime,
        totalWatchTimeSeconds,
        newUsersThisMonth,
        enrollmentsThisMonth,
        userGrowth,
        enrollmentGrowth,
        completionRate,
        averageRating
      }
    });

  } catch (err) {
    console.error('Error in GET /dashboard/overview:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/dashboard/updates:
 *   get:
 *     summary: Get dashboard updates with user enrollments and subscriptions
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: tab
 *         schema:
 *           type: string
 *           enum: [enrolled, subscription]
 *         description: Filter by tab type (enrolled or subscription)
 *         example: enrolled
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Filter by month (e.g., '2024-12' for December 2024)
 *         example: '2024-12'
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom date range (YYYY-MM-DD)
 *         example: '2024-12-01'
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom date range (YYYY-MM-DD)
 *         example: '2024-12-31'
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: User enrollments/subscriptions retrieved successfully
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
 *                       id:
 *                         type: integer
 *                       userId:
 *                         type: integer
 *                       userName:
 *                         type: string
 *                       userEmail:
 *                         type: string
 *                       topicId:
 *                         type: integer
 *                       topicTitle:
 *                         type: string
 *                       paymentStatus:
 *                         type: string
 *                       enrolledAt:
 *                         type: string
 *                         format: date-time
 *                       progress:
 *                         type: integer
 *                       watchTime:
 *                         type: string
 *                       subscriptionStartDate:
 *                         type: string
 *                         format: date-time
 *                         description: Subscription start date (for completed/subscription status)
 *                       subscriptionEndDate:
 *                         type: string
 *                         format: date-time
 *                         description: Subscription end date (1 year from start)
 *                       subscriptionValidDays:
 *                         type: integer
 *                         description: Number of days remaining in subscription
 *                       isSubscriptionActive:
 *                         type: boolean
 *                         description: Whether subscription is currently active
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalCount:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                 filters:
 *                   type: object
 *                   properties:
 *                     tab:
 *                       type: string
 *                     month:
 *                       type: string
 *                     fromDate:
 *                       type: string
 *                     toDate:
 *                       type: string
 */
// GET /api/dashboard/updates - Get user enrollments and subscriptions with filters
router.get('/dashboard/updates', async (req, res) => {
  try {
    const { 
      tab = 'enrolled', 
      month, 
      fromDate, 
      toDate,
      page = 1,
      limit = 20
    } = req.query;

    // Validate tab
    if (!['enrolled', 'subscription'].includes(tab)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tab. Must be either "enrolled" or "subscription"'
      });
    }

    const offset = (page - 1) * limit;
    const whereConditions = [];
    const queryParams = [];
    let paramCount = 1;

    // Build WHERE conditions based on tab
    if (tab === 'enrolled') {
      whereConditions.push(`ut.payment_status IN ('completed', 'active', 'pending', 'processing')`);
    } else if (tab === 'subscription') {
      whereConditions.push(`ut.payment_status = 'subscription'`);
    }

    // Date filtering priority: custom date range > month filter
    if (fromDate && toDate) {
      // Custom date range
      whereConditions.push(`DATE(ut.enrolled_at) BETWEEN $${paramCount} AND $${paramCount + 1}`);
      queryParams.push(fromDate, toDate);
      paramCount += 2;
    } else if (month) {
      // Month filter (format: YYYY-MM)
      whereConditions.push(`TO_CHAR(ut.enrolled_at, 'YYYY-MM') = $${paramCount}`);
      queryParams.push(month);
      paramCount += 1;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Main query to get user enrollments with topic and user details
    const dataQuery = `
      SELECT 
        ut.id,
        ut.user_id,
        u.name as user_name,
        u.email as user_email,
        ut.topic_id,
        t.title as topic_title,
        ut.payment_status,
        ut.enrolled_at,
        ut.created_at,
        COALESCE(utp.total_progress, 0) as total_progress,
        COALESCE(utp.total_watch_time, 0) as total_watch_time,
        COUNT(*) OVER() as total_count
      FROM user_topics ut
      LEFT JOIN users u ON ut.user_id = u.id
      LEFT JOIN topics t ON ut.topic_id = t.id
      LEFT JOIN (
        SELECT 
          user_id,
          topic_id,
          AVG(progress) as total_progress,
          SUM(watch_time) as total_watch_time
        FROM user_topic_progress
        GROUP BY user_id, topic_id
      ) utp ON ut.user_id = utp.user_id AND ut.topic_id = utp.topic_id
      ${whereClause}
      ORDER BY ut.enrolled_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(parseInt(limit), offset);

    // Execute query
    const result = await req.pool.query(dataQuery, queryParams);

    // Format the results
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Format watch time (seconds to hours and minutes)
    const formatWatchTime = (seconds) => {
      if (!seconds || seconds === 0) return '0h 0m';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    };

    // Calculate subscription validity (1 year from purchase date)
    const calculateSubscriptionValidity = (enrolledDate, paymentStatus) => {
      if (!enrolledDate || !['completed', 'subscription'].includes(paymentStatus)) {
        return {
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          subscriptionValidDays: null,
          isSubscriptionActive: false
        };
      }

      const startDate = new Date(enrolledDate);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1); // Add 1 year

      const today = new Date();
      const validDays = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
      const isActive = today >= startDate && today <= endDate;

      return {
        subscriptionStartDate: startDate.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
        subscriptionValidDays: validDays,
        isSubscriptionActive: isActive
      };
    };

    const formattedData = result.rows.map(row => {
      const subscriptionInfo = calculateSubscriptionValidity(row.enrolled_at, row.payment_status);
      
      return {
        id: row.id,
        userId: row.user_id,
        userName: row.user_name || 'N/A',
        userEmail: row.user_email || 'N/A',
        topicId: row.topic_id,
        topicTitle: row.topic_title || 'Untitled Topic',
        paymentStatus: row.payment_status,
        enrolledAt: row.enrolled_at ? row.enrolled_at.toISOString() : null,
        progress: Math.round(parseFloat(row.total_progress || 0)),
        watchTime: formatWatchTime(row.total_watch_time),
        watchTimeSeconds: parseInt(row.total_watch_time || 0),
        ...subscriptionInfo
      };
    });

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        tab,
        month: month || null,
        fromDate: fromDate || null,
        toDate: toDate || null
      }
    });

  } catch (err) {
    console.error('Error in GET /dashboard/updates:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/dashboard/earnings:
 *   get:
 *     summary: Get monthly earnings data based on successful payments
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year for earnings data (default is current year)
 *         example: 2024
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of months to retrieve (1-12)
 *         example: 7
 *     responses:
 *       200:
 *         description: Monthly earnings data retrieved successfully
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
 *                       month:
 *                         type: string
 *                         example: "Jan"
 *                       value:
 *                         type: number
 *                         description: Total earnings for the month (in dollars/currency)
 *                         example: 1250.50
 *                       count:
 *                         type: integer
 *                         description: Number of successful payments
 *                         example: 25
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalEarnings:
 *                       type: number
 *                       description: Total earnings for the period
 *                     totalTransactions:
 *                       type: integer
 *                       description: Total number of successful transactions
 *                     year:
 *                       type: integer
 *                     monthsIncluded:
 *                       type: integer
 */
// GET /api/dashboard/earnings - Get monthly earnings data
router.get('/dashboard/earnings', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const { 
      year = currentYear,
      months = 12
    } = req.query;

    // Validate months parameter
    const numMonths = Math.min(Math.max(parseInt(months) || 12, 1), 12);
    const targetYear = parseInt(year) || currentYear;

    // Query to get monthly earnings (revenue) from user_topics with successful payments
    const earningsQuery = `
      SELECT 
        TO_CHAR(ut.enrolled_at, 'Mon') as month_name,
        EXTRACT(MONTH FROM ut.enrolled_at) as month_number,
        COALESCE(SUM(t.price), 0) as total_earnings
      FROM user_topics ut
      LEFT JOIN topics t ON ut.topic_id = t.id
      WHERE ut.payment_status IN ('completed', 'paid', 'subscription')
        AND EXTRACT(YEAR FROM ut.enrolled_at) = $1
        AND EXTRACT(MONTH FROM ut.enrolled_at) <= $2
      GROUP BY month_name, month_number
      ORDER BY month_number ASC
    `;

    const result = await req.pool.query(earningsQuery, [targetYear, numMonths]);

    // Month names for formatting
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Create a map of existing data
    const dataMap = {};
    result.rows.forEach(row => {
      const monthIndex = parseInt(row.month_number) - 1;
      dataMap[monthIndex] = {
        month: monthNames[monthIndex],
        value: parseFloat(row.total_earnings || 0)
      };
    });

    // Fill in missing months with zero values
    const formattedData = [];
    for (let i = 0; i < numMonths; i++) {
      if (dataMap[i]) {
        formattedData.push({
          month: monthNames[i],
          value: parseFloat(dataMap[i].value.toFixed(2))
        });
      } else {
        formattedData.push({
          month: monthNames[i],
          value: 0
        });
      }
    }

    res.json(formattedData);

  } catch (err) {
    console.error('Error in GET /dashboard/earnings:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/dashboard/reports/monthly:
 *   get:
 *     summary: Get monthly growth report showing increased amounts
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year for report (default is current year)
 *         example: 2025
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of months to retrieve (1-12)
 *         example: 12
 *     responses:
 *       200:
 *         description: Monthly growth report retrieved successfully
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
 *                       month:
 *                         type: string
 *                         example: "Jan"
 *                       users:
 *                         type: integer
 *                         description: New users registered this month
 *                         example: 15
 *                       enrollments:
 *                         type: integer
 *                         description: New enrollments this month
 *                         example: 45
 *                       revenue:
 *                         type: number
 *                         description: Revenue earned this month
 *                         example: 1250.50
 *                       growth:
 *                         type: string
 *                         description: Percentage growth compared to previous month
 *                         example: "+25.5%"
 */
// GET /api/dashboard/reports/monthly - Get monthly growth report
router.get('/dashboard/reports/monthly', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const { 
      year = currentYear,
      months = 12
    } = req.query;

    const numMonths = Math.min(Math.max(parseInt(months) || 12, 1), 12);
    const targetYear = parseInt(year) || currentYear;

    // Query to get monthly data
    const monthlyQuery = `
      WITH monthly_stats AS (
        SELECT 
          EXTRACT(MONTH FROM enrolled_at) as month_number,
          COUNT(*) as enrollments,
          COALESCE(SUM(t.price), 0) as revenue
        FROM user_topics ut
        LEFT JOIN topics t ON ut.topic_id = t.id
        WHERE ut.payment_status IN ('completed', 'paid', 'subscription')
          AND EXTRACT(YEAR FROM ut.enrolled_at) = $1
          AND EXTRACT(MONTH FROM ut.enrolled_at) <= $2
        GROUP BY month_number
      ),
      monthly_users AS (
        SELECT 
          EXTRACT(MONTH FROM created_at) as month_number,
          COUNT(*) as new_users
        FROM users
        WHERE EXTRACT(YEAR FROM created_at) = $1
          AND EXTRACT(MONTH FROM created_at) <= $2
        GROUP BY month_number
      )
      SELECT 
        COALESCE(ms.month_number, mu.month_number) as month_number,
        COALESCE(mu.new_users, 0) as users,
        COALESCE(ms.enrollments, 0) as enrollments,
        COALESCE(ms.revenue, 0) as revenue
      FROM monthly_stats ms
      FULL OUTER JOIN monthly_users mu ON ms.month_number = mu.month_number
      ORDER BY month_number ASC
    `;

    const result = await req.pool.query(monthlyQuery, [targetYear, numMonths]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Create data map
    const dataMap = {};
    result.rows.forEach(row => {
      const monthIndex = parseInt(row.month_number) - 1;
      dataMap[monthIndex] = {
        users: parseInt(row.users || 0),
        enrollments: parseInt(row.enrollments || 0),
        revenue: parseFloat(row.revenue || 0)
      };
    });

    // Fill in missing months and calculate growth
    const formattedData = [];
    let previousMonthEnrollments = 0;

    for (let i = 0; i < numMonths; i++) {
      const currentData = dataMap[i] || { users: 0, enrollments: 0, revenue: 0 };
      
      // Calculate growth percentage compared to previous month
      let growth = "+0.0%";
      if (i > 0 && previousMonthEnrollments > 0) {
        const growthPercent = ((currentData.enrollments - previousMonthEnrollments) / previousMonthEnrollments) * 100;
        growth = `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%`;
      } else if (i > 0 && currentData.enrollments > 0) {
        growth = "+100.0%";
      } else if (i === 0) {
        growth = "N/A"; // First month has no comparison
      }

      formattedData.push({
        month: monthNames[i],
        users: currentData.users,
        enrollments: currentData.enrollments,
        revenue: parseFloat(currentData.revenue.toFixed(2)),
        growth: growth
      });

      previousMonthEnrollments = currentData.enrollments;
    }

    res.json({
      success: true,
      data: formattedData
    });

  } catch (err) {
    console.error('Error in GET /dashboard/reports/monthly:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/dashboard/reports/monthlyReport:
 *   get:
 *     summary: Get monthly report with earnings, topics, and enrollments for download
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: segment
 *         schema:
 *           type: string
 *           enum: [earnings, topics, enrolled]
 *         required: true
 *         description: Report segment to generate
 *         example: earnings
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Month filter in YYYY-MM format
 *         example: "2025-12"
 *       - in: query
 *         name: download
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Set to true to download as CSV
 *         example: false
 *     responses:
 *       200:
 *         description: Monthly report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 segment:
 *                   type: string
 *                   example: "earnings"
 *                 month:
 *                   type: string
 *                   example: "Dec 2025"
 *                 totalPaymentTransactions:
 *                   type: integer
 *                   example: 2800
 *                 totalTopics:
 *                   type: integer
 *                   example: 5000
 *                 totalEnrolled:
 *                   type: integer
 *                   example: 1200
 *                 totalSubscribed:
 *                   type: integer
 *                   example: 2000
 *                 data:
 *                   type: array
 */
// GET /api/dashboard/reports/monthlyReport - Generate monthly report by segment
router.get('/dashboard/reports/monthlyReport', async (req, res) => {
  try {
    const { segment, month, download } = req.query;

    if (!segment || !['earnings', 'topics', 'enrolled'].includes(segment)) {
      return res.status(400).json({
        success: false,
        error: 'Valid segment parameter required: earnings, topics, or enrolled'
      });
    }

    const shouldDownload = download === 'true' || download === true;
    let whereClause = '';
    let monthDisplay = 'All Time';

    // Apply month filter if provided
    if (month) {
      const [year, monthNum] = month.split('-');
      if (year && monthNum) {
        whereClause = `AND EXTRACT(YEAR FROM ut.enrolled_at) = ${parseInt(year)} AND EXTRACT(MONTH FROM ut.enrolled_at) = ${parseInt(monthNum)}`;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthDisplay = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
      }
    }

    let reportData = [];
    let totals = {
      totalPaymentTransactions: 0,
      totalTopics: 0,
      totalEnrolled: 0,
      totalSubscribed: 0
    };

    if (segment === 'earnings') {
      // Earnings Report - Payment transactions with revenue
      const earningsQuery = `
        SELECT 
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          t.id as topic_id,
          t.title as topic_title,
          ut.payment_status,
          ut.enrolled_at,
          COALESCE(t.price, 0) as amount,
          CASE 
            WHEN ut.payment_status IN ('completed', 'paid') THEN 'Success'
            WHEN ut.payment_status = 'pending' THEN 'Pending'
            ELSE 'Other'
          END as transaction_status
        FROM user_topics ut
        JOIN users u ON ut.user_id = u.id
        JOIN topics t ON ut.topic_id = t.id
        WHERE ut.payment_status IN ('completed', 'paid', 'pending')
        ${whereClause}
        ORDER BY ut.enrolled_at DESC
      `;

      const result = await req.pool.query(earningsQuery);
      reportData = result.rows.map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        topicId: row.topic_id,
        topicTitle: row.topic_title,
        amount: parseFloat(row.amount),
        transactionStatus: row.transaction_status,
        paymentStatus: row.payment_status,
        date: row.enrolled_at
      }));

      // Get totals for earnings
      const totalQuery = `
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(DISTINCT ut.topic_id) as total_topics,
          COUNT(CASE WHEN ut.payment_status IN ('completed', 'paid', 'pending') THEN 1 END) as total_enrolled,
          COUNT(CASE WHEN ut.payment_status = 'subscription' THEN 1 END) as total_subscribed
        FROM user_topics ut
        WHERE ut.payment_status IN ('completed', 'paid', 'pending', 'subscription')
        ${whereClause}
      `;
      const totalResult = await req.pool.query(totalQuery);
      if (totalResult.rows.length > 0) {
        totals.totalPaymentTransactions = parseInt(totalResult.rows[0].total_transactions || 0);
        totals.totalTopics = parseInt(totalResult.rows[0].total_topics || 0);
        totals.totalEnrolled = parseInt(totalResult.rows[0].total_enrolled || 0);
        totals.totalSubscribed = parseInt(totalResult.rows[0].total_subscribed || 0);
      }

    } else if (segment === 'topics') {
      // Topics Report - All topics with enrollment counts
      const topicsQuery = `
        SELECT 
          t.id as topic_id,
          t.title as topic_title,
          t.description,
          COALESCE(t.price, 0) as price,
          COUNT(DISTINCT ut.user_id) FILTER (WHERE ut.payment_status IN ('completed', 'paid', 'pending', 'subscription')) as total_enrollments,
          COUNT(DISTINCT ut.user_id) FILTER (WHERE ut.payment_status IN ('completed', 'paid')) as completed_enrollments,
          COALESCE(AVG(utp.progress), 0) as average_progress
        FROM topics t
        LEFT JOIN user_topics ut ON t.id = ut.topic_id ${whereClause.replace('ut.enrolled_at', 'enrolled_at')}
        LEFT JOIN user_topic_progress utp ON t.id = utp.topic_id
        GROUP BY t.id, t.title, t.description, t.price
        ORDER BY total_enrollments DESC
      `;

      const result = await req.pool.query(topicsQuery);
      reportData = result.rows.map(row => ({
        topicId: row.topic_id,
        topicTitle: row.topic_title,
        description: row.description,
        price: parseFloat(row.price),
        totalEnrollments: parseInt(row.total_enrollments || 0),
        completedEnrollments: parseInt(row.completed_enrollments || 0),
        averageProgress: parseFloat(row.average_progress || 0).toFixed(1)
      }));

      // Get totals for topics
      const totalQuery = `
        SELECT 
          COUNT(DISTINCT t.id) as total_topics,
          COUNT(DISTINCT ut.user_id) FILTER (WHERE ut.payment_status IN ('completed', 'paid', 'pending')) as total_enrolled,
          COUNT(DISTINCT CASE WHEN ut.payment_status IN ('completed', 'paid') THEN ut.id END) as total_transactions,
          COUNT(DISTINCT CASE WHEN ut.payment_status = 'subscription' THEN ut.user_id END) as total_subscribed
        FROM topics t
        LEFT JOIN user_topics ut ON t.id = ut.topic_id ${whereClause.replace('ut.enrolled_at', 'enrolled_at')}
      `;
      const totalResult = await req.pool.query(totalQuery);
      if (totalResult.rows.length > 0) {
        totals.totalTopics = parseInt(totalResult.rows[0].total_topics || 0);
        totals.totalEnrolled = parseInt(totalResult.rows[0].total_enrolled || 0);
        totals.totalPaymentTransactions = parseInt(totalResult.rows[0].total_transactions || 0);
        totals.totalSubscribed = parseInt(totalResult.rows[0].total_subscribed || 0);
      }

    } else if (segment === 'enrolled') {
      // Enrolled Report - Users with their enrollments
      const enrolledQuery = `
        SELECT 
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          t.id as topic_id,
          t.title as topic_title,
          ut.payment_status,
          ut.enrolled_at,
          COALESCE(utp.progress, 0) as progress,
          COALESCE(utp.watch_time, 0) as watch_time,
          CASE 
            WHEN ut.payment_status IN ('completed', 'paid') THEN 'Active'
            WHEN ut.payment_status = 'pending' THEN 'Pending'
            ELSE 'Other'
          END as enrollment_status
        FROM user_topics ut
        JOIN users u ON ut.user_id = u.id
        JOIN topics t ON ut.topic_id = t.id
        LEFT JOIN user_topic_progress utp ON ut.user_id = utp.user_id AND ut.topic_id = utp.topic_id
        WHERE ut.payment_status IN ('completed', 'paid', 'pending', 'active', 'processing')
        ${whereClause}
        ORDER BY ut.enrolled_at DESC
      `;

      const result = await req.pool.query(enrolledQuery);
      reportData = result.rows.map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        topicId: row.topic_id,
        topicTitle: row.topic_title,
        paymentStatus: row.payment_status,
        enrollmentStatus: row.enrollment_status,
        progress: parseFloat(row.progress || 0).toFixed(1),
        watchTime: parseInt(row.watch_time || 0),
        enrolledAt: row.enrolled_at
      }));

      // Get totals for enrolled
      const totalQuery = `
        SELECT 
          COUNT(*) as total_enrolled,
          COUNT(DISTINCT ut.topic_id) as total_topics,
          COUNT(CASE WHEN ut.payment_status IN ('completed', 'paid') THEN 1 END) as total_transactions,
          COUNT(CASE WHEN ut.payment_status = 'subscription' THEN 1 END) as total_subscribed
        FROM user_topics ut
        WHERE ut.payment_status IN ('completed', 'paid', 'pending', 'active', 'processing', 'subscription')
        ${whereClause}
      `;
      const totalResult = await req.pool.query(totalQuery);
      if (totalResult.rows.length > 0) {
        totals.totalEnrolled = parseInt(totalResult.rows[0].total_enrolled || 0);
        totals.totalTopics = parseInt(totalResult.rows[0].total_topics || 0);
        totals.totalPaymentTransactions = parseInt(totalResult.rows[0].total_transactions || 0);
        totals.totalSubscribed = parseInt(totalResult.rows[0].total_subscribed || 0);
      }
    }

    // Download as CSV
    if (shouldDownload) {
      let csvContent = '';
      let filename = `${segment}_report_${monthDisplay.replace(' ', '_')}.csv`;

      if (segment === 'earnings') {
        csvContent = 'User ID,User Name,User Email,Topic ID,Topic Title,Amount,Transaction Status,Payment Status,Date\n';
        reportData.forEach(row => {
          csvContent += `${row.userId},"${row.userName}","${row.userEmail}",${row.topicId},"${row.topicTitle}",${row.amount},${row.transactionStatus},${row.paymentStatus},${row.date}\n`;
        });
      } else if (segment === 'topics') {
        csvContent = 'Topic ID,Topic Title,Description,Price,Total Enrollments,Completed Enrollments,Average Progress\n';
        reportData.forEach(row => {
          csvContent += `${row.topicId},"${row.topicTitle}","${row.description || ''}",${row.price},${row.totalEnrollments},${row.completedEnrollments},${row.averageProgress}\n`;
        });
      } else if (segment === 'enrolled') {
        csvContent = 'User ID,User Name,User Email,Topic ID,Topic Title,Payment Status,Enrollment Status,Progress,Watch Time (seconds),Enrolled At\n';
        reportData.forEach(row => {
          csvContent += `${row.userId},"${row.userName}","${row.userEmail}",${row.topicId},"${row.topicTitle}",${row.paymentStatus},${row.enrollmentStatus},${row.progress},${row.watchTime},${row.enrolledAt}\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvContent);
    }

    // Return JSON response
    res.json({
      success: true,
      data: {
        segment: segment,
        month: monthDisplay,
        totalPaymentTransactions: totals.totalPaymentTransactions,
        totalTopics: totals.totalTopics,
        totalEnrolled: totals.totalEnrolled,
        totalSubscribed: totals.totalSubscribed,
        reportData: reportData
      }
    });

  } catch (err) {
    console.error('Error in GET /dashboard/reports/monthlyReport:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

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
