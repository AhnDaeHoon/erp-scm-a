"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const database_1 = require("./config/database");
const Role_1 = require("./models/Role");
const Permission_1 = require("./models/Permission");
const User_1 = require("./models/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function seedDatabase() {
    try {
        // 데이터베이스 연결
        await database_1.AppDataSource.initialize();
        console.log('데이터베이스 연결 성공');
        const roleRepository = database_1.AppDataSource.getRepository(Role_1.Role);
        const permissionRepository = database_1.AppDataSource.getRepository(Permission_1.Permission);
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        // 기본 권한 생성
        const permissions = [
            // 사용자 관련 권한
            { name: 'user:read', description: '사용자 조회', resource: 'users', action: 'read' },
            { name: 'user:create', description: '사용자 생성', resource: 'users', action: 'create' },
            { name: 'user:update', description: '사용자 수정', resource: 'users', action: 'update' },
            { name: 'user:delete', description: '사용자 삭제', resource: 'users', action: 'delete' },
            // 제품 관련 권한
            { name: 'product:read', description: '제품 조회', resource: 'products', action: 'read' },
            { name: 'product:create', description: '제품 생성', resource: 'products', action: 'create' },
            { name: 'product:update', description: '제품 수정', resource: 'products', action: 'update' },
            { name: 'product:delete', description: '제품 삭제', resource: 'products', action: 'delete' },
            // 주문 관련 권한
            { name: 'order:read', description: '주문 조회', resource: 'orders', action: 'read' },
            { name: 'order:create', description: '주문 생성', resource: 'orders', action: 'create' },
            { name: 'order:update', description: '주문 수정', resource: 'orders', action: 'update' },
            { name: 'order:delete', description: '주문 삭제', resource: 'orders', action: 'delete' },
            // 재고 관련 권한
            { name: 'inventory:read', description: '재고 조회', resource: 'inventory', action: 'read' },
            { name: 'inventory:create', description: '재고 입출고', resource: 'inventory', action: 'create' },
            { name: 'inventory:update', description: '재고 수정', resource: 'inventory', action: 'update' },
            // 역할 관련 권한
            { name: 'role:read', description: '역할 조회', resource: 'roles', action: 'read' },
            { name: 'role:create', description: '역할 생성', resource: 'roles', action: 'create' },
            { name: 'role:update', description: '역할 수정', resource: 'roles', action: 'update' },
            { name: 'role:delete', description: '역할 삭제', resource: 'roles', action: 'delete' },
            // 권한 관련 권한
            { name: 'permission:read', description: '권한 조회', resource: 'permissions', action: 'read' },
            { name: 'permission:create', description: '권한 생성', resource: 'permissions', action: 'create' },
            { name: 'permission:update', description: '권한 수정', resource: 'permissions', action: 'update' },
            { name: 'permission:delete', description: '권한 삭제', resource: 'permissions', action: 'delete' },
        ];
        console.log('권한 생성 중...');
        const savedPermissions = [];
        for (const permissionData of permissions) {
            // 이미 존재하는지 확인
            const existingPermission = await permissionRepository.findOne({
                where: { name: permissionData.name }
            });
            if (!existingPermission) {
                const permission = permissionRepository.create(permissionData);
                const savedPermission = await permissionRepository.save(permission);
                savedPermissions.push(savedPermission);
                console.log(`권한 생성됨: ${permission.name}`);
            }
            else {
                savedPermissions.push(existingPermission);
                console.log(`권한 이미 존재함: ${existingPermission.name}`);
            }
        }
        // 기본 역할 생성
        console.log('역할 생성 중...');
        // 1. 관리자 역할
        let adminRole = await roleRepository.findOne({ where: { name: 'admin' } });
        if (!adminRole) {
            adminRole = roleRepository.create({
                name: 'admin',
                description: '관리자',
                permissions: savedPermissions // 모든 권한
            });
            await roleRepository.save(adminRole);
            console.log('관리자 역할 생성됨');
        }
        else {
            console.log('관리자 역할 이미 존재함');
            // 권한 업데이트
            adminRole.permissions = savedPermissions;
            await roleRepository.save(adminRole);
        }
        // 2. 매니저 역할
        const managerPermissions = savedPermissions.filter(p => !p.name.includes('delete') &&
            !p.name.includes('role:') &&
            !p.name.includes('permission:'));
        let managerRole = await roleRepository.findOne({ where: { name: 'manager' } });
        if (!managerRole) {
            managerRole = roleRepository.create({
                name: 'manager',
                description: '매니저',
                permissions: managerPermissions
            });
            await roleRepository.save(managerRole);
            console.log('매니저 역할 생성됨');
        }
        else {
            console.log('매니저 역할 이미 존재함');
            // 권한 업데이트
            managerRole.permissions = managerPermissions;
            await roleRepository.save(managerRole);
        }
        // 3. 일반 사용자 역할
        const userPermissions = savedPermissions.filter(p => p.name.includes(':read') ||
            p.name === 'order:create' ||
            p.name === 'inventory:read');
        let userRole = await roleRepository.findOne({ where: { name: 'user' } });
        if (!userRole) {
            userRole = roleRepository.create({
                name: 'user',
                description: '일반 사용자',
                permissions: userPermissions
            });
            await roleRepository.save(userRole);
            console.log('일반 사용자 역할 생성됨');
        }
        else {
            console.log('일반 사용자 역할 이미 존재함');
            // 권한 업데이트
            userRole.permissions = userPermissions;
            await roleRepository.save(userRole);
        }
        // 관리자 계정 생성
        console.log('관리자 계정 생성 중...');
        const adminUsername = 'admin';
        let adminUser = await userRepository.findOne({ where: { username: adminUsername } });
        if (!adminUser) {
            const hashedPassword = await bcryptjs_1.default.hash('admin123', 10);
            adminUser = userRepository.create({
                username: adminUsername,
                password: hashedPassword,
                name: '관리자',
                email: 'admin@example.com',
                roles: [adminRole]
            });
            await userRepository.save(adminUser);
            console.log('관리자 계정 생성됨');
        }
        else {
            console.log('관리자 계정 이미 존재함');
            // 역할 업데이트
            adminUser.roles = [adminRole];
            await userRepository.save(adminUser);
        }
        console.log('초기 데이터 생성 완료!');
        process.exit(0);
    }
    catch (error) {
        console.error('초기 데이터 생성 중 오류 발생:', error);
        process.exit(1);
    }
}
seedDatabase();
