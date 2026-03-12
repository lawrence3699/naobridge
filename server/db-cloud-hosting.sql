-- NaoBridge Cloud Hosting — Fresh MySQL Schema
-- Run on Cloud Hosting managed MySQL to create all tables from scratch
-- Character set: utf8mb4 for full Unicode support (emoji, CJK)

CREATE DATABASE IF NOT EXISTS `naobridge` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `naobridge`;

-- =====================================================
-- 1. Users
-- =====================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `role` ENUM('patient', 'family', 'supporter') DEFAULT 'supporter',
  `status` ENUM('normal', 'muted', 'banned') DEFAULT 'normal',
  `muteExpiry` DATETIME DEFAULT NULL,
  `agreedToRules` TINYINT(1) DEFAULT 0,
  `openid` VARCHAR(128) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_openid_unique` (`openid`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 2. User profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS `userprofiles` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `userId` INT(11) NOT NULL,
  `about_me` TEXT DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_userprofiles_user` (`userId`),
  CONSTRAINT `userprofiles_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 3. User follows
-- =====================================================
CREATE TABLE IF NOT EXISTS `user_follows` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `followerId` INT(11) NOT NULL,
  `followingId` INT(11) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_follows_pair_unique` (`followerId`, `followingId`),
  KEY `idx_user_follows_following` (`followingId`),
  CONSTRAINT `user_follows_ibfk_1` FOREIGN KEY (`followerId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_follows_ibfk_2` FOREIGN KEY (`followingId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 4. Channels
-- =====================================================
CREATE TABLE IF NOT EXISTS `channels` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 5. Posts
-- =====================================================
CREATE TABLE IF NOT EXISTS `posts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `userId` INT(11) NOT NULL,
  `channelId` INT(11) DEFAULT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL,
  `category` ENUM('recovery', 'bci', 'emotional', 'knowledge', 'qa', 'free') DEFAULT 'free',
  `is_valid` TINYINT(1) DEFAULT 1,
  `commentEnabled` TINYINT(1) DEFAULT 1,
  `isPinned` TINYINT(1) DEFAULT 0,
  `isFeatured` TINYINT(1) DEFAULT 0,
  `num_views` INT(11) DEFAULT 0,
  `num_likes` INT(11) DEFAULT 0,
  `num_comments` INT(11) DEFAULT 0,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_posts_user` (`userId`),
  KEY `idx_posts_category` (`category`),
  KEY `idx_posts_valid` (`is_valid`),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 6. Post images
-- =====================================================
CREATE TABLE IF NOT EXISTS `post_images` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `postId` INT(11) NOT NULL,
  `userId` INT(11) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_post_images_post` (`postId`),
  CONSTRAINT `post_images_ibfk_1` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 7. Post comments (2-level nesting)
-- =====================================================
CREATE TABLE IF NOT EXISTS `post_comments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `userId` INT(11) NOT NULL,
  `postId` INT(11) NOT NULL,
  `postCommentId` INT(11) DEFAULT NULL,
  `content` TEXT NOT NULL,
  `num_likes` INT(11) DEFAULT 0,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_post_comments_post` (`postId`),
  KEY `idx_post_comments_user` (`userId`),
  KEY `idx_post_comments_parent` (`postCommentId`),
  CONSTRAINT `post_comments_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_comments_ibfk_2` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_comments_ibfk_3` FOREIGN KEY (`postCommentId`) REFERENCES `post_comments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 8. Post likes (for posts and comments)
-- =====================================================
CREATE TABLE IF NOT EXISTS `post_likes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `userId` INT(11) NOT NULL,
  `postId` INT(11) DEFAULT NULL,
  `postCommentId` INT(11) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_post_likes_user` (`userId`),
  KEY `idx_post_likes_post` (`postId`),
  CONSTRAINT `post_likes_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 9. Post feedbacks (reports)
-- =====================================================
CREATE TABLE IF NOT EXISTS `post_feedbacks` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `userId` INT(11) NOT NULL,
  `postId` INT(11) DEFAULT NULL,
  `subject` VARCHAR(200) DEFAULT NULL,
  `reason` ENUM('medical-fraud', 'ad-spam', 'harassment', 'violence', 'other') DEFAULT 'other',
  `description` VARCHAR(500) DEFAULT NULL,
  `targetType` ENUM('post', 'comment', 'user') DEFAULT 'post',
  `targetId` INT(11) DEFAULT NULL,
  `status` ENUM('PENDING', 'PROCESSED', 'REFUSED') DEFAULT 'PENDING',
  `handlerId` INT(11) DEFAULT NULL,
  `result` VARCHAR(255) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_post_feedbacks_user` (`userId`),
  KEY `idx_post_feedbacks_status` (`status`),
  CONSTRAINT `post_feedbacks_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 10. Favorites
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
-- 11. Notifications
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
-- 12. Admins
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
-- 13. Sensitive words
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
-- Seed: Default sensitive words
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

-- =====================================================
-- Seed: Create first admin (update userId after data import)
-- =====================================================
-- INSERT INTO `admins` (`userId`, `level`, `createdAt`, `updatedAt`)
-- VALUES (1, 'super', NOW(), NOW());
