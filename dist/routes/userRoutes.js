"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
const userController = new UserController_1.UserController();
// 인증 관련 라우트
router.post('/login', userController.login);
router.post('/register', userController.register);
// 모든 사용자 조회 (admin 역할 필요)
router.get('/', authMiddleware_1.authMiddleware, (0, authMiddleware_1.hasPermission)('users', 'read'), userController.getAllUsers);
// 특정 사용자 조회 (본인 또는 admin 역할 필요)
router.get('/:id', authMiddleware_1.authMiddleware, userController.getUserById);
// 사용자 정보 수정 (본인 또는 admin 역할 필요)
router.put('/:id', authMiddleware_1.authMiddleware, userController.updateUser);
// 사용자 삭제 (admin 역할 필요)
router.delete('/:id', authMiddleware_1.authMiddleware, (0, authMiddleware_1.hasRole)(['admin']), userController.deleteUser);
exports.default = router;
