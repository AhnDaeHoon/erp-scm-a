"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./config/database");
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const inventoryRoutes_1 = __importDefault(require("./routes/inventoryRoutes"));
const roleRoutes_1 = __importDefault(require("./routes/roleRoutes"));
const permissionRoutes_1 = __importDefault(require("./routes/permissionRoutes"));
const dotenv_1 = __importDefault(require("dotenv"));
// 환경 변수 로드
dotenv_1.default.config();
const app = (0, express_1.default)();
// 미들웨어 설정
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 라우트 설정
app.use('/api/users', userRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/inventory', inventoryRoutes_1.default);
app.use('/api/roles', roleRoutes_1.default);
app.use('/api/permissions', permissionRoutes_1.default);
// 데이터베이스 연결
database_1.AppDataSource.initialize()
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
exports.default = app;
