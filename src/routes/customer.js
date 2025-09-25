
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// USERS
router.get('/users', customerController.listUsers);
router.post('/users/add', customerController.saveUser);
router.get('/users/delete/:id', customerController.deleteUser);
router.get('/users/edit/:id', customerController.editUser);
router.post('/users/update/:id', customerController.updateUser);

// CATEGORY
router.get('/categories', customerController.listCategories);
router.post('/categories/add', customerController.saveCategory);
router.get('/categories/delete/:id', customerController.deleteCategory);
router.get('/categories/edit/:id', customerController.editCategory);
router.post('/categories/update/:id', customerController.updateCategory);

// SUBCATEGORY
router.get('/subcategories', customerController.listSubcategories);
router.post('/subcategories/add', customerController.saveSubcategory);
router.get('/subcategories/delete/:id', customerController.deleteSubcategory);
router.get('/subcategories/edit/:id', customerController.editSubcategory);
router.post('/subcategories/update/:id', customerController.updateSubcategory);

module.exports = router;

// USERS
router.get('/users', customerController.listUsers);
router.post('/users/add', customerController.saveUser);
router.get('/users/delete/:id', customerController.deleteUser);
router.get('/users/edit/:id', customerController.editUser);
router.post('/users/update/:id', customerController.updateUser);

// CATEGORY
router.get('/categories', customerController.listCategories);
router.post('/categories/add', customerController.saveCategory);
router.get('/categories/delete/:id', customerController.deleteCategory);
router.get('/categories/edit/:id', customerController.editCategory);
router.post('/categories/update/:id', customerController.updateCategory);

// SUBCATEGORY
router.get('/subcategories', customerController.listSubcategories);
router.post('/subcategories/add', customerController.saveSubcategory);
router.get('/subcategories/delete/:id', customerController.deleteSubcategory);
router.get('/subcategories/edit/:id', customerController.editSubcategory);
router.post('/subcategories/update/:id', customerController.updateSubcategory);

module.exports = router;