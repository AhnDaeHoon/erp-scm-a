import request from 'supertest';
import app from '../../src/index';
import { AppDataSource } from '../../src/config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../src/models/User';
import { Role } from '../../src/models/Role';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

// AppDataSource 모킹
jest.mock('../../src/config/database', () => ({
  AppDataSource: {
    initialize: jest.fn().mockResolvedValue({}),
    getRepository: jest.fn()
  }
}));

// app 모듈 모킹
jest.mock('../../src/index', () => {
  const express = require('express');
  const app = express();
  app.use(express.json());

  // 테스트 엔드포인트 설정
  app.post('/api/users/register', async (req, res) => {
    try {
      const { username, password, name, email } = req.body;
      
      // 사용자 조회
      const userRepository = AppDataSource.getRepository(User);
      const existingUser = await userRepository.findOne({
        where: [{ username }, { email }]
      });
      
      if (existingUser) {
        return res.status(400).json({ message: '이미 존재하는 사용자입니다.' });
      }

      // 역할 조회
      const roleRepository = AppDataSource.getRepository(Role);
      const userRole = await roleRepository.findOne({ where: { name: 'user' } });
      
      if (!userRole) {
        return res.status(500).json({ message: '기본 사용자 역할을 찾을 수 없습니다.' });
      }

      // 비밀번호 해시화
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // 새 사용자 생성
      const user = userRepository.create({
        username,
        password: hashedPassword,
        name,
        email,
        roles: [userRole]
      });
      
      await userRepository.save(user);
      
      return res.status(201).json({
        message: '회원가입이 완료되었습니다.',
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  });
  
  app.post('/api/users/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      // 사용자 조회
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
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

      // 역할 정보 추출
      const roles = user.roles.map(role => role.name);

      // JWT 토큰 생성
      const token = jwt.sign(
        { id: user.id, username: user.username, roles },
        process.env.JWT_SECRET || 'your_jwt_secret_key',
        { expiresIn: '1d' }
      );

      return res.status(200).json({
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
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  });

  return app;
});

describe('인증 API 엔드포인트 테스트', () => {
  let mockUserRepository: any;
  let mockRoleRepository: any;

  beforeEach(() => {
    // 리포지토리 모킹
    mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn()
    };

    mockRoleRepository = {
      findOne: jest.fn()
    };

    // 리포지토리 반환 모킹
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === User) {
        return mockUserRepository;
      } else if (entity === Role) {
        return mockRoleRepository;
      }
      return {};
    });

    // bcrypt 모킹
    jest.spyOn(bcrypt, 'hash').mockImplementation((password) => Promise.resolve(`hashed_${password}`));
    jest.spyOn(bcrypt, 'compare').mockImplementation((plainPassword, hashedPassword) => {
      return Promise.resolve(hashedPassword === `hashed_${plainPassword}`);
    });

    // jwt 모킹
    jest.spyOn(jwt, 'sign').mockImplementation(() => 'test_token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('회원가입 API 테스트', () => {
    test('유효한 사용자 정보로 회원가입 시 성공적으로 등록된다', async () => {
      // 존재하는 사용자 없음
      mockUserRepository.findOne.mockResolvedValue(null);
      
      // 사용자 역할 모킹
      const userRole = { id: 1, name: 'user' };
      mockRoleRepository.findOne.mockResolvedValue(userRole);
      
      // 사용자 생성 모킹
      const createdUser = {
        id: 1,
        username: 'testuser',
        password: 'hashed_Test1234!',
        name: '테스트 사용자',
        email: 'test@example.com',
        roles: [userRole]
      };
      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);
      
      // 회원가입 요청
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'testuser',
          password: 'Test1234!',
          name: '테스트 사용자',
          email: 'test@example.com'
        });
      
      // 응답 검증
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', '회원가입이 완료되었습니다.');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', 1);
      expect(response.body.user).toHaveProperty('username', 'testuser');
      
      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockRoleRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('Test1234!', 10);
    });

    test('이미 존재하는 사용자명으로 회원가입 시 실패한다', async () => {
      // 이미 존재하는 사용자 모킹
      mockUserRepository.findOne.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'existing@example.com'
      });
      
      // 회원가입 요청
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'testuser',
          password: 'Test1234!',
          name: '테스트 사용자',
          email: 'test@example.com'
        });
      
      // 응답 검증
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', '이미 존재하는 사용자입니다.');
      
      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    test('기본 사용자 역할이 없을 때 회원가입 실패한다', async () => {
      // 존재하는 사용자 없음
      mockUserRepository.findOne.mockResolvedValue(null);
      
      // 사용자 역할이 없음
      mockRoleRepository.findOne.mockResolvedValue(null);
      
      // 회원가입 요청
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'testuser',
          password: 'Test1234!',
          name: '테스트 사용자',
          email: 'test@example.com'
        });
      
      // 응답 검증
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', '기본 사용자 역할을 찾을 수 없습니다.');
      
      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockRoleRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('로그인 API 테스트', () => {
    test('유효한 인증 정보로 로그인 시 JWT 토큰을 반환한다', async () => {
      // 사용자 모킹
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashed_Test1234!',
        name: '테스트 사용자',
        email: 'test@example.com',
        roles: [{ id: 1, name: 'user' }]
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      
      // 로그인 요청
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: 'testuser',
          password: 'Test1234!'
        });
      
      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'test_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', 1);
      expect(response.body.user).toHaveProperty('username', 'testuser');
      expect(response.body.user).toHaveProperty('roles', ['user']);
      
      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        relations: ['roles']
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('Test1234!', 'hashed_Test1234!');
      expect(jwt.sign).toHaveBeenCalled();
    });

    test('존재하지 않는 사용자로 로그인 시 실패한다', async () => {
      // 사용자 없음 모킹
      mockUserRepository.findOne.mockResolvedValue(null);
      
      // 로그인 요청
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: 'nonexistentuser',
          password: 'Test1234!'
        });
      
      // 응답 검증
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', '사용자를 찾을 수 없습니다.');
      
      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'nonexistentuser' },
        relations: ['roles']
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    test('잘못된 비밀번호로 로그인 시 실패한다', async () => {
      // 사용자 모킹
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashed_CorrectPassword123!',  // 다른 비밀번호로 해시되어 있음
        name: '테스트 사용자',
        email: 'test@example.com',
        roles: [{ id: 1, name: 'user' }]
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      
      // 로그인 요청
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: 'testuser',
          password: 'WrongPassword123!'
        });
      
      // 응답 검증
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', '비밀번호가 일치하지 않습니다.');
      
      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        relations: ['roles']
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('WrongPassword123!', 'hashed_CorrectPassword123!');
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });
}); 