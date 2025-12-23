const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const pool = new Pool();

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'thinkCyberAdminKey2024';

// Middleware to verify JWT token or Admin API key
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-admin-api-key'];
  
  // First check for Admin API key
  if (apiKey && apiKey === ADMIN_API_KEY) {
    req.user = { id: 'admin', isAdmin: true };
    return next();
  }
  
  // Otherwise check for Bearer token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

/**
 * @swagger
 * tags:
 *   - name: App Settings
 *     description: App configuration and version management
 */

/**
 * @swagger
 * /api/app-settings/version:
 *   get:
 *     tags: [App Settings]
 *     summary: Get app version info for force update check
 *     description: Public endpoint for mobile apps to check for updates
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [android, ios]
 *         description: Platform to get store URL for
 *       - in: query
 *         name: currentVersionCode
 *         schema:
 *           type: integer
 *         description: Current app version code to check against
 *     responses:
 *       200:
 *         description: Version info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 updateRequired:
 *                   type: boolean
 *                 forceUpdate:
 *                   type: boolean
 *                 latestVersionName:
 *                   type: string
 *                 latestVersionCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 storeUrl:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.get('/version', async (req, res) => {
  const { platform, currentVersionCode } = req.query;

  try {
    const result = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'app_version'"
    );

    if (!result.rows.length) {
      return res.json({
        success: true,
        data: {
          updateRequired: false,
          forceUpdate: false,
          latestVersionName: '1.0.0',
          latestVersionCode: 1,
          minVersionCode: 1,
          message: '',
          androidStoreUrl: '',
          iosStoreUrl: '',
          storeUrl: ''
        }
      });
    }

    const settings = result.rows[0].setting_value;
    
    // Determine if update is required based on current version
    let updateRequired = settings.updateRequired;
    let forceUpdate = settings.forceUpdate;

    if (currentVersionCode) {
      const currentCode = parseInt(currentVersionCode);
      // Update required if current version is less than latest
      updateRequired = currentCode < settings.latestVersionCode;
      // Force update if current version is less than minimum required
      forceUpdate = settings.forceUpdate && currentCode < (settings.minVersionCode || settings.latestVersionCode);
    }

    // Select appropriate store URL based on platform
    let storeUrl = settings.androidStoreUrl || '';
    if (platform === 'ios') {
      storeUrl = settings.iosStoreUrl || '';
    }

    res.json({
      success: true,
      data: {
        updateRequired,
        forceUpdate,
        latestVersionName: settings.latestVersionName,
        latestVersionCode: settings.latestVersionCode,
        minVersionCode: settings.minVersionCode,
        message: settings.message,
        androidStoreUrl: settings.androidStoreUrl,
        iosStoreUrl: settings.iosStoreUrl,
        storeUrl
      }
    });
  } catch (error) {
    console.error('Error fetching version info:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch version info' });
  }
});

/**
 * @swagger
 * /api/app-settings/version:
 *   put:
 *     tags: [App Settings]
 *     summary: Update app version settings (Admin)
 *     description: Update version info and force update settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updateRequired:
 *                 type: boolean
 *                 description: Whether an update is available
 *               forceUpdate:
 *                 type: boolean
 *                 description: Whether to force users to update
 *               latestVersionName:
 *                 type: string
 *                 example: '1.3.0'
 *               latestVersionCode:
 *                 type: integer
 *                 example: 26
 *               minVersionCode:
 *                 type: integer
 *                 description: Minimum version code required (below this = force update)
 *                 example: 20
 *               message:
 *                 type: string
 *                 example: 'A new version is available with performance improvements.'
 *               androidStoreUrl:
 *                 type: string
 *                 example: 'https://play.google.com/store/apps/details?id=com.thinkcyber.app'
 *               iosStoreUrl:
 *                 type: string
 *                 example: 'https://apps.apple.com/app/thinkcyber/id123456789'
 *     responses:
 *       200:
 *         description: Version settings updated
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/version', verifyToken, async (req, res) => {
  const {
    updateRequired,
    forceUpdate,
    latestVersionName,
    latestVersionCode,
    minVersionCode,
    message,
    androidStoreUrl,
    iosStoreUrl
  } = req.body;

  try {
    // Get current settings
    const currentResult = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'app_version'"
    );

    let currentSettings = {};
    if (currentResult.rows.length) {
      currentSettings = currentResult.rows[0].setting_value;
    }

    // Merge with new settings
    const newSettings = {
      ...currentSettings,
      ...(updateRequired !== undefined && { updateRequired }),
      ...(forceUpdate !== undefined && { forceUpdate }),
      ...(latestVersionName && { latestVersionName }),
      ...(latestVersionCode !== undefined && { latestVersionCode }),
      ...(minVersionCode !== undefined && { minVersionCode }),
      ...(message !== undefined && { message }),
      ...(androidStoreUrl !== undefined && { androidStoreUrl }),
      ...(iosStoreUrl !== undefined && { iosStoreUrl })
    };

    // Upsert settings
    const result = await pool.query(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES ('app_version', $1::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = $1::jsonb, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [JSON.stringify(newSettings)]
    );

    res.json({
      success: true,
      message: 'Version settings updated successfully',
      data: result.rows[0].setting_value
    });
  } catch (error) {
    console.error('Error updating version settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update version settings' });
  }
});

/**
 * @swagger
 * /api/app-settings/trigger-force-update:
 *   post:
 *     tags: [App Settings]
 *     summary: Trigger force update for all users (Admin)
 *     description: Quickly enable force update with a message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latestVersionName
 *               - latestVersionCode
 *             properties:
 *               latestVersionName:
 *                 type: string
 *                 example: '2.0.0'
 *               latestVersionCode:
 *                 type: integer
 *                 example: 30
 *               minVersionCode:
 *                 type: integer
 *                 description: Minimum version required
 *                 example: 25
 *               message:
 *                 type: string
 *                 example: 'Critical update required. Please update to continue using the app.'
 *     responses:
 *       200:
 *         description: Force update triggered
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/trigger-force-update', verifyToken, async (req, res) => {
  const { latestVersionName, latestVersionCode, minVersionCode, message } = req.body;

  if (!latestVersionName || latestVersionCode === undefined) {
    return res.status(400).json({
      success: false,
      error: 'latestVersionName and latestVersionCode are required'
    });
  }

  try {
    // Get current settings
    const currentResult = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'app_version'"
    );

    let currentSettings = {};
    if (currentResult.rows.length) {
      currentSettings = currentResult.rows[0].setting_value;
    }

    // Update with force update enabled
    const newSettings = {
      ...currentSettings,
      updateRequired: true,
      forceUpdate: true,
      latestVersionName,
      latestVersionCode,
      minVersionCode: minVersionCode || latestVersionCode,
      message: message || 'A critical update is required. Please update to continue using the app.'
    };

    const result = await pool.query(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES ('app_version', $1::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = $1::jsonb, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [JSON.stringify(newSettings)]
    );

    res.json({
      success: true,
      message: 'Force update triggered successfully',
      data: result.rows[0].setting_value
    });
  } catch (error) {
    console.error('Error triggering force update:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger force update' });
  }
});

/**
 * @swagger
 * /api/app-settings/disable-force-update:
 *   post:
 *     tags: [App Settings]
 *     summary: Disable force update (Admin)
 *     description: Turn off force update requirement
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Force update disabled
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/disable-force-update', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE app_settings 
       SET setting_value = setting_value || '{"forceUpdate": false, "updateRequired": false}'::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE setting_key = 'app_version'
       RETURNING *`
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    res.json({
      success: true,
      message: 'Force update disabled successfully',
      data: result.rows[0].setting_value
    });
  } catch (error) {
    console.error('Error disabling force update:', error);
    res.status(500).json({ success: false, error: 'Failed to disable force update' });
  }
});

/**
 * @swagger
 * /api/app-settings:
 *   get:
 *     tags: [App Settings]
 *     summary: Get all app settings (Admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All app settings
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM app_settings ORDER BY setting_key');

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = {
        value: row.setting_value,
        description: row.description,
        updatedAt: row.updated_at
      };
    });

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching app settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch app settings' });
  }
});

module.exports = router;
