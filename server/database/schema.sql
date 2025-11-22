-- =====================================================
-- FeedHope Database Schema v2.0
-- Modern, secure, properly separated user roles
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- Create database
DROP DATABASE IF EXISTS `feedhope`;
CREATE DATABASE `feedhope` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `feedhope`;

-- =====================================================
-- Table: users (Unified user table with role separation)
-- =====================================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('donor', 'volunteer', 'delivery') NOT NULL,
  `email_verified` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email_role` (`email`, `role`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- Table: donors (Donor-specific profile data)
-- =====================================================
DROP TABLE IF EXISTS `donors`;
CREATE TABLE `donors` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(11) NOT NULL,
  `gender` ENUM('male', 'female', 'other') DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `division` VARCHAR(50) DEFAULT NULL,
  `district` VARCHAR(50) DEFAULT NULL,
  `area` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_division` (`division`),
  KEY `idx_district` (`district`),
  KEY `idx_area` (`area`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- Table: volunteers (Volunteer/NGO-specific profile data)
-- =====================================================
DROP TABLE IF EXISTS `volunteers`;
CREATE TABLE `volunteers` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `organization_name` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(11) NOT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `division` VARCHAR(50) DEFAULT NULL,
  `district` VARCHAR(50) DEFAULT NULL,
  `area` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `verified` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_division` (`division`),
  KEY `idx_district` (`district`),
  KEY `idx_area` (`area`),
  KEY `idx_verified` (`verified`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- Table: delivery_persons (Delivery person-specific profile data)
-- =====================================================
DROP TABLE IF EXISTS `delivery_persons`;
CREATE TABLE `delivery_persons` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(11) NOT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `division` VARCHAR(50) DEFAULT NULL,
  `district` VARCHAR(50) DEFAULT NULL,
  `area` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `vehicle_type` VARCHAR(50) DEFAULT NULL,
  `availability_status` ENUM('available', 'busy', 'offline') DEFAULT 'available',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_division` (`division`),
  KEY `idx_district` (`district`),
  KEY `idx_area` (`area`),
  KEY `idx_availability` (`availability_status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- Table: food_donations (Food donation records)
-- =====================================================
DROP TABLE IF EXISTS `food_donations`;
CREATE TABLE `food_donations` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `donor_id` INT(11) NOT NULL,
  `food_name` VARCHAR(255) NOT NULL,
  `food_type` VARCHAR(100) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `quantity` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `food_image` VARCHAR(255) DEFAULT NULL,
  `pickup_address` TEXT NOT NULL,
  `pickup_division` VARCHAR(50) DEFAULT NULL,
  `pickup_district` VARCHAR(50) DEFAULT NULL,
  `pickup_area` VARCHAR(100) DEFAULT NULL,
  `pickup_latitude` DECIMAL(10, 8) DEFAULT NULL,
  `pickup_longitude` DECIMAL(11, 8) DEFAULT NULL,
  `pickup_address_full` TEXT DEFAULT NULL,
  `contact_phone` VARCHAR(11) NOT NULL,
  `status` ENUM('available', 'pending', 'ongoing', 'delivered', 'rejected') DEFAULT 'available',
  `volunteer_id` INT(11) DEFAULT NULL,
  `delivery_person_id` INT(11) DEFAULT NULL,
  `delivery_address` TEXT DEFAULT NULL,
  `delivery_division` VARCHAR(50) DEFAULT NULL,
  `delivery_district` VARCHAR(50) DEFAULT NULL,
  `delivery_area` VARCHAR(100) DEFAULT NULL,
  `delivery_latitude` DECIMAL(10, 8) DEFAULT NULL,
  `delivery_longitude` DECIMAL(11, 8) DEFAULT NULL,
  `delivery_address_full` TEXT DEFAULT NULL,
  `volunteer_accepted_at` DATETIME DEFAULT NULL,
  `delivery_accepted_at` DATETIME DEFAULT NULL,
  `delivered_at` DATETIME DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_donor_id` (`donor_id`),
  KEY `idx_volunteer_id` (`volunteer_id`),
  KEY `idx_delivery_person_id` (`delivery_person_id`),
  KEY `idx_status` (`status`),
  KEY `idx_pickup_area` (`pickup_area`),
  KEY `idx_delivery_area` (`delivery_area`),
  KEY `idx_created_at` (`created_at`),
  FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`volunteer_id`) REFERENCES `volunteers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`delivery_person_id`) REFERENCES `delivery_persons`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- Table: notifications (User notifications)
-- =====================================================
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `user_role` ENUM('donor', 'volunteer', 'delivery') NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `related_id` INT(11) DEFAULT NULL,
  `related_type` VARCHAR(50) DEFAULT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`, `user_role`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- Table: food_history (Status change history)
-- =====================================================
DROP TABLE IF EXISTS `food_history`;
CREATE TABLE `food_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `donation_id` INT(11) NOT NULL,
  `status_from` VARCHAR(50) DEFAULT NULL,
  `status_to` VARCHAR(50) NOT NULL,
  `changed_by_id` INT(11) NOT NULL,
  `changed_by_role` ENUM('donor', 'volunteer', 'delivery') NOT NULL,
  `changed_by_name` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_donation_id` (`donation_id`),
  KEY `idx_created_at` (`created_at`),
  FOREIGN KEY (`donation_id`) REFERENCES `food_donations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- Table: locations (Bangladesh Divisions/Districts/Areas)
-- =====================================================
DROP TABLE IF EXISTS `locations`;
CREATE TABLE `locations` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `division` VARCHAR(50) NOT NULL,
  `district` VARCHAR(50) NOT NULL,
  `area` VARCHAR(100) NOT NULL,
  `latitude` DECIMAL(10, 8) DEFAULT NULL,
  `longitude` DECIMAL(11, 8) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_location` (`division`, `district`, `area`),
  KEY `idx_division` (`division`),
  KEY `idx_district` (`district`),
  KEY `idx_area` (`area`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

