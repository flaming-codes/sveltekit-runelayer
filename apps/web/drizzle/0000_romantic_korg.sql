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
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`title` text,
	`slug` text,
	`teaser` text,
	`pageType` text,
	`seo_metaTitle` text,
	`seo_metaDescription` text,
	`layout` text,
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
CREATE INDEX `pages_versions_parentId_idx` ON `pages_versions` (`_parentId`,`createdAt`);--> statement-breakpoint
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
CREATE TABLE `site_chrome` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`title` text,
	`handle` text,
	`siteName` text,
	`siteTagline` text,
	`siteDescription` text,
	`announcementTitle` text,
	`announcementUrl` text,
	`headerLinks` text,
	`utilityLinks` text,
	`headerPrimaryCtaLabel` text,
	`headerPrimaryCtaUrl` text,
	`footerBlurb` text,
	`footerProductLinks` text,
	`footerResourceLinks` text,
	`footerCompanyLinks` text,
	`footerLegalLinks` text,
	`socialGithubUrl` text,
	`socialDocsUrl` text,
	`socialAdminUrl` text,
	`_status` text,
	`_version` integer
);
--> statement-breakpoint
CREATE TABLE `site_chrome_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`_parentId` text NOT NULL,
	`_version` integer NOT NULL,
	`_status` text NOT NULL,
	`_snapshot` text,
	`_createdBy` text,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_chrome_versions_parentId_idx` ON `site_chrome_versions` (`_parentId`,`createdAt`);--> statement-breakpoint
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
