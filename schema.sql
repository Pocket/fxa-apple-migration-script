CREATE DATABASE IF NOT EXISTS `readitla_ril-tmp`;
CREATE DATABASE IF NOT EXISTS `readitla_auth`;


USE readitla_ril-tmp;

-- table with user access tokens
CREATE TABLE IF NOT EXISTS `oauth_user_access` (
  `user_id` int(10) unsigned NOT NULL,
  `consumer_key` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `access_token` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `permission` varchar(3) COLLATE utf8_unicode_ci DEFAULT NULL,
  `status` tinyint(4) DEFAULT '0',
  KEY `user_idx` (`user_id`,`consumer_key`,`status`),
  KEY `access_idx` (`access_token`),
  KEY `user_status_idx` (`user_id`,`status`),
  KEY `consumer_idx` (`consumer_key`,`access_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- table with users
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `feed_id` varchar(20) NOT NULL,
  `password` varchar(64) NOT NULL,
  `email` varchar(150) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `first_name` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `last_name` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `feed_protected` tinyint(3) unsigned NOT NULL,
  `login_hash` varchar(42) NOT NULL,
  `birth` datetime NOT NULL,
  `last_syncer` varchar(42) NOT NULL,
  `api_id` mediumint(8) unsigned NOT NULL,
  `premium_status` tinyint(1) unsigned DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `auth_user_id` char(10) CHARACTER SET latin1 COLLATE latin1_bin DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `feed_id` (`feed_id`),
  UNIQUE KEY `auth_user_id` (`auth_user_id`),
  KEY `birth` (`birth`),
  KEY `email` (`email`),
  KEY `password` (`password`),
  KEY `api_id` (`api_id`),
  KEY `updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=57933592 DEFAULT CHARSET=latin1;

CREATE TABLE `users_meta` (
  `user_id` int(10) unsigned NOT NULL,
  `property` tinyint(3) unsigned NOT NULL,
  `value` text NOT NULL,
  `time_updated` datetime NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`property`,`time_updated`),
  KEY `property` (`property`),
  KEY `time_updated` (`time_updated`),
  KEY `updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `user_profile` (
  `user_id` int(10) unsigned NOT NULL,
  `username` varchar(20) COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL,
  `description` mediumtext COLLATE utf8mb4_bin,
  `avatar_url` varchar(300) COLLATE utf8mb4_bin DEFAULT NULL,
  `follower_count` int(10) unsigned DEFAULT '0',
  `follow_count` int(10) unsigned DEFAULT '0',
  `post_count` int(10) unsigned DEFAULT '0',
  `data` mediumtext COLLATE utf8mb4_bin,
  `time_updated` int(10) unsigned DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `username_idx` (`username`),
  KEY `updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- fxa apple migration temporary table
-- delete me after the table is removed post migration period
CREATE TABLE `apple_migration` (
  `user_id` int(11) unsigned NOT NULL,
  `transfer_sub` varchar(50) NOT NULL,
  `migrated` tinyint(1) NOT NULL,
  PRIMARY KEY (`user_id`),
  KEY `idx_transfer_sub` (`transfer_sub`),
  KEY `idx_migrated` (`migrated`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

create table user_firefox_account
(
    `user_id`              int unsigned                         not null
        primary key,
    `firefox_access_token` varchar(100)                         not null,
    `firefox_uid`          varchar(40)                          not null,
    `firefox_email`        varchar(150) collate utf8_unicode_ci not null,
    `firefox_avatar`       varchar(255) collate utf8_unicode_ci not null,
    `birth`                datetime                             not null,
    `api_id`               mediumint unsigned                   not null,
    `last_auth_date`       datetime                             null,
    `deauth_date`          datetime                             null,
    `active`               tinyint   default 0                  null,
    `updated_at`           timestamp default CURRENT_TIMESTAMP  not null on update CURRENT_TIMESTAMP
) charset = utf8;

-- Note: the following tables columns are not replication of our database.
-- They are just created to identify tables by pocket userId

create table `user_google_account`
(
	`user_id` int(10) unsigned NOT NULL primary key,
	`google_id` varchar(40) not null
);

create table `user_follows`
(
	`user_id` int(10) unsigned NOT NULL
);

create table `users_social_ids`
(
	`user_id` int(10) unsigned NOT NULL
);

create table `users_social_tokens`
(
	`user_id` int(10) unsigned NOT NULL
);

create table `user_twitter_auth`
(
	`user_id` int(10) unsigned NOT NULL
);

create table `user_notifications`
(
	`user_id` int(10) unsigned NOT NULL
);

create table `item_attribution`
(
	`user_id` int(10) unsigned NOT NULL
);

create table `projectx_posted_items`
(
	`user_id` int(10) unsigned NOT NULL
);

create table `friends`
(
	`user_id` int(10) unsigned NOT NULL
);

create table `post_actions`
(
	`user_id` int(10) unsigned NOT NULL
);

create table `users_services`
(
	`user_id` int unsigned not null,
	`service_id` tinyint unsigned not null,
	`username` varchar(100) not null,
	`confirmed` tinyint not null,
	`updated_at` timestamp default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
	primary key (`user_id`, `service_id`, `username`)
);

create table `users_tokens`
(
	`user_id` int unsigned not null,
	`service_id` tinyint unsigned not null,
	`device_id` bigint unsigned null,
	`token` varchar(200) not null,
	`status` tinyint not null,
	primary key (`user_id`, `service_id`, `token`)
);

create table `push_tokens`
(
	`user_id` int(10) unsigned NOT NULL
);

-- index is userid and processed.
create table `campaign_target`
(
	`user_id` int(10) unsigned NOT NULL,
	`processed` tinyint default 0 null comment '0: not yet processed; 1: processed; 2: skipped'
);

-- index is created_by_user_id and channel_type.
create table `channels`
(
	`created_by_user_id` int(10) unsigned NOT NULL,
	`channel_type` tinyint(4) unsigned default 0 null
);

create table `newsletter_subscribers`
(
	`email` varchar(500) not null,
	`user_id` int unsigned null
);

create table `contact_hashes`
(
	`contact_id` bigint unsigned auto_increment
		primary key,
	`contact_hash` char(64) not null,
	`type` tinyint(1) unsigned not null,
	`user_id` int unsigned not null,
	`confirmed` tinyint(1) unsigned not null,
	`time_updated` int unsigned not null,
	constraint `hash_idx`
		unique (`contact_hash`)
);

create table users_social_services
(
	user_id int unsigned not null
);

create table user_setting
(
	user_id int unsigned not null
);

create table users_device_ids
(
	user_id int unsigned not null
);

create table users_settings_notifications
(
	user_id int unsigned not null
);

create table users_time
(
	user_id int unsigned not null
);


USE readitla_auth;

CREATE TABLE `user_providers`
(
  `id`               int(11)      NOT NULL AUTO_INCREMENT,
  `created_at`       timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- this is readitla_auth.users.id, **NOT** readitla_ril-tmp.users.user_id
  `user_id`          int(11)      NOT NULL,
  `provider_id`      int(11)      NOT NULL,
  `provider_user_id` MEDIUMTEXT   NOT NULL,
  `refresh_token`    MEDIUMTEXT   NOT NULL,
  `provider_data`    BLOB         NOT NULL,
  `email`            varchar(150) NOT NULL,
  UNIQUE `user_provider_index` (`user_id`, `provider_id`),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `providers`
(
  `id`         int(11)                                                        NOT NULL AUTO_INCREMENT,
  `created_at` timestamp                                                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp                                                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- only type `apple` is actually implemented here, id `4`
  `type`       enum ('apple', 'google', 'firefox', 'pocket', 'mozilla-auth0') NOT NULL,
  `name`       varchar(50)                                                    NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `users`
(
  `id`              int(11)                                            NOT NULL AUTO_INCREMENT,
  `created_at`      timestamp                                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      timestamp                                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- readitla_auth.users.external_key = readitla_ril-tmp.users.auth_user_id
  `external_key`    char(10) CHARACTER SET latin1 COLLATE latin1_bin   NOT NULL,
  `name`            varchar(150)                                       NOT NULL,
  `public_identity` varchar(20)                                        NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE `external_key_idx` (`external_key`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
