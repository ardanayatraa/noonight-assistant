-- Human-readable clone/index progress or error message for the admin indicator
ALTER TABLE `projects` ADD COLUMN `status_detail` VARCHAR(500) NULL;
