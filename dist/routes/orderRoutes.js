"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const OrderController_1 = require("../controllers/OrderController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
const orderController = new OrderController_1.OrderController();
// 주문 조회 라우트
router.get('/', authMiddleware_1.authMiddleware, orderController.getAllOrders);
router.get('/:id', authMiddleware_1.authMiddleware, orderController.getOrderById);
// 주문 관리 라우트
router.post('/', authMiddleware_1.authMiddleware, orderController.createOrder);
router.put('/:id', authMiddleware_1.authMiddleware, orderController.updateOrder);
router.delete('/:id', authMiddleware_1.authMiddleware, orderController.deleteOrder);
// 주문 상태 관리 라우트
router.put('/:id/status', authMiddleware_1.authMiddleware, orderController.updateOrderStatus);
router.get('/:id/items', authMiddleware_1.authMiddleware, orderController.getOrderItems);
exports.default = router;
