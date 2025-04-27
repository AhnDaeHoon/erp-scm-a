"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProductController_1 = require("../controllers/ProductController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
const productController = new ProductController_1.ProductController();
// 제품 조회 라우트
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
// 제품 관리 라우트 (인증 필요)
router.post('/', authMiddleware_1.authMiddleware, productController.createProduct);
router.put('/:id', authMiddleware_1.authMiddleware, productController.updateProduct);
router.delete('/:id', authMiddleware_1.authMiddleware, productController.deleteProduct);
// 재고 관리 라우트
router.get('/:id/inventory', authMiddleware_1.authMiddleware, productController.getInventoryHistory);
router.post('/:id/inventory/in', authMiddleware_1.authMiddleware, productController.addInventory);
router.post('/:id/inventory/out', authMiddleware_1.authMiddleware, productController.removeInventory);
exports.default = router;
