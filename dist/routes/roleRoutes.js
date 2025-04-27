"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RoleController_1 = require("../controllers/RoleController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
const roleController = new RoleController_1.RoleController();
// 모든 역할 조회 (인증 필요)
router.get('/', authMiddleware_1.authMiddleware, roleController.getAllRoles);
// 특정 역할 조회 (인증 필요)
router.get('/:id', authMiddleware_1.authMiddleware, roleController.getRoleById);
// 역할 관리 라우트 (admin 역할 필요)
router.post('/', authMiddleware_1.authMiddleware, (0, authMiddleware_1.hasRole)(['admin']), roleController.createRole);
router.put('/:id', authMiddleware_1.authMiddleware, (0, authMiddleware_1.hasRole)(['admin']), roleController.updateRole);
router.delete('/:id', authMiddleware_1.authMiddleware, (0, authMiddleware_1.hasRole)(['admin']), roleController.deleteRole);
exports.default = router;
