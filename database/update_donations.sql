-- Run this SQL in phpMyAdmin to update food_donations table

USE demo;

-- Add food_image column if it doesn't exist
ALTER TABLE `food_donations` 
ADD COLUMN `food_image` VARCHAR(255) DEFAULT NULL AFTER `category`;

-- Add status column if it doesn't exist  
ALTER TABLE `food_donations` 
ADD COLUMN `status` ENUM('pending','approved','rejected') DEFAULT 'pending';

-- Update all existing donations to have status='pending'
UPDATE `food_donations` SET `status`='pending' WHERE `status` IS NULL;

-- Verify
SELECT * FROM food_donations LIMIT 5;

SELECT 'Database updated successfully!' AS Result;

