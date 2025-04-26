import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Role } from '../models/Role';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/authMiddleware';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export class UserController {
    private userRepository = AppDataSource.getRepository(User);
    private roleRepository = AppDataSource.getRepository(Role);

    // 로그인
    public login = async (req: Request, res: Response) => {
        try {
            const { username, password } = req.body;

            // 사용자 조회 (역할 관계 포함)
            const user = await this.userRepository.findOne({ 
                where: { username },
                relations: ['roles']
            });
            
            if (!user) {
                return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
            }

            // 비밀번호 검증
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
            }

            // 사용자 역할 정보
            const roles = user.roles.map(role => role.name);

            // JWT 토큰 생성
            const token = jwt.sign(
                { id: user.id, username: user.username, roles },
                JWT_SECRET,
                { expiresIn: '1d' }
            );

            return res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    roles
                }
            });
        } catch (error) {
            console.error('로그인 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 회원가입
    public register = async (req: Request, res: Response) => {
        try {
            const { username, password, name, email } = req.body;

            // 사용자 중복 확인
            const existingUser = await this.userRepository.findOne({ 
                where: [{ username }, { email }] 
            });
            if (existingUser) {
                return res.status(400).json({ message: '이미 존재하는 사용자입니다.' });
            }

            // 비밀번호 해시화
            const hashedPassword = await bcrypt.hash(password, 10);

            // 기본 사용자 역할 조회
            const userRole = await this.roleRepository.findOne({ where: { name: 'user' } });
            if (!userRole) {
                return res.status(500).json({ message: '기본 사용자 역할을 찾을 수 없습니다.' });
            }

            // 사용자 생성
            const user = this.userRepository.create({
                username,
                password: hashedPassword,
                name,
                email,
                roles: [userRole]
            });

            await this.userRepository.save(user);

            return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
        } catch (error) {
            console.error('회원가입 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 전체 사용자 조회
    public getAllUsers = async (req: AuthRequest, res: Response) => {
        try {
            const users = await this.userRepository.find({
                select: ['id', 'username', 'name', 'email', 'isActive', 'createdAt'],
                relations: ['roles']
            });
            
            // 응답 데이터 가공
            const formattedUsers = users.map(user => ({
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                isActive: user.isActive,
                roles: user.roles.map(role => role.name),
                createdAt: user.createdAt
            }));
            
            return res.json(formattedUsers);
        } catch (error) {
            console.error('사용자 조회 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 특정 사용자 조회
    public getUserById = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const user = await this.userRepository.findOne({ 
                where: { id: parseInt(id) },
                select: ['id', 'username', 'name', 'email', 'isActive', 'createdAt'],
                relations: ['roles']
            });

            if (!user) {
                return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
            }

            // 응답 데이터 가공
            const formattedUser = {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                isActive: user.isActive,
                roles: user.roles.map(role => role.name),
                createdAt: user.createdAt
            };

            return res.json(formattedUser);
        } catch (error) {
            console.error('사용자 조회 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 사용자 정보 수정
    public updateUser = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { name, email, roleIds } = req.body;

            const user = await this.userRepository.findOne({ 
                where: { id: parseInt(id) },
                relations: ['roles']
            });
            
            if (!user) {
                return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
            }

            // 자신 또는 관리자만 사용자 정보 수정 가능
            const isAdmin = req.user?.roles.some(role => role.name === 'admin');
            if (!isAdmin && req.user?.id !== parseInt(id)) {
                return res.status(403).json({ message: '권한이 없습니다.' });
            }

            // 정보 업데이트
            user.name = name || user.name;
            user.email = email || user.email;

            // 관리자만 역할 수정 가능
            if (isAdmin && roleIds) {
                const roles = await this.roleRepository.findByIds(roleIds);
                user.roles = roles;
            }

            await this.userRepository.save(user);

            return res.json({ message: '사용자 정보가 업데이트되었습니다.' });
        } catch (error) {
            console.error('사용자 정보 수정 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 사용자 삭제
    public deleteUser = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;

            // 관리자 권한 확인
            const isAdmin = req.user?.roles.some(role => role.name === 'admin');
            if (!isAdmin) {
                return res.status(403).json({ message: '권한이 없습니다.' });
            }

            const user = await this.userRepository.findOne({ where: { id: parseInt(id) } });
            if (!user) {
                return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
            }

            await this.userRepository.remove(user);

            return res.json({ message: '사용자가 삭제되었습니다.' });
        } catch (error) {
            console.error('사용자 삭제 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };
} 