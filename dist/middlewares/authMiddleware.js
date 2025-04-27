"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = exports.hasRole = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const database_1 = require("../config/database");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const authMiddleware = async (req, res, next) => {
    try {
        // 토큰 추출
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: '인증 토큰이 없습니다.' });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: '유효하지 않은 토큰 형식입니다.' });
        }
        // 토큰 검증
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // 사용자 조회 (역할 관계 포함)
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({
            where: { id: decoded.id },
            relations: ['roles', 'roles.permissions']
        });
        if (!user) {
            return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        // 요청 객체에 사용자 정보 추가
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
        }
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};
exports.authMiddleware = authMiddleware;
// 특정 역할을 가진 사용자만 접근 허용하는 미들웨어
const hasRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: '인증이 필요합니다.' });
        }
        const userRoles = req.user.roles.map(role => role.name);
        const hasRequiredRole = roles.some(role => userRoles.includes(role));
        if (!hasRequiredRole) {
            return res.status(403).json({ message: '접근 권한이 없습니다.' });
        }
        next();
    };
};
exports.hasRole = hasRole;
// 특정 권한을 가진 사용자만 접근 허용하는 미들웨어
const hasPermission = (resource, action) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: '인증이 필요합니다.' });
        }
        // 사용자의 모든 역할에서 권한 목록 추출
        const permissions = req.user.roles.flatMap(role => role.permissions);
        // 필요한 권한이 있는지 확인
        const hasRequiredPermission = permissions.some(permission => permission.resource === resource && permission.action === action);
        if (!hasRequiredPermission) {
            return res.status(403).json({ message: '접근 권한이 없습니다.' });
        }
        next();
    };
};
exports.hasPermission = hasPermission;
