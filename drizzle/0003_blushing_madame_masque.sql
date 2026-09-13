CREATE TABLE `climbRecordParticipants` (
	`recordId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `climbRecordParticipants_recordId_userId_pk` PRIMARY KEY(`recordId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`addresseeId` int NOT NULL,
	`status` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `friendships_id` PRIMARY KEY(`id`),
	CONSTRAINT `friendships_pair_unique` UNIQUE(`requesterId`,`addresseeId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `friendCode` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_friendCode_unique` UNIQUE(`friendCode`);--> statement-breakpoint
ALTER TABLE `climbRecordParticipants` ADD CONSTRAINT `climbRecordParticipants_recordId_climbRecords_id_fk` FOREIGN KEY (`recordId`) REFERENCES `climbRecords`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `climbRecordParticipants` ADD CONSTRAINT `climbRecordParticipants_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `friendships` ADD CONSTRAINT `friendships_requesterId_users_id_fk` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `friendships` ADD CONSTRAINT `friendships_addresseeId_users_id_fk` FOREIGN KEY (`addresseeId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `record_participants_user_idx` ON `climbRecordParticipants` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `friendships_addressee_status_idx` ON `friendships` (`addresseeId`,`status`);