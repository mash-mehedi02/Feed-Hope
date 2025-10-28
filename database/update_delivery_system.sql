-- Update Delivery System Schema
-- Run this in phpMyAdmin

USE demo;

-- 1. Update delivery_persons table - change 'city' to 'area' for consistency
-- First check if we need to add the area column
ALTER TABLE `delivery_persons` 
ADD COLUMN IF NOT EXISTS `area` VARCHAR(50) DEFAULT NULL AFTER `city`;

-- If city exists and area doesn't, copy data
UPDATE `delivery_persons` SET `area` = `city` WHERE `area` IS NULL;

-- 2. Add completion tracking to food_donations
ALTER TABLE `food_donations` 
ADD COLUMN IF NOT EXISTS `completed_at` DATETIME DEFAULT NULL AFTER `admin_approved_at`,
ADD COLUMN IF NOT EXISTS `completed_by` INT(11) DEFAULT NULL AFTER `completed_at`;

-- 3. Ensure status includes 'completed'
ALTER TABLE `food_donations` 
MODIFY COLUMN `status` ENUM('pending','available','assigned','delivered','completed','rejected') DEFAULT 'pending';

-- 4. Create delivery_tracking table if needed
CREATE TABLE IF NOT EXISTS `delivery_tracking` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `donation_id` INT(11) NOT NULL,
  `delivery_person_id` INT(11) NOT NULL,
  `status` ENUM('assigned', 'in_transit', 'delivered', 'completed') NOT NULL,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Update all existing delivery persons
-- This ensures the area field is populated

SELECT 'Delivery system updated successfully!' AS Result;

