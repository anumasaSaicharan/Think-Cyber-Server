
const controller = {};

// USERS CRUD
controller.listUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '', role = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM users WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        if (search) {
            query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            countQuery += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        if (status) {
            query += ` AND status = $${paramIndex}`;
            countQuery += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        
        if (role) {
            query += ` AND role = $${paramIndex}`;
            countQuery += ` AND role = $${paramIndex}`;
            params.push(role);
            paramIndex++;
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        
        const [result, countResult] = await Promise.all([
            req.pool.query(query, [...params, limit, offset]),
            req.pool.query(countQuery, params)
        ]);
        
        const total = parseInt(countResult.rows[0].count);
        
        res.status(200).json({ 
            success: true, 
            data: {
                users: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.getUserStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
                COUNT(*) FILTER (WHERE role = 'student') as students,
                COUNT(*) FILTER (WHERE role = 'instructor') as instructors,
                COUNT(*) FILTER (WHERE role = 'admin') as admins,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_this_week,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as new_today
            FROM users
        `;
        
        const result = await req.pool.query(statsQuery);
        const stats = result.rows[0];
        
        res.status(200).json({ 
            success: true, 
            data: {
                totalUsers: parseInt(stats.total) || 0,
                activeUsers: parseInt(stats.active) || 0,
                inactiveUsers: parseInt(stats.inactive) || 0,
                pendingUsers: parseInt(stats.pending) || 0,
                suspendedUsers: parseInt(stats.suspended) || 0,
                newThisMonth: parseInt(stats.new_this_month) || 0,
                newThisWeek: parseInt(stats.new_this_week) || 0,
                newToday: parseInt(stats.new_today) || 0,
                averageEnrollments: 0,
                totalEnrollments: 0,
                totalWatchTime: 0,
                trends: {
                    totalUsers: { value: '+0%', type: 'stable' },
                    activeUsers: { value: '+0%', type: 'stable' },
                    newUsers: { value: '+0%', type: 'stable' }
                },
                byRole: {
                    student: parseInt(stats.students) || 0,
                    instructor: parseInt(stats.instructors) || 0,
                    admin: parseInt(stats.admins) || 0
                }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.saveUser = async (req, res) => {
    const { name, address, phone } = req.body;
    if (!name || !address) {
        return res.status(400).json({ success: false, error: 'Name and address are required.' });
    }
    try {
        await req.pool.query(
            'INSERT INTO users (name, address, phone) VALUES ($1, $2, $3)',
            [name, address, phone || null]
        );
        res.status(201).json({ success: true, message: 'User created successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await req.pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.status(200).json({ success: true, message: 'User deleted successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.editUser = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await req.pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.updateUser = async (req, res) => {
    const { id } = req.params;
    const newUser = req.body;
    const keys = Object.keys(newUser);
    const values = Object.values(newUser);
    if (keys.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update.' });
    }
    const setString = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    try {
        await req.pool.query(`UPDATE users SET ${setString} WHERE id = $${keys.length + 1}`, [...values, id]);
        res.status(200).json({ success: true, message: 'User updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// CATEGORY CRUD
controller.listCategories = async (req, res) => {
    try {
        const result = await req.pool.query('SELECT * FROM category');
        res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.saveCategory = async (req, res) => {
    const data = req.body;
    if (!data.name) {
        return res.status(400).json({ success: false, error: 'Category name is required.' });
    }
    try {
        await req.pool.query('INSERT INTO category (name) VALUES ($1)', [data.name]);
        res.status(201).json({ success: true, message: 'Category created successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        await req.pool.query('DELETE FROM category WHERE id = $1', [id]);
        res.status(200).json({ success: true, message: 'Category deleted successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.editCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await req.pool.query('SELECT * FROM category WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, error: 'Category name is required.' });
    }
    try {
        await req.pool.query('UPDATE category SET name = $1 WHERE id = $2', [name, id]);
        res.status(200).json({ success: true, message: 'Category updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// SUBCATEGORY CRUD
controller.listSubcategories = async (req, res) => {
    try {
        const result = await req.pool.query('SELECT * FROM subcategory');
        res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.saveSubcategory = async (req, res) => {
    const data = req.body;
    if (!data.name || !data.category_id) {
        return res.status(400).json({ success: false, error: 'Subcategory name and category_id are required.' });
    }
    try {
        await req.pool.query('INSERT INTO subcategory (name, category_id) VALUES ($1, $2)', [data.name, data.category_id]);
        res.status(201).json({ success: true, message: 'Subcategory created successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.deleteSubcategory = async (req, res) => {
    const { id } = req.params;
    try {
        await req.pool.query('DELETE FROM subcategory WHERE id = $1', [id]);
        res.status(200).json({ success: true, message: 'Subcategory deleted successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.editSubcategory = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await req.pool.query('SELECT * FROM subcategory WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Subcategory not found.' });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

controller.updateSubcategory = async (req, res) => {
    const { id } = req.params;
    const { name, category_id } = req.body;
    if (!name || !category_id) {
        return res.status(400).json({ success: false, error: 'Subcategory name and category_id are required.' });
    }
    try {
        await req.pool.query('UPDATE subcategory SET name = $1, category_id = $2 WHERE id = $3', [name, category_id, id]);
        res.status(200).json({ success: true, message: 'Subcategory updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = controller;