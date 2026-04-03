CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_provider_account_idx` ON `account` (`providerId`,`accountId`);--> statement-breakpoint
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`title` text,
	`slug` text,
	`summary` text,
	`featured` integer,
	`readingTime` real,
	`content` text,
	`_status` text,
	`_version` integer
);
--> statement-breakpoint
CREATE TABLE `articles_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`_parentId` text NOT NULL,
	`_version` integer NOT NULL,
	`_status` text NOT NULL,
	`_snapshot` text,
	`_createdBy` text,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`title` text,
	`slug` text,
	`description` text,
	`published` integer,
	`blocks` text,
	`_status` text,
	`_version` integer
);
--> statement-breakpoint
CREATE TABLE `pages_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`_parentId` text NOT NULL,
	`_version` integer NOT NULL,
	`_status` text NOT NULL,
	`_snapshot` text,
	`_createdBy` text,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`impersonatedBy` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'user' NOT NULL,
	`banned` integer DEFAULT false NOT NULL,
	`banReason` text,
	`banExpires` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
