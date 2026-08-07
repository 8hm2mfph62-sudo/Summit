CREATE TABLE `companionMessages` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','model') NOT NULL,
	`text` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `companionMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `companionMessages` ADD CONSTRAINT `companionMessages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `companion_messages_user_created_idx` ON `companionMessages` (`userId`,`createdAt`);