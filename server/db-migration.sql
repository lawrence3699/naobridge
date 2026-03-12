-- NaoBridge database migration
-- Run against existing tftime database

USE `tftime`;

-- =====================================================
-- 1. Modify users table: add role, status, muteExpiry, agreedToRules
-- =====================================================
ALTER TABLE `users`
  ADD COLUMN `role` ENUM('patient', 'family', 'supporter') DEFAULT 'supporter' AFTER `avatar`,
  ADD COLUMN `status` ENUM('normal', 'muted', 'banned') DEFAULT 'normal' AFTER `role`,
  ADD COLUMN `muteExpiry` DATETIME DEFAULT NULL AFTER `status`,
  ADD COLUMN `agreedToRules` TINYINT(1) DEFAULT 0 AFTER `muteExpiry`;

ALTER TABLE `users` ADD INDEX `idx_users_status` (`status`);

-- =====================================================
-- 2. Modify posts table: add category, commentEnabled, isPinned, isFeatured
-- =====================================================
ALTER TABLE `posts`
  ADD COLUMN `category` ENUM('recovery', 'bci', 'emotional', 'knowledge', 'qa', 'free') DEFAULT 'free' AFTER `content`,
  ADD COLUMN `commentEnabled` TINYINT(1) DEFAULT 1 AFTER `category`,
  ADD COLUMN `isPinned` TINYINT(1) DEFAULT 0 AFTER `commentEnabled`,
  ADD COLUMN `isFeatured` TINYINT(1) DEFAULT 0 AFTER `isPinned`;

ALTER TABLE `posts` ADD INDEX `idx_posts_category` (`category`);

-- =====================================================
-- 3. Enhance post_feedbacks for full report system
-- =====================================================
ALTER TABLE `post_feedbacks`
  ADD COLUMN `reason` ENUM('medical-fraud', 'ad-spam', 'harassment', 'violence', 'other') DEFAULT 'other' AFTER `subject`,
  ADD COLUMN `description` VARCHAR(500) DEFAULT NULL AFTER `reason`,
  ADD COLUMN `targetType` ENUM('post', 'comment', 'user') DEFAULT 'post' AFTER `description`,
  ADD COLUMN `targetId` INT DEFAULT NULL AFTER `targetType`,
  ADD COLUMN `handlerId` INT DEFAULT NULL AFTER `targetId`,
  ADD COLUMN `result` VARCHAR(255) DEFAULT NULL AFTER `handlerId`;

-- =====================================================
-- 4. Create notifications table
-- =====================================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `userId` INT(11) NOT NULL,
  `type` ENUM('comment', 'reply', 'system', 'report-result') NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `content` VARCHAR(500) NOT NULL,
  `relatedId` INT(11) DEFAULT NULL,
  `isRead` TINYINT(1) DEFAULT 0,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`userId`),
  KEY `idx_notifications_user_read` (`userId`, `isRead`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 5. Create admins table
-- =====================================================
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `userId` INT(11) NOT NULL,
  `level` ENUM('super', 'normal') DEFAULT 'normal',
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admins_userId_unique` (`userId`),
  CONSTRAINT `admins_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 6. Create sensitive_words table
-- =====================================================
CREATE TABLE IF NOT EXISTS `sensitive_words` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `word` VARCHAR(100) NOT NULL,
  `category` ENUM('ad', 'fraud', 'discrimination', 'medical-fraud', 'violence') NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sensitive_words_word_unique` (`word`),
  KEY `idx_sensitive_words_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 7. Create favorites table
-- =====================================================
CREATE TABLE IF NOT EXISTS `favorites` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `userId` INT(11) NOT NULL,
  `postId` INT(11) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `favorites_user_post_unique` (`userId`, `postId`),
  KEY `idx_favorites_user` (`userId`),
  CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 8. Seed sensitive words
-- =====================================================
INSERT IGNORE INTO `sensitive_words` (`word`, `category`, `createdAt`, `updatedAt`) VALUES
('包治百病', 'medical-fraud', NOW(), NOW()),
('祖传秘方', 'medical-fraud', NOW(), NOW()),
('神药', 'medical-fraud', NOW(), NOW()),
('特效药', 'medical-fraud', NOW(), NOW()),
('虚假疗法', 'medical-fraud', NOW(), NOW()),
('偏方治大病', 'medical-fraud', NOW(), NOW()),
('保证治愈', 'medical-fraud', NOW(), NOW()),
('根治', 'medical-fraud', NOW(), NOW()),
('无效退款', 'medical-fraud', NOW(), NOW()),
('免费领取', 'ad', NOW(), NOW()),
('广告推销', 'ad', NOW(), NOW()),
('加微信', 'ad', NOW(), NOW()),
('加我好友', 'ad', NOW(), NOW()),
('扫码领取', 'ad', NOW(), NOW()),
('限时优惠', 'ad', NOW(), NOW()),
('点击链接', 'ad', NOW(), NOW()),
('诈骗', 'fraud', NOW(), NOW()),
('转账汇款', 'fraud', NOW(), NOW()),
('银行卡号', 'fraud', NOW(), NOW()),
('中奖通知', 'fraud', NOW(), NOW()),
('验证码发我', 'fraud', NOW(), NOW()),
('歧视残疾人', 'discrimination', NOW(), NOW()),
('废人', 'discrimination', NOW(), NOW()),
('脑残', 'discrimination', NOW(), NOW()),
('智障', 'discrimination', NOW(), NOW()),
('自杀方法', 'violence', NOW(), NOW()),
('去死', 'violence', NOW(), NOW());
