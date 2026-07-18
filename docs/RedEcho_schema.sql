-- =====================================================================
-- RedEcho——红色旧址沉浸式互动演出 —— 数据库建表 SQL
-- 技术栈：微信小程序 + 微信云开发
-- 说明：
--   1. 本文件为 MySQL 8.0 兼容 DDL，可直接用于自建/云 MySQL 实例。
--   2. 若纯使用「微信云开发·云数据库」(NoSQL 文档库)，请将每张表映射为
--      一个 collection，行内 JSON 字段原样存储，并在文档中建立所需索引
--      （如 user_id、show_id、created_at）。文末附 collection 映射表。
--   3. 字符集统一 utf8mb4，引擎 InnoDB，所有表均带 created_at/updated_at。
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `redecho`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE `redecho`;

-- =====================================================================
-- 1. 用户表 users
-- =====================================================================
CREATE TABLE `users` (
  `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `openid`          VARCHAR(64)  NOT NULL COMMENT '微信 openid（游客登录标识）',
  `unionid`         VARCHAR(64)  DEFAULT NULL COMMENT '微信 unionid（多端打通）',
  `phone`           VARCHAR(20)  DEFAULT NULL COMMENT '手机号（工作人员必填）',
  `nickname`        VARCHAR(64)  DEFAULT NULL COMMENT '昵称',
  `avatar_url`      VARCHAR(512) DEFAULT NULL COMMENT '头像地址',
  `role`            TINYINT      NOT NULL DEFAULT 0 COMMENT '主角色 0游客 1场务 2演员 3管理员',
  `staff_types`     JSON         DEFAULT NULL COMMENT '工作人员子角色数组，如 ["field","actor"]',
  `password_hash`   VARCHAR(128) DEFAULT NULL COMMENT '工作人员密码哈希（游客为空）',
  `staff_verified`  TINYINT      NOT NULL DEFAULT 0 COMMENT '工作人员双因子是否验证通过',
  `points`          INT          NOT NULL DEFAULT 0 COMMENT '当前积分',
  `level`           VARCHAR(16)  NOT NULL DEFAULT '新兵' COMMENT '等级称号',
  `level_exp`       INT          NOT NULL DEFAULT 0 COMMENT '当前等级经验值',
  `daily_read_pts`  INT          NOT NULL DEFAULT 0 COMMENT '当日已得阅读积分（每日上限用）',
  `last_read_date`  DATE         DEFAULT NULL COMMENT '最后一次阅读积分日期',
  `status`          TINYINT      NOT NULL DEFAULT 1 COMMENT '账号状态 1正常 0禁用',
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`),
  UNIQUE KEY `uk_phone` (`phone`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- =====================================================================
-- 2. 验证码表 verification_codes（工作人员登录/注册/重置）
-- =====================================================================
CREATE TABLE `verification_codes` (
  `id`          BIGINT      NOT NULL AUTO_INCREMENT,
  `phone`       VARCHAR(20) NOT NULL COMMENT '手机号',
  `code`        VARCHAR(8)  NOT NULL COMMENT '验证码',
  `biz_type`    VARCHAR(16) NOT NULL DEFAULT 'staff_login' COMMENT '业务类型 staff_login/reset/register',
  `expires_at`  DATETIME    NOT NULL COMMENT '过期时间',
  `used`        TINYINT     NOT NULL DEFAULT 0 COMMENT '是否已使用',
  `created_at`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_phone_type` (`phone`,`biz_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='短信/验证码记录表';

-- =====================================================================
-- 3. 资料卡片表 cards（首页红色历史资料）
-- =====================================================================
CREATE TABLE `cards` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(128) NOT NULL COMMENT '标题',
  `cover_url`   VARCHAR(512) DEFAULT NULL COMMENT '封面图',
  `media_type`  VARCHAR(16)  NOT NULL DEFAULT 'image' COMMENT 'image/video/text',
  `media_url`   VARCHAR(512) DEFAULT NULL COMMENT '视频/音频地址',
  `content`     MEDIUMTEXT   COMMENT '图文正文（富文本/JSON）',
  `base_points` TINYINT      NOT NULL DEFAULT 1 COMMENT '完整阅读奖励积分 1-5',
  `tags`        JSON         DEFAULT NULL COMMENT '标签数组',
  `likes`       INT          NOT NULL DEFAULT 0 COMMENT '点赞数',
  `sort`        INT          NOT NULL DEFAULT 0 COMMENT '排序',
  `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '1上架 0下架',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status_sort` (`status`,`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资料卡片表';

-- =====================================================================
-- 4. 阅读记录表 read_records
-- =====================================================================
CREATE TABLE `read_records` (
  `id`            BIGINT    NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT    NOT NULL,
  `card_id`       BIGINT    NOT NULL,
  `duration`      INT       NOT NULL DEFAULT 0 COMMENT '阅读时长(秒)',
  `points_earned` TINYINT   NOT NULL DEFAULT 0 COMMENT '本次获得积分',
  `read_at`       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_card` (`user_id`,`card_id`),
  KEY `idx_card` (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='阅读记录表';

-- =====================================================================
-- 5. 收藏表 favorites（我的收藏）
-- =====================================================================
CREATE TABLE `favorites` (
  `id`         BIGINT    NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT    NOT NULL,
  `card_id`    BIGINT    NOT NULL,
  `created_at` DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_card` (`user_id`,`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收藏表';

-- =====================================================================
-- 6. 积分记录表 points_logs
-- =====================================================================
CREATE TABLE `points_logs` (
  `id`           BIGINT    NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT    NOT NULL,
  `change`       INT       NOT NULL COMMENT '积分变动，正为加负为减',
  `balance_after`INT       NOT NULL COMMENT '变动后余额',
  `source`       VARCHAR(24) NOT NULL COMMENT '来源 read/vote/activity/redeem/sign',
  `ref_id`       BIGINT    DEFAULT NULL COMMENT '关联业务ID（卡片/订单等）',
  `remark`       VARCHAR(128) DEFAULT NULL,
  `created_at`   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分流水表';

-- =====================================================================
-- 8. 演出场次表 shows
-- =====================================================================
CREATE TABLE `shows` (
  `id`                 BIGINT    NOT NULL AUTO_INCREMENT,
  `title`              VARCHAR(128) NOT NULL COMMENT '演出标题',
  `theme`              VARCHAR(64)  DEFAULT NULL COMMENT '主题',
  `description`        VARCHAR(512) DEFAULT NULL,
  `cover_url`          VARCHAR(512) DEFAULT NULL,
  `venue`              VARCHAR(128) DEFAULT NULL COMMENT '旧址/场馆',  `start_time`         DATETIME  NOT NULL COMMENT '开始时间',
  `end_time`           DATETIME  DEFAULT NULL COMMENT '结束时间',
  `status`             TINYINT   NOT NULL DEFAULT 0 COMMENT '0即将开始 1进行中 2已结束 3已取消',
  `current_segment_id` BIGINT    DEFAULT NULL COMMENT '当前进行环节',
  `creator_id`         BIGINT    DEFAULT NULL COMMENT '创建者(场务)',
  `im_group_id`        VARCHAR(64) DEFAULT NULL COMMENT '腾讯云IM群组ID（实时通信）',
  `created_at`         DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status_time` (`status`,`start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='演出场次表';

-- =====================================================================
-- 9. 演出环节表 show_segments
-- =====================================================================
CREATE TABLE `show_segments` (
  `id`          BIGINT    NOT NULL AUTO_INCREMENT,
  `show_id`     BIGINT    NOT NULL,
  `type`        VARCHAR(16) NOT NULL COMMENT 'vote/short_video/activity/branch',
  `title`       VARCHAR(128) DEFAULT NULL,
  `seq`         INT       NOT NULL DEFAULT 0 COMMENT '环节顺序',
  `config`      JSON      DEFAULT NULL COMMENT '环节配置（题目/视频/活动参数）',
  `status`      TINYINT   NOT NULL DEFAULT 0 COMMENT '0待开始 1进行中 2已结束',
  `started_at`  DATETIME  DEFAULT NULL,
  `ended_at`    DATETIME  DEFAULT NULL,
  `created_at`  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_show_seq` (`show_id`,`seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='演出环节表';

-- =====================================================================
-- 10. 投票问题表 poll_questions
-- =====================================================================
CREATE TABLE `poll_questions` (
  `id`              BIGINT    NOT NULL AUTO_INCREMENT,
  `segment_id`      BIGINT    NOT NULL,
  `show_id`         BIGINT    NOT NULL,
  `question`        VARCHAR(255) NOT NULL COMMENT '题干',
  `options`         JSON     NOT NULL COMMENT '选项数组 [{key,text}]',
  `correct_branch`  VARCHAR(64) DEFAULT NULL COMMENT '正确分支key（答题环节用）',
  `allow_multiple`  TINYINT  NOT NULL DEFAULT 0 COMMENT '是否多选',
  `time_limit`      INT      DEFAULT NULL COMMENT '限时(秒)',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_segment` (`segment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投票问题表';

-- =====================================================================
-- 11. 投票记录表 vote_records（一人一问一票）
-- =====================================================================
CREATE TABLE `vote_records` (
  `id`          BIGINT    NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT    NOT NULL,
  `show_id`     BIGINT    NOT NULL,
  `segment_id`  BIGINT    NOT NULL,
  `question_id` BIGINT    NOT NULL,
  `option_key`  VARCHAR(32) NOT NULL COMMENT '所选选项key',
  `created_at`  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_question` (`user_id`,`question_id`),
  KEY `idx_question` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投票记录表';

-- =====================================================================
-- 12. 表情/短语反馈表 emotion_feedbacks（可上大屏）
-- =====================================================================
CREATE TABLE `emotion_feedbacks` (
  `id`          BIGINT    NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT    NOT NULL,
  `show_id`     BIGINT    NOT NULL,
  `segment_id`  BIGINT    DEFAULT NULL,
  `type`        VARCHAR(16) NOT NULL DEFAULT 'emoji' COMMENT 'emoji/phrase',
  `content`     VARCHAR(64) NOT NULL COMMENT '表情或短语内容',
  `to_screen`   TINYINT   NOT NULL DEFAULT 0 COMMENT '是否已投屏',
  `created_at`  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_show` (`show_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='表情反馈表';

-- =====================================================================
-- 13. 剧情分支记录表 show_branch_log（记录选择路径/锁定分支）
-- =====================================================================
CREATE TABLE `show_branch_log` (
  `id`            BIGINT    NOT NULL AUTO_INCREMENT,
  `show_id`       BIGINT    NOT NULL,
  `segment_id`    BIGINT    NOT NULL,
  `branch_key`    VARCHAR(64) NOT NULL COMMENT '最终采用分支',
  `branch_name`   VARCHAR(128) DEFAULT NULL,
  `vote_summary`  JSON     DEFAULT NULL COMMENT '投票汇总（各选项票数）',
  `locked`        TINYINT  NOT NULL DEFAULT 0 COMMENT '场务是否已锁定',
  `decided_at`    DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_show` (`show_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='剧情分支记录表';

-- =====================================================================
-- 14. 演员场次分配表 actor_shows（我的场次/角色）
-- =====================================================================
CREATE TABLE `actor_shows` (
  `id`            BIGINT    NOT NULL AUTO_INCREMENT,
  `show_id`       BIGINT    NOT NULL,
  `actor_id`      BIGINT    NOT NULL,
  `role_name`     VARCHAR(64) DEFAULT NULL COMMENT '扮演角色名',
  `character_desc`TEXT     DEFAULT NULL COMMENT '角色背景',
  `status`        TINYINT   NOT NULL DEFAULT 1 COMMENT '1分配 0取消',
  `created_at`    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_show_actor` (`show_id`,`actor_id`),
  KEY `idx_actor` (`actor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='演员场次分配表';

-- =====================================================================
-- 15. AI台词建议表 ai_lines（演员AI台词助手）
-- =====================================================================
CREATE TABLE `ai_lines` (
  `id`           BIGINT    NOT NULL AUTO_INCREMENT,
  `show_id`      BIGINT    NOT NULL,
  `segment_id`   BIGINT    NOT NULL,
  `actor_id`     BIGINT    NOT NULL,
  `question_id`  BIGINT    DEFAULT NULL COMMENT '关联投票(可选)',
  `context_prompt`TEXT     DEFAULT NULL COMMENT '生成上下文提示词',
  `text`         TEXT     NOT NULL COMMENT '选用/主推台词',
  `alternatives` JSON     DEFAULT NULL COMMENT '多条备选文案',
  `chosen`       TINYINT  NOT NULL DEFAULT 0 COMMENT '演员是否选用',
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_actor_show` (`actor_id`,`show_id`),
  KEY `idx_show_seg` (`show_id`,`segment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI台词建议表';

-- =====================================================================
-- 16. 明信片场景模板表 postcard_scenes（AIGC模板）
-- =====================================================================
CREATE TABLE `postcard_scenes` (
  `id`             BIGINT    NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(64) NOT NULL COMMENT '场景名 如 井冈山会师',
  `cover_url`      VARCHAR(512) DEFAULT NULL COMMENT '模板预览图',
  `base_image_url` VARCHAR(512) DEFAULT NULL COMMENT '底图（可选）',
  `prompt_tpl`     TEXT     NOT NULL COMMENT '文生图 Prompt 模板',
  `sort`           INT      NOT NULL DEFAULT 0,
  `status`         TINYINT  NOT NULL DEFAULT 1,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='明信片场景模板表';

-- =====================================================================
-- 17. 名言警句库 quotes（敏感词过滤后入库）
-- =====================================================================
CREATE TABLE `quotes` (
  `id`       BIGINT    NOT NULL AUTO_INCREMENT,
  `content`  VARCHAR(255) NOT NULL COMMENT '名言',
  `author`   VARCHAR(64)  DEFAULT NULL,
  `category` VARCHAR(32)  DEFAULT NULL,
  `status`   TINYINT   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='名言警句库';

-- =====================================================================
-- 18. 明信片记录表 postcards
-- =====================================================================
CREATE TABLE `postcards` (
  `id`            BIGINT    NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT    NOT NULL,
  `scene_id`      BIGINT    NOT NULL,
  `scene_name`    VARCHAR(64) DEFAULT NULL,
  `quote`         VARCHAR(255) DEFAULT NULL COMMENT '使用名言',
  `custom_text`   VARCHAR(255) DEFAULT NULL COMMENT '手动输入文本',
  `template_id`   VARCHAR(32) DEFAULT NULL COMMENT '字体/布局模板',
  `font_id`       VARCHAR(32) DEFAULT NULL,
  `image_url`     VARCHAR(512) NOT NULL COMMENT '生成图（云存储）',
  `thumb_url`     VARCHAR(512) DEFAULT NULL COMMENT '缩略图',
  `status`        TINYINT   NOT NULL DEFAULT 1 COMMENT '1正常 0已删除',
  `created_at`    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='明信片记录表';

-- =====================================================================
-- 19. 商品表 products（周边商城）
-- =====================================================================
CREATE TABLE `products` (
  `id`             BIGINT    NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(128) NOT NULL,
  `description`    VARCHAR(512) DEFAULT NULL,
  `image_url`      VARCHAR(512) DEFAULT NULL,
  `price_points`   INT       NOT NULL DEFAULT 0 COMMENT '积分价',
  `price_cash`     DECIMAL(10,2) DEFAULT 0.00 COMMENT '现金价(混合支付)',
  `stock`          INT       NOT NULL DEFAULT 0,
  `sales`          INT       NOT NULL DEFAULT 0 COMMENT '销量',
  `status`         TINYINT   NOT NULL DEFAULT 1 COMMENT '1上架 0下架',
  `created_at`     DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- =====================================================================
-- 20. 订单表 orders（积分/混合支付 + 核销）
-- =====================================================================
CREATE TABLE `orders` (
  `id`              BIGINT    NOT NULL AUTO_INCREMENT,
  `order_no`        VARCHAR(32) NOT NULL COMMENT '订单号',
  `user_id`         BIGINT    NOT NULL,
  `product_id`      BIGINT    NOT NULL,
  `quantity`        INT       NOT NULL DEFAULT 1,
  `pay_type`        VARCHAR(16) NOT NULL DEFAULT 'points' COMMENT 'points/cash/mixed',
  `points_amount`   INT       NOT NULL DEFAULT 0 COMMENT '消耗积分',
  `cash_amount`     DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '现金金额',
  `status`          TINYINT   NOT NULL DEFAULT 0 COMMENT '0待支付 1已支付 2已核销 3已取消 4已退款',
  `redemption_code` VARCHAR(16) DEFAULT NULL COMMENT '核销码',
  `redeemed_at`     DATETIME  DEFAULT NULL,
  `redeemed_by`     BIGINT    DEFAULT NULL COMMENT '核销人员ID',
  `created_at`      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user` (`user_id`),
  KEY `idx_code` (`redemption_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- =====================================================================
-- 21. 现场活动答题记录表 activity_logs（答题抽奖自动判分）
-- =====================================================================
CREATE TABLE `activity_logs` (
  `id`            BIGINT    NOT NULL AUTO_INCREMENT,
  `show_id`       BIGINT    NOT NULL,
  `segment_id`    BIGINT    NOT NULL,
  `user_id`       BIGINT    NOT NULL,
  `answer`        VARCHAR(64) DEFAULT NULL COMMENT '用户作答',
  `is_correct`    TINYINT   NOT NULL DEFAULT 0,
  `score`         INT       NOT NULL DEFAULT 0,
  `reward_points` INT       NOT NULL DEFAULT 0,
  `created_at`    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_seg` (`user_id`,`segment_id`),
  KEY `idx_show` (`show_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='现场活动答题记录表';

-- =====================================================================
-- 22. 运营日统计表 stat_daily（数据看板聚合）
-- =====================================================================
CREATE TABLE `stat_daily` (
  `id`            BIGINT    NOT NULL AUTO_INCREMENT,
  `stat_date`     DATE      NOT NULL COMMENT '统计日期',
  `visitor_count` INT       NOT NULL DEFAULT 0 COMMENT '当日游客人数',
  `points_sent`   INT       NOT NULL DEFAULT 0 COMMENT '积分发放量',
  `top_cards`     JSON      DEFAULT NULL COMMENT '热门卡片Top',
  `top_products`  JSON      DEFAULT NULL COMMENT '商城兑换Top',
  `created_at`    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运营日统计表';

-- =====================================================================
-- 云数据库(NoSQL) collection 映射速查
--   users                -> users
--   verification_codes   -> verification_codes
--   cards                -> cards
--   read_records         -> read_records
--   favorites            -> favorites
--   points_logs          -> points_logs--   shows                -> shows
--   show_segments        -> show_segments
--   poll_questions       -> poll_questions
--   vote_records         -> vote_records
--   emotion_feedbacks    -> emotion_feedbacks
--   show_branch_log      -> show_branch_log
--   actor_shows          -> actor_shows
--   ai_lines             -> ai_lines
--   postcard_scenes      -> postcard_scenes
--   quotes               -> quotes
--   postcards            -> postcards
--   products             -> products
--   orders               -> orders
--   activity_logs        -> activity_logs
--   stat_daily           -> stat_daily
-- 实时通信（投票/台词/表情）走腾讯云IM群组，不入表，仅在云函数中读写IM。
-- =====================================================================
