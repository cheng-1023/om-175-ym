--
-- Data Asset Management Tables
-- 用于数据资产功能模块的相关表
--

-- 资产分类表 (Asset Category)
CREATE TABLE IF NOT EXISTS asset_category_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    fqnHash VARCHAR(256) NOT NULL COLLATE ascii_bin,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (name)
);

-- 资产目录表 (Asset Catalog)
CREATE TABLE IF NOT EXISTS asset_catalog_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    fqnHash VARCHAR(256) NOT NULL COLLATE ascii_bin,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (name)
);

-- 资产属性表 (Asset Attribute)
CREATE TABLE IF NOT EXISTS asset_attribute_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    fqnHash VARCHAR(256) NOT NULL COLLATE ascii_bin,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (name)
);

-- 资产类型表 (Asset Type)
CREATE TABLE IF NOT EXISTS asset_type_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    fqnHash VARCHAR(256) NOT NULL COLLATE ascii_bin,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (name)
);

-- 数据资产表 (Data Asset)
CREATE TABLE IF NOT EXISTS data_asset_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    fqnHash VARCHAR(256) NOT NULL COLLATE ascii_bin,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (name)
);

-- 为资产分类表添加索引
CREATE INDEX idx_asset_category_updated_at ON asset_category_entity(updatedAt);
CREATE INDEX idx_asset_category_updated_by ON asset_category_entity(updatedBy);
CREATE INDEX idx_asset_category_deleted ON asset_category_entity(deleted);

-- 为资产目录表添加索引
CREATE INDEX idx_asset_catalog_updated_at ON asset_catalog_entity(updatedAt);
CREATE INDEX idx_asset_catalog_updated_by ON asset_catalog_entity(updatedBy);
CREATE INDEX idx_asset_catalog_deleted ON asset_catalog_entity(deleted);
CREATE INDEX idx_asset_catalog_category ON asset_catalog_entity((CAST(json ->> '$.category.id' AS CHAR(255))));

-- 为资产属性表添加索引
CREATE INDEX idx_asset_attribute_updated_at ON asset_attribute_entity(updatedAt);
CREATE INDEX idx_asset_attribute_updated_by ON asset_attribute_entity(updatedBy);
CREATE INDEX idx_asset_attribute_deleted ON asset_attribute_entity(deleted);
CREATE INDEX idx_asset_attribute_category ON asset_attribute_entity((CAST(json ->> '$.attributeCategory' AS CHAR(255))));

-- 为资产类型表添加索引
CREATE INDEX idx_asset_type_updated_at ON asset_type_entity(updatedAt);
CREATE INDEX idx_asset_type_updated_by ON asset_type_entity(updatedBy);
CREATE INDEX idx_asset_type_deleted ON asset_type_entity(deleted);

-- 为数据资产表添加索引
CREATE INDEX idx_data_asset_updated_at ON data_asset_entity(updatedAt);
CREATE INDEX idx_data_asset_updated_by ON data_asset_entity(updatedBy);
CREATE INDEX idx_data_asset_deleted ON data_asset_entity(deleted);
CREATE INDEX idx_data_asset_type ON data_asset_entity((CAST(json ->> '$.assetType.id' AS CHAR(255))));
CREATE INDEX idx_data_asset_catalog ON data_asset_entity((CAST(json ->> '$.catalog.id' AS CHAR(255))));
