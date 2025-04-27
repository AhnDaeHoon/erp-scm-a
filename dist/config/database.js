"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../models/User");
const Role_1 = require("../models/Role");
const Permission_1 = require("../models/Permission");
const Product_1 = require("../models/Product");
const Order_1 = require("../models/Order");
const OrderItem_1 = require("../models/OrderItem");
const InventoryIn_1 = require("../models/InventoryIn");
const InventoryOut_1 = require("../models/InventoryOut");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'dev_adh',
    password: 'P@$$W@RD1',
    database: 'erp_logistics',
    schema: 'public',
    synchronize: false,
    logging: true,
    entities: [User_1.User, Role_1.Role, Permission_1.Permission, Product_1.Product, Order_1.Order, OrderItem_1.OrderItem, InventoryIn_1.InventoryIn, InventoryOut_1.InventoryOut],
    migrations: ['src/migrations/**/*.ts'],
    subscribers: ['src/subscribers/**/*.ts'],
});
