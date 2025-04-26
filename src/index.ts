import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/database';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import roleRoutes from './routes/roleRoutes';
import permissionRoutes from './routes/permissionRoutes';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 라우트 설정
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);

// 데이터베이스 연결
AppDataSource.initialize()
    .then(() => {
        console.log('데이터베이스가 성공적으로 연결되었습니다.');
        
        // 서버 시작
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
        });
    })
    .catch((error) => {
        console.error('데이터베이스 연결 중 오류가 발생했습니다:', error);
    });

export default app; 