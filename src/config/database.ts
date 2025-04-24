import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { OrderItem } from '../models/OrderItem';
import { InventoryIn } from '../models/InventoryIn';
import { InventoryOut } from '../models/InventoryOut';
import dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'erp_logistics',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production',
    entities: [User, Product, Order, OrderItem, InventoryIn, InventoryOut],
    migrations: ['../migrations/*.ts'],
    subscribers: [],
}); 