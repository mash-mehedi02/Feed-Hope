-- Enhanced Database Schema for Feed Hope App
-- Run these SQL commands to update your database

-- Add new columns to food_donations table
ALTER TABLE `food_donations` 
ADD COLUMN `food_image` VARCHAR(255) DEFAULT NULL AFTER `category`,
ADD COLUMN `status` ENUM('pending', 'assigned', 'picked_up', 'delivered') DEFAULT 'pending' AFTER `delivery_by`,
ADD COLUMN `tracking_id` VARCHAR(50) DEFAULT NULL AFTER `status`,
ADD COLUMN `delivery_status` TEXT DEFAULT NULL AFTER `tracking_id`,
ADD COLUMN `delivery_timestamp` DATETIME DEFAULT NULL AFTER `delivery_status`;

-- Create notifications table
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_email` varchar(255) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `delivery_person_id` int(11) DEFAULT NULL,
  `donation_id` int(11) NOT NULL,
  `type` ENUM('assigned', 'picked_up', 'delivered', 'status_update') NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`donation_id`) REFERENCES `food_donations`(`Fid`) ON DELETE CASCADE,
  FOREIGN KEY (`admin_id`) REFERENCES `admin`(`Aid`) ON DELETE SET NULL,
  FOREIGN KEY (`delivery_person_id`) REFERENCES `delivery_persons`(`Did`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create delivery tracking table
CREATE TABLE `delivery_tracking` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `donation_id` int(11) NOT NULL,
  `delivery_person_id` int(11) NOT NULL,
  `status` ENUM('assigned', 'picked_up', 'in_transit', 'delivered') NOT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`donation_id`) REFERENCES `food_donations`(`Fid`) ON DELETE CASCADE,
  FOREIGN KEY (`delivery_person_id`) REFERENCES `delivery_persons`(`Did`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create uploads directory structure (run this in PHP)
-- mkdir('uploads/food_images');
-- mkdir('uploads/food_images/thumbs');

