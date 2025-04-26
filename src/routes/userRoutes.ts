import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware, hasRole, hasPermission } from '../middlewares/authMiddleware';

const router = Router();
const userController = new UserController();

// 인증 관련 라우트
router.post('/login', userController.login);
router.post('/register', userController.register);

// 모든 사용자 조회 (admin 역할 필요)
router.get('/', 
    authMiddleware, 
    hasPermission('users', 'read'), 
    userController.getAllUsers
);

// 특정 사용자 조회 (본인 또는 admin 역할 필요)
router.get('/:id', 
    authMiddleware, 
    userController.getUserById
);

// 사용자 정보 수정 (본인 또는 admin 역할 필요)
router.put('/:id', 
    authMiddleware, 
    userController.updateUser
);

// 사용자 삭제 (admin 역할 필요)
router.delete('/:id', 
    authMiddleware, 
    hasRole(['admin']), 
    userController.deleteUser
);

export default router; 