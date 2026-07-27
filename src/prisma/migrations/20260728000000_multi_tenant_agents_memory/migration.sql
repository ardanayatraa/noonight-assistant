-- AlterTable: clients gains an active-project pointer (per-user context switching)
ALTER TABLE `clients` ADD COLUMN `active_project_id` BIGINT NULL;

-- Enforce one client per WhatsApp number
CREATE UNIQUE INDEX `clients_whatsapp_number_key` ON `clients`(`whatsapp_number`);

-- Index for the active-project lookup
CREATE INDEX `clients_active_project_id_idx` ON `clients`(`active_project_id`);

-- CreateTable: per-user Hermes agent (one agent per client, serves all their repos)
CREATE TABLE `agents` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` CHAR(36) NOT NULL,
    `client_id` BIGINT NOT NULL,
    `name` VARCHAR(100) NOT NULL DEFAULT 'Hermes',
    `persona` TEXT NULL,
    `provider` VARCHAR(50) NULL,
    `model` VARCHAR(100) NULL,
    `temperature` DOUBLE NOT NULL DEFAULT 0.3,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `agents_uuid_key`(`uuid`),
    UNIQUE INDEX `agents_client_id_key`(`client_id`),
    INDEX `agents_client_id_idx`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: per-user memory (shared across all of a client's repos)
CREATE TABLE `client_memory` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT NOT NULL,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NULL,
    `type` ENUM('preference', 'knowledge', 'context', 'system') NOT NULL DEFAULT 'knowledge',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `client_memory_client_id_key_key`(`client_id`, `key`),
    INDEX `client_memory_client_id_idx`(`client_id`),
    INDEX `client_memory_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_active_project_id_fkey` FOREIGN KEY (`active_project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agents` ADD CONSTRAINT `agents_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_memory` ADD CONSTRAINT `client_memory_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
