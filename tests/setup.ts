// 테스트 실행 전 환경 설정
import dotenv from 'dotenv';

// 테스트 환경변수 로드
// .env.test 파일이 있으면 그 파일을, 없으면 기본 .env 파일을 사용
dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

// 타임아웃 설정 (10초)
jest.setTimeout(10000); 