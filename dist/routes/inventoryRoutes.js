"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const InventoryController_1 = require("../controllers/InventoryController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
const inventoryController = new InventoryController_1.InventoryController();
// 입고 관리 라우트
router.get('/in', authMiddleware_1.authMiddleware, inventoryController.getAllInventoryIn);
router.get('/in/:id', authMiddleware_1.authMiddleware, inventoryController.getInventoryInById);
router.post('/in', authMiddleware_1.authMiddleware, inventoryController.createInventoryIn);
router.put('/in/:id', authMiddleware_1.authMiddleware, inventoryController.updateInventoryIn);
router.delete('/in/:id', authMiddleware_1.authMiddleware, inventoryController.deleteInventoryIn);
// 출고 관리 라우트
router.get('/out', authMiddleware_1.authMiddleware, inventoryController.getAllInventoryOut);
router.get('/out/:id', authMiddleware_1.authMiddleware, inventoryController.getInventoryOutById);
router.post('/out', authMiddleware_1.authMiddleware, inventoryController.createInventoryOut);
router.put('/out/:id', authMiddleware_1.authMiddleware, inventoryController.updateInventoryOut);
router.delete('/out/:id', authMiddleware_1.authMiddleware, inventoryController.deleteInventoryOut);
// 재고 현황 라우트
router.get('/status', authMiddleware_1.authMiddleware, inventoryController.getInventoryStatus);
router.get('/history', authMiddleware_1.authMiddleware, inventoryController.getInventoryHistory);
exports.default = router;
