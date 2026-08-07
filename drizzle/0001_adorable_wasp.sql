CREATE TABLE `albumMountains` (
	`albumId` varchar(128) NOT NULL,
	`mountainId` varchar(128) NOT NULL,
	`position` int NOT NULL,
	CONSTRAINT `albumMountains_albumId_mountainId_pk` PRIMARY KEY(`albumId`,`mountainId`)
);
--> statement-breakpoint
CREATE TABLE `albums` (
	`id` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`coverColor` varchar(128) NOT NULL,
	`accentColor` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `albums_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `badges` (
	`id` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`icon` varchar(64) NOT NULL,
	`requirement` text NOT NULL,
	CONSTRAINT `badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challengeTemplates` (
	`id` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`xpReward` int NOT NULL,
	CONSTRAINT `challengeTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `climbRecords` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`mountainId` varchar(128) NOT NULL,
	`climbDate` date NOT NULL,
	`memo` text NOT NULL,
	`weather` varchar(32),
	`companions` varchar(255),
	`photoUrls` json NOT NULL,
	`stampId` varchar(255) NOT NULL,
	`xpEarned` int NOT NULL,
	`companionSkillUsed` varchar(128),
	`companionSkillName` varchar(255),
	`companionBonusXp` int,
	`hasRainbowGlow` boolean NOT NULL DEFAULT false,
	`luckyFortune` varchar(255),
	`triviaText` text,
	`companionBonusMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `climbRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`type` enum('bug','question','feedback','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`status` enum('open','answered','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inquiryReplies` (
	`id` varchar(64) NOT NULL,
	`inquiryId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`sender` enum('user','admin') NOT NULL,
	`nickname` varchar(80) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inquiryReplies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mountains` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`elevation` int NOT NULL,
	`location` text NOT NULL,
	`prefecture` varchar(64) NOT NULL,
	`difficulty` enum('beginner','intermediate','advanced') NOT NULL,
	`description` text NOT NULL,
	`recommendedSeason` varchar(255) NOT NULL,
	`estimatedTime` varchar(255) NOT NULL,
	`imageUrl` varchar(2048) NOT NULL,
	`stampText` varchar(255) NOT NULL,
	`stampIcon` varchar(64) NOT NULL,
	`stampColor` varchar(128) NOT NULL,
	`stampBgColor` varchar(128) NOT NULL,
	`stampBorderColor` varchar(128) NOT NULL,
	`isPublished` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mountains_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userBadges` (
	`userId` int NOT NULL,
	`badgeId` varchar(128) NOT NULL,
	`unlockedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userBadges_userId_badgeId_pk` PRIMARY KEY(`userId`,`badgeId`)
);
--> statement-breakpoint
CREATE TABLE `userChallenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`templateId` varchar(128) NOT NULL,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userChallenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_challenges_user_template_unique` UNIQUE(`userId`,`templateId`)
);
--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nickname` varchar(80) NOT NULL,
	`avatarUrl` varchar(2048) NOT NULL,
	`bio` text NOT NULL,
	`totalXp` int NOT NULL DEFAULT 0,
	`level` int NOT NULL DEFAULT 1,
	`xp` int NOT NULL DEFAULT 0,
	`xpToNextLevel` int NOT NULL DEFAULT 150,
	`companionName` varchar(80) NOT NULL DEFAULT 'ヤマコ',
	`companionAnimal` varchar(32) NOT NULL DEFAULT 'squirrel',
	`companionSkinStage` int NOT NULL DEFAULT 1,
	`homePrefecture` varchar(64) NOT NULL DEFAULT '京都',
	`preferredCondition` varchar(80) NOT NULL DEFAULT '景色重視',
	`isBanned` boolean NOT NULL DEFAULT false,
	`isPremium` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_user_id_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `albumMountains` ADD CONSTRAINT `albumMountains_albumId_albums_id_fk` FOREIGN KEY (`albumId`) REFERENCES `albums`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `albumMountains` ADD CONSTRAINT `albumMountains_mountainId_mountains_id_fk` FOREIGN KEY (`mountainId`) REFERENCES `mountains`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `climbRecords` ADD CONSTRAINT `climbRecords_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `climbRecords` ADD CONSTRAINT `climbRecords_mountainId_mountains_id_fk` FOREIGN KEY (`mountainId`) REFERENCES `mountains`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiries` ADD CONSTRAINT `inquiries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiryReplies` ADD CONSTRAINT `inquiryReplies_inquiryId_inquiries_id_fk` FOREIGN KEY (`inquiryId`) REFERENCES `inquiries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiryReplies` ADD CONSTRAINT `inquiryReplies_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userBadges` ADD CONSTRAINT `userBadges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userBadges` ADD CONSTRAINT `userBadges_badgeId_badges_id_fk` FOREIGN KEY (`badgeId`) REFERENCES `badges`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userChallenges` ADD CONSTRAINT `userChallenges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userChallenges` ADD CONSTRAINT `userChallenges_templateId_challengeTemplates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `challengeTemplates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD CONSTRAINT `userProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `album_mountains_mountain_idx` ON `albumMountains` (`mountainId`);--> statement-breakpoint
CREATE INDEX `climb_records_user_created_idx` ON `climbRecords` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `climb_records_user_mountain_idx` ON `climbRecords` (`userId`,`mountainId`);--> statement-breakpoint
CREATE INDEX `inquiries_user_created_idx` ON `inquiries` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `inquiry_replies_inquiry_created_idx` ON `inquiryReplies` (`inquiryId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `mountains_prefecture_idx` ON `mountains` (`prefecture`);--> statement-breakpoint
CREATE INDEX `mountains_difficulty_idx` ON `mountains` (`difficulty`);