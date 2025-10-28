-- Add status column to food_donations table if it doesn't exist
-- Run this in phpMyAdmin: http://localhost/phpmyadmin

USE demo;

-- Check and add status column if it doesn't exist
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'demo' 
    AND TABLE_NAME = 'food_donations' 
    AND COLUMN_NAME = 'status'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE `food_donations` ADD COLUMN `status` ENUM("pending", "approved", "assigned", "delivered") DEFAULT "pending" AFTER `delivery_by`',
    'SELECT "Column status already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update all existing records to have status='pending' if NULL
UPDATE `food_donations` SET `status`='pending' WHERE `status` IS NULL;

SELECT 'Status column added successfully!' as Result;


