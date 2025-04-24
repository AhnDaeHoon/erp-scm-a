import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    sku: string; // Stock Keeping Unit

    @Column('decimal', { precision: 10, scale: 2 })
    price: number;

    @Column('decimal', { precision: 10, scale: 2 })
    cost: number;

    @Column()
    unit: string; // 단위 (개, 박스, kg 등)

    @Column({ default: 0 })
    quantity: number; // 현재 재고량

    @Column({ default: 0 })
    minimumQuantity: number; // 최소 재고량

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 