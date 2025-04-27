import request from 'supertest';
import { AppDataSource } from '../../src/config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../src/models/User';
import { Role } from '../../src/models/Role';
import express from 'express';

// 기본 Express 앱 생성
const app = express();
app.use(express.json());

// 테스트용 컨트롤러
const mockUserController = {
  register: async (req, res) => {
    try {
      const { username, password, name, email } = req.body;
      
      // 사용자 중복 확인
      const userRepository = AppDataSource.getRepository(User);
      const existingUser = await userRepository.findOne({ 
        where: [{ username }, { email }] 
      });
      
      if (existingUser) {
        return res.status(400).json({ message: '이미 존재하는 사용자입니다.' });
      }
      
      // 기본 사용자 역할 조회
      const roleRepository = AppDataSource.getRepository(Role);
      const userRole = await roleRepository.findOne({ where: { name: 'user' } });
      
      if (!userRole) {
        return res.status(500).json({ message: '기본 사용자 역할을 찾을 수 없습니다.' });
      }
      
      // 비밀번호 해시화
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // 사용자 생성
      const user = userRepository.create({
        username,
        password: hashedPassword,
        name,
        email,
        roles: [userRole]
      });
      
      await userRepository.save(user);
      
      return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  },
  
  login: async (req, res) => {
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
      
      // 역할 정보
      const roles = user.roles.map(role => role.name);
      
      // JWT 토큰 생성
      const token = jwt.sign(
        { id: user.id, username: user.username, roles },
        process.env.JWT_SECRET || 'your_jwt_secret_key',
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
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
};

// 라우트 설정
app.post('/api/users/register', mockUserController.register);
app.post('/api/users/login', mockUserController.login);

// AppDataSource 모킹
jest.mock('../../src/config/database', () => ({
  AppDataSource: {
    initialize: jest.fn().mockResolvedValue({}),
    getRepository: jest.fn()
  }
}));

describe('사용자 인증 통합 테스트', () => {
  let mockUserRepository: any;
  let mockRoleRepository: any;

  beforeEach(() => {
    // 테스트용 사용자 및 역할 리포지토리 모킹
    mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn()
    };

    mockRoleRepository = {
      findOne: jest.fn()
    };

    // 모킹된 리포지토리 반환
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === User) {
        return mockUserRepository;
      } else if (entity === Role) {
        return mockRoleRepository;
      }
      return {};
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 회원가입 테스트
  describe('회원가입 API', () => {
    const registerEndpoint = '/api/users/register';
    const testUser = {
      username: 'testuser',
      password: 'Password123!',
      name: '테스트 사용자',
      email: 'test@example.com'
    };

    test('유효한 정보로 회원가입 시 성공적으로 등록된다', async () => {
      // 기존 사용자 없음 모킹
      mockUserRepository.findOne.mockResolvedValue(null);
      
      // 기본 사용자 역할 모킹
      const userRole = { 
        id: 1, 
        name: 'user', 
        permissions: [],
        description: '',
        users: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockRoleRepository.findOne.mockResolvedValue(userRole);

      // 새 사용자 생성 모킹
      mockUserRepository.create.mockImplementation((userData) => ({
        ...userData,
        id: 1
      }));
      mockUserRepository.save.mockResolvedValue({ id: 1 });

      // 회원가입 요청
      const response = await request(app)
        .post(registerEndpoint)
        .send(testUser);

      // 응답 검증
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', '회원가입이 완료되었습니다.');
      
      // 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({ where: { name: 'user' } });
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();

      // 비밀번호 해싱 검증
      const createdUser = mockUserRepository.create.mock.calls[0][0];
      expect(createdUser.password).not.toBe(testUser.password); // 비밀번호는 해싱되어야 함
      
      // 역할 할당 검증
      expect(createdUser.roles).toEqual([userRole]);
    });

    test('이미 존재하는 사용자명으로 회원가입 시 실패한다', async () => {
      // 기존 사용자 존재 모킹
      mockUserRepository.findOne.mockResolvedValue({ id: 1, username: testUser.username });
      
      // 회원가입 요청
      const response = await request(app)
        .post(registerEndpoint)
        .send(testUser);

      // 응답 검증
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', '이미 존재하는 사용자입니다.');
      
      // 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    test('기본 사용자 역할이 없을 때 회원가입 실패한다', async () => {
      // 기존 사용자 없음 모킹
      mockUserRepository.findOne.mockResolvedValue(null);
      
      // 기본 사용자 역할이 없음 모킹
      mockRoleRepository.findOne.mockResolvedValue(null);

      // 회원가입 요청
      const response = await request(app)
        .post(registerEndpoint)
        .send(testUser);

      // 응답 검증
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', '기본 사용자 역할을 찾을 수 없습니다.');
      
      // 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({ where: { name: 'user' } });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  // 로그인 테스트
  describe('로그인 API', () => {
    const loginEndpoint = '/api/users/login';
    const testCredentials = {
      username: 'testuser',
      password: 'Password123!'
    };

    test('유효한 인증 정보로 로그인 시 JWT 토큰을 반환한다', async () => {
      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(testCredentials.password, 10);
      
      // 사용자 및 역할 모킹
      const mockUser = {
        id: 1,
        username: testCredentials.username,
        password: hashedPassword,
        name: '테스트 사용자',
        email: 'test@example.com',
        roles: [{ name: 'user', id: 1 }]
      };
      
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      
      // JWT verify 모킹 (토큰 검증을 위함)
      jest.spyOn(jwt, 'sign').mockImplementation(() => 'mocked_token');

      // 로그인 요청
      const response = await request(app)
        .post(loginEndpoint)
        .send(testCredentials);

      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBe('mocked_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', testCredentials.username);
      
      // 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: testCredentials.username },
        relations: ['roles']
      });
      expect(jwt.sign).toHaveBeenCalled();
    });

    test('존재하지 않는 사용자로 로그인 시 실패한다', async () => {
      // 사용자 없음 모킹
      mockUserRepository.findOne.mockResolvedValue(null);
      
      // 로그인 요청
      const response = await request(app)
        .post(loginEndpoint)
        .send(testCredentials);

      // 응답 검증
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', '사용자를 찾을 수 없습니다.');
      
      // 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: testCredentials.username },
        relations: ['roles']
      });
    });

    test('잘못된 비밀번호로 로그인 시 실패한다', async () => {
      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash('different_password', 10);
      
      // 사용자 모킹
      const mockUser = {
        id: 1,
        username: testCredentials.username,
        password: hashedPassword, // 다른 비밀번호
        roles: [{ name: 'user', id: 1 }]
      };
      
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      
      // 로그인 요청
      const response = await request(app)
        .post(loginEndpoint)
        .send(testCredentials);

      // 응답 검증
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', '비밀번호가 일치하지 않습니다.');
      
      // 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: testCredentials.username },
        relations: ['roles']
      });
    });
  });
}); 