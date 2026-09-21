CREATE TABLE `hikingPlans` (
	`id` varchar(64) NOT NULL,
	`ownerId` int NOT NULL,
	`mode` enum('friends','ai') NOT NULL,
	`status` enum('draft','ready','planned','archived') NOT NULL DEFAULT 'draft',
	`title` varchar(120) NOT NULL,
	`mountainId` varchar(128),
	`mountainName` varchar(255),
	`planDate` date,
	`meetingTime` varchar(16),
	`meetingPlace` varchar(255),
	`routeSummary` text,
	`transport` varchar(255),
	`notes` text,
	`equipmentChecklist` json NOT NULL,
	`safetyNote` text,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hikingPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planMessages` (
	`id` varchar(64) NOT NULL,
	`planId` varchar(64) NOT NULL,
	`senderUserId` int,
	`kind` enum('user','ai','system') NOT NULL DEFAULT 'user',
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `planMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planParticipants` (
	`planId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','member') NOT NULL,
	`membershipStatus` enum('invited','active','declined','removed') NOT NULL DEFAULT 'invited',
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`joinedAt` timestamp,
	CONSTRAINT `planParticipants_planId_userId_pk` PRIMARY KEY(`planId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `hikingPlans` ADD CONSTRAINT `hikingPlans_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hikingPlans` ADD CONSTRAINT `hikingPlans_mountainId_mountains_id_fk` FOREIGN KEY (`mountainId`) REFERENCES `mountains`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `planMessages` ADD CONSTRAINT `planMessages_planId_hikingPlans_id_fk` FOREIGN KEY (`planId`) REFERENCES `hikingPlans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `planMessages` ADD CONSTRAINT `planMessages_senderUserId_users_id_fk` FOREIGN KEY (`senderUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `planParticipants` ADD CONSTRAINT `planParticipants_planId_hikingPlans_id_fk` FOREIGN KEY (`planId`) REFERENCES `hikingPlans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `planParticipants` ADD CONSTRAINT `planParticipants_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `hiking_plans_owner_updated_idx` ON `hikingPlans` (`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `hiking_plans_owner_status_idx` ON `hikingPlans` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `hiking_plans_mountain_idx` ON `hikingPlans` (`mountainId`);--> statement-breakpoint
CREATE INDEX `plan_messages_plan_created_idx` ON `planMessages` (`planId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `plan_participants_user_status_idx` ON `planParticipants` (`userId`,`membershipStatus`);--> statement-breakpoint
CREATE INDEX `plan_participants_plan_status_idx` ON `planParticipants` (`planId`,`membershipStatus`);