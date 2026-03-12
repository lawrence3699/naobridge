-- Add openid column to existing users table
-- Run on Alibaba Cloud MySQL (tftime database) before data export
-- Existing users will have NULL openid (they can link via WeChat login later)

USE `tftime`;

ALTER TABLE `users`
  ADD COLUMN `openid` VARCHAR(128) DEFAULT NULL AFTER `agreedToRules`,
  ADD UNIQUE KEY `users_openid_unique` (`openid`);
