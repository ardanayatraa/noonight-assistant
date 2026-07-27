-- Prepaid request quota per user (each AI question spends 1; admin tops it up)
ALTER TABLE `clients` ADD COLUMN `request_balance` INTEGER NOT NULL DEFAULT 25;
ALTER TABLE `clients` ADD COLUMN `requests_used` INTEGER NOT NULL DEFAULT 0;
