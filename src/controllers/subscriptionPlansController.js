const controller = {};

// SUBSCRIPTION PLANS CRUD

// List all subscription plans with optional filters
controller.listSubscriptionPlans = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT id, name, features, description, type, status, created_at, updated_at FROM subscription_plans WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) FROM subscription_plans WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        if (search) {
            query += ` AND (name ILIKE $${paramIndex} OR features ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            countQuery += ` AND (name ILIKE $${paramIndex} OR features ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        if (status) {
            query += ` AND status = $${paramIndex}`;
            countQuery += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        
        // Validate sortBy to prevent SQL injection
        const allowedSortBy = ['created_at', 'updated_at', 'name'];
        const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'created_at';
        const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        query += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        
        const [result, countResult] = await Promise.all([
            req.pool.query(query, [...params, limit, offset]),
            req.pool.query(countQuery, params)
        ]);
        
        const total = parseInt(countResult.rows[0].count);
        
        res.status(200).json({ 
            success: true, 
            data: result.rows,
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error listing subscription plans:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get subscription plan by ID
controller.getSubscriptionPlan = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await req.pool.query(
            'SELECT id, name, features, description, type, status, created_at, updated_at FROM subscription_plans WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Subscription plan not found' 
            });
        }
        
        res.status(200).json({ 
            success: true, 
            data: result.rows[0] 
        });
    } catch (err) {
        console.error('Error fetching subscription plan:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Create new subscription plan
controller.createSubscriptionPlan = async (req, res) => {
    try {
        const { 
            name, 
            features,
            description,
            type = 'Standard',
            status = 'Draft' 
        } = req.body;
        
        // Validation
        if (!name || !features || !description || !type) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: name, features, description, type' 
            });
        }
        
        if (name.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Plan name must be at least 3 characters long' 
            });
        }
        
        // Check if plan with same name already exists
        const existingCheck = await req.pool.query(
            'SELECT id FROM subscription_plans WHERE LOWER(name) = LOWER($1)',
            [name.trim()]
        );
        
        if (existingCheck.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                error: 'A subscription plan with this name already exists' 
            });
        }
        
        const result = await req.pool.query(
            `INSERT INTO subscription_plans 
            (name, features, description, type, status, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
            RETURNING id, name, features, description, type, status, created_at, updated_at`,
            [name.trim(), features.trim(), description.trim(), type.trim(), status]
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'Subscription plan created successfully',
            data: result.rows[0] 
        });
    } catch (err) {
        console.error('Error creating subscription plan:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Update subscription plan
controller.updateSubscriptionPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            features,
            description,
            type,
            status 
        } = req.body;
        
        // Validation
        if (!name || !features || !description || !type || !status) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: name, features, description, type, status' 
            });
        }
        
        if (name.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Plan name must be at least 3 characters long' 
            });
        }
        
        // Check if plan exists
        const planCheck = await req.pool.query(
            'SELECT id FROM subscription_plans WHERE id = $1',
            [id]
        );
        
        if (planCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Subscription plan not found' 
            });
        }
        
        // Check if another plan with same name already exists
        const duplicateCheck = await req.pool.query(
            'SELECT id FROM subscription_plans WHERE LOWER(name) = LOWER($1) AND id != $2',
            [name.trim(), id]
        );
        
        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                error: 'A subscription plan with this name already exists' 
            });
        }
        
        const result = await req.pool.query(
            `UPDATE subscription_plans 
            SET name = $1, features = $2, description = $3, type = $4, status = $5, updated_at = NOW()
            WHERE id = $6 
            RETURNING id, name, features, description, type, status, created_at, updated_at`,
            [name.trim(), features.trim(), description.trim(), type.trim(), status, id]
        );
        
        res.status(200).json({ 
            success: true, 
            message: 'Subscription plan updated successfully',
            data: result.rows[0] 
        });
    } catch (err) {
        console.error('Error updating subscription plan:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Delete subscription plan
controller.deleteSubscriptionPlan = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if plan exists
        const planCheck = await req.pool.query(
            'SELECT id FROM subscription_plans WHERE id = $1',
            [id]
        );
        
        if (planCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Subscription plan not found' 
            });
        }
        
        const result = await req.pool.query(
            'DELETE FROM subscription_plans WHERE id = $1 RETURNING id, name, features, description, type, status, created_at, updated_at',
            [id]
        );
        
        res.status(200).json({ 
            success: true, 
            message: 'Subscription plan deleted successfully',
            data: result.rows[0] 
        });
    } catch (err) {
        console.error('Error deleting subscription plan:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get subscription plans statistics
controller.getSubscriptionPlansStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'Active') as active,
                COUNT(*) FILTER (WHERE status = 'Draft') as draft,
                COUNT(*) FILTER (WHERE status = 'Inactive') as inactive
            FROM subscription_plans
        `;
        
        const result = await req.pool.query(statsQuery);
        const stats = result.rows[0];
        
        res.status(200).json({ 
            success: true, 
            data: {
                total: parseInt(stats.total) || 0,
                active: parseInt(stats.active) || 0,
                draft: parseInt(stats.draft) || 0,
                inactive: parseInt(stats.inactive) || 0
            }
        });
    } catch (err) {
        console.error('Error fetching subscription plans stats:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get active subscription plans
controller.getActiveSubscriptionPlans = async (req, res) => {
    try {
        const result = await req.pool.query(
            'SELECT id, name, features, description, status, created_at, updated_at FROM subscription_plans WHERE status = $1 ORDER BY name ASC',
            ['Active']
        );
        
        res.status(200).json({ 
            success: true, 
            data: result.rows 
        });
    } catch (err) {
        console.error('Error fetching active subscription plans:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = controller;
