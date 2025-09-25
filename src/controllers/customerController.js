
const controller = {};

// USERS CRUD
controller.listUsers = async (req, res) => {
    try {
        const result = await req.pool.query('SELECT * FROM users');
        res.status(200).json({ success: true, data: result.rows });
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