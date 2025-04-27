"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAuthTables1669025468000 = void 0;
class CreateAuthTables1669025468000 {
    async up(queryRunner) {
        // 역할 테이블 생성
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "role" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR(255) NOT NULL UNIQUE,
                "description" VARCHAR(255),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);
        // 권한 테이블 생성
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "permission" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR(255) NOT NULL UNIQUE,
                "description" VARCHAR(255),
                "resource" VARCHAR(255) NOT NULL,
                "action" VARCHAR(255) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);
        // 사용자-역할 다대다 관계 테이블 생성
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "user_roles" (
                "user_id" INTEGER NOT NULL,
                "role_id" INTEGER NOT NULL,
                PRIMARY KEY ("user_id", "role_id"),
                CONSTRAINT "FK_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "FK_role_id" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);
        // 역할-권한 다대다 관계 테이블 생성
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "role_permissions" (
                "role_id" INTEGER NOT NULL,
                "permission_id" INTEGER NOT NULL,
                PRIMARY KEY ("role_id", "permission_id"),
                CONSTRAINT "FK_role_permission_role_id" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "FK_role_permission_permission_id" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);
        // 기존 사용자 테이블에서 role 컬럼 제거 (선택적)
        await queryRunner.query(`
            ALTER TABLE "user" DROP COLUMN IF EXISTS "role"
        `);
    }
    async down(queryRunner) {
        // 역할-권한 관계 테이블 삭제
        await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
        // 사용자-역할 관계 테이블 삭제
        await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
        // 권한 테이블 삭제
        await queryRunner.query(`DROP TABLE IF EXISTS "permission"`);
        // 역할 테이블 삭제
        await queryRunner.query(`DROP TABLE IF EXISTS "role"`);
        // 사용자 테이블에 role 컬럼 다시 추가 (선택적)
        await queryRunner.query(`
            ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" VARCHAR(255) DEFAULT 'user'
        `);
    }
}
exports.CreateAuthTables1669025468000 = CreateAuthTables1669025468000;
