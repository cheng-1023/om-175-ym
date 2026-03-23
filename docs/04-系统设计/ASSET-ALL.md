# 数据资产模块详细系统设计方案 (ASSET-001 ~ ASSET-005)

## 1. 概述与设计目标
本设计囊括新数据资产版图的从 0 到 1 建设。需要打通自上而下的目录层级与自底向上的数据模板组装。
- **架构目标**：低耦合存放，统一在后端 `asset` 空间内开发。必须深度接入 ES 搜索引擎；不能使用逻辑软删除。

## 2. 技术选型 (Tech Stack & ADR)
- **技术栈**：Java Spring / OM Native DAO 作为持久控制；前端采用 React。
- **存储介质匹配**：`DataAsset` 的动态扩展属性因为个数不固定且字段千变万化，无法横向展平做强 Model。决定使用 RDBMS 的 **JSONB (Postgres) / JSON (MySQL)** 类型字段予以整块收容，检索排序则交由 ElasticSearch Flat Object 处理。

## 3. 数据库设计 (Database Schema)

### 3.1 核心数据表清单
> **注：** 所有表皆继承 OM 基础底座审计字段 `id` (VARCHAR UUID), `created_by`, `updated_by`, `created_at`, `updated_at`, `version` 等，下表略去该部分只体现核心业务字段。

#### 1) `asset_category` (资产分类表)
| 字段名 | 类型 | 必填 | 默认值 | 描述 |
|---|---|---|---|---|
| name | VARCHAR(256) | Y | | 分类唯一名标识 |
| display_name | VARCHAR(256) | N | | 展示名 |
| description | TEXT | N | | 描述 |

#### 2) `asset_catalog` (资产目录表)
| 字段名 | 类型 | 必填 | 默认值 | 描述 |
|---|---|---|---|---|
| category_id | VARCHAR(36) | Y | | 所属分类的 UUID |
| parent_id | VARCHAR(36) | N | | 自身嵌套的父级目录 UUID |
| name | VARCHAR(256) | Y | | 目录名标识 |
| display_name | VARCHAR(256) | N | | 展示名 |
| level | INT | Y | 1 | 目录层级(系统自动计算生成，禁止对外修改) |
| order | INT | Y | 0 | 当前同级下的排序序号 |

#### 3) `asset_type` (资产类型表)
| 字段名 | 类型 | 必填 | 默认值 | 描述 |
|---|---|---|---|---|
| name | VARCHAR(256) | Y | | 名称 |
| display_name | VARCHAR(256) | N | | 展示名 |

#### 4) `asset_attribute` (资产属性表)
| 字段名 | 类型 | 必填 | 默认值 | 描述 |
|---|---|---|---|---|
| name | VARCHAR(256) | Y | | 英文字段名 (作为 JSON Key) |
| display_name | VARCHAR(256) | N | | 中文解释 |
| attribute_category | VARCHAR(64) | Y | '基本信息' | 分类：基本/技术/业务/质量/安全 |
| data_type | VARCHAR(64) | Y | '字符串' | 类型：字符串/数值/日期/布尔/文本/数组 |
| required | BOOLEAN | Y | false | 是否必填 |
| editor_roles | JSON | N | [] | 可以修改此属性的 Role ID 数组合集 |

#### 5) `asset_type_attribute_map` (关联中间表)
| 字段名 | 类型 | 必填 | 描述 |
|---|---|---|---|
| type_id | VARCHAR(36) | Y | 资产类型的 UUID |
| attribute_id | VARCHAR(36) | Y | 资产属性的 UUID |

#### 6) `data_asset` (数据资产实例表)
| 字段名 | 类型 | 必填 | 默认值 | 描述 |
|---|---|---|---|---|
| catalog_id | VARCHAR(36) | N | | 所属目录的 UUID (允许游离) |
| type_id | VARCHAR(36) | Y | | 采用的资产类型蓝本 UUID |
| name | VARCHAR(256) | Y | | 唯一标识名 |
| display_name | VARCHAR(256) | N | | 实例展示名 |
| extension_data | JSON | N | {} | 核心**JSON全量扩展值池**。存储格式如 `{"attrName1":"value1"}` |

## 4. API 接口契约 (API Specifications)

由于共涉及 5 大实体实体增删改查及导入导出，本文档抽取最具代表性的几类高光防阻塞业务接口作为标准锚定。

### 4.1 资产目录拦截性删除接口
- **Endpoint**: `DELETE /api/v1/asset/catalogs/{id}`
- **功能**: 强物理删除指定的资产目录。触发级联查验。
- **Response Elements**:
  - Success (HTTP 200, 数据被斩草除根)
  - Error (HTTP 409 Conflict): (对应 PM 的删除防呆要求)
    ```json
    {
      "code": 409001,
      "message": "执行中断：该目录或其层级深处子目录下，检测到仍有关联绑定残留的数据资产(DataAsset)，为了防止系统崩溃，请先解绑游离这些资产再重试物理删除。"
    }
    ```

### 4.2 获取资产类型的动态属性分组视图
- **Endpoint**: `GET /api/v1/asset/types/{id}/attributes`
- **功能**: 为前端 ASSET-002 中 “动态生成各类 Tab 切片” 提供直接处理好的树型分组下放数据。
- **Response Elements**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": [
      {
         "group_name": "基本信息",
         "attributes": [
           { "id": "uuid1", "name": "owner", "dataType": "字符串", "editorRoles": ["Role-DataSteward"] }
         ]
      },
      {
         "group_name": "业务信息",
         "attributes": [
           { "id": "uuid2", "name": "cost", "dataType": "数值", "editorRoles": [] }
         ]
      }
    ]
  }
  ```

### 4.3 数据资产动态字段鉴权保存接口
- **Endpoint**: `PATCH /api/v1/asset/dataAssets/{id}/extension`
- **功能**: 针对 ASSET-003 中的特定业务字段进行覆盖级写入修改。后端必须基于 Token 去核准。
- **Request Body**:
  ```json
  [
    { "op": "replace", "path": "/extension_data/owner", "value": "AdminUser001" }
  ]
  ```
- **Response Elements**:
  - Success (HTTP 200)
  - Error (HTTP 403 Forbidden): (对应 PM 要求的越权拦截)
    ```json
    {
       "code": 403001,
       "message": "权限拒绝：您的角色不包含允许修改 [业务信息->owner] 的必要身份 (Required: Role-DataSteward)。"
    }
    ```

### 4.4 ES 搜索引擎通用分发 (适用于概览级联)
- **Endpoint**: `GET /api/v1/asset/search`
- **功能**: 支持原生 OM 前端生成器的 AND/OR 节点。
- **Query Params**:
  - `q`: *(String)* AND/OR ES 查询语法，例： `(catalog_id:uuid1 OR catalog_id:uuid2) AND type_id:uuid3`。
- **Response**: 返回经过高亮切割标准化的实体记录包。
