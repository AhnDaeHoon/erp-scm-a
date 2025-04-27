import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { OrderItem } from '../models/OrderItem';
import { InventoryIn } from '../models/InventoryIn';
import { InventoryOut } from '../models/InventoryOut';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'dev_adh',
    password: 'P@$$W@RD1',
    database: 'erp_logistics',
    schema: 'public',
    synchronize: false,
    logging: true,
    entities: [User, Role, Permission, Product, Order, OrderItem, InventoryIn, InventoryOut],
    // 마이그레이션과 구독자 기능 비활성화
    // migrations: ['src/migrations/**/*.ts'],
    // subscribers: ['src/subscribers/**/*.ts'],
}); 