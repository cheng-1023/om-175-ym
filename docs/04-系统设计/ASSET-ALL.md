# 数据资产模块详细系统设计方案 (ASSET-001 ~ ASSET-005)

## 1. 概述与设计目标
本设计囊括新数据资产版图的从 0 到 1 建设。需要打通自上而下的目录层级与自底向上的数据模板组装。
- **架构目标**：低耦合存放，统一在后端 `asset` 空间内开发。深度接入 ES 搜索引擎；采用彻底物理删除机制。
- **图谱理念**：**全面接纳 OpenMetadata Native Graph 理念**。实体表间不再通过传统硬外键相连，所有资源关系的维系全部委托给系统原生的 `entity_relationship` 表格，形成通用有向图体系。

## 2. 技术选型 (Tech Stack & ADR)
- **技术栈**：Java (OpenMetadata 原生 DAO 框架) 作为编排中间层；前端采用 React。
- **统一图数据库映射**：`AssetCategory`, `AssetCatalog`, `DataAsset`, `AssetType`, `AssetAttribute` 作为孤立实体存在。它们之间的包含 (Contains)、实例采用 (Uses/AppliedTo) 关系统一使用底座提供的 `RelationshipDAO` 来写出边和入边。

## 3. 数据库设计 (Database Schema)

### 3.1 核心数据表清单
> **注：** 所有表皆继承 OM 基础底座审计实体，只记录独立特性；**所有传统外键ID全部移除**。

#### 1) `asset_category` (资产分类表)
| 字段名 | 类型 | 必填 | 默认值 | 描述 |
|---|---|---|---|---|
| id | VARCHAR(36) | Y | UUID | 主键 (OM 规范) |
| name | VARCHAR(256) | Y | | 唯一名标识 |
| display_name | VARCHAR(256) | N | | 展示名 |
| description | TEXT | N | | 描述 |

#### 2) `asset_catalog` (资产目录表)
| 字段名 | 类型 | 必填 | 默认值 | 描述 |
|---|---|---|---|---|
| id | VARCHAR(36) | Y | UUID | 主键 (OM 规范) |
| name | VARCHAR(256) | Y | | 目录名标识 |
| display_name | VARCHAR(256) | N | | 展示名 |
| level | INT | Y | 1 | 层级(由插入时结合图谱计算生成，禁止外部改写) |
| order | INT | Y | 0 | 排序序号 |
> *注：分类包含目录、目录套目录的链路，皆存于公共 `entity_relationship` (如: fromId=分类id, toId=目录id, relation=Contains)。*

#### 3) `asset_type` (资产类型表)
| 字段名 | 类型 | 必填 | 默认值 | 描述 |
|---|---|---|---|---|
| id | VARCHAR(36) | Y | UUID | 主键 (OM 规范) |
| name | VARCHAR(256) | Y | | 唯一标识名 |
| display_name | VARCHAR(256) | N | | 展示名 |

#### 4) `asset_attribute` (资产属性表)
| 字段名 | 类型 | 必填 | 默认值 | 描述 |
|---|---|---|---|---|
| id | VARCHAR(36) | Y | UUID | 主键 (OM 规范) |
| name | VARCHAR(256) | Y | | 英文字段名 (作为 JSON Key) |
| display_name | VARCHAR(256) | N | | 中文解释 |
| attribute_category | VARCHAR(64) | Y | '基本信息' | 枚举分类：基本/技术/业务/质量/安全 |
| data_type | VARCHAR(64) | Y | '字符串' | 枚举类型：字符串/数值/日期/布尔/文本/数组 |
| required | BOOLEAN | Y | false | 是否必填 |
| editor_roles | JSON | N | [] | 修改白名单权限 Role ID 集合 |
> *注：原中间表淘汰，通过在 `entity_relationship` 中追加 (fromId=类型id, toId=属性id, relation=Has) 进行动态组合装配。*

#### 5) `data_asset` (数据资产实例表)
| 字段名 | 类型 | 必填 | 默认值 | 描述 |
|---|---|---|---|---|
| id | VARCHAR(36) | Y | UUID | 主键 (OM 规范) |
| name | VARCHAR(256) | Y | | 唯一标识名 |
| display_name | VARCHAR(256) | N | | 实例展示名 |
| extension_data | JSON(B) | N | {} | 核心扩展字段。格式：`{"attrName1":"val"}` |
> *注：本表不再记录所属目录和类型模型。通过 `entity_relationship` 从被定型的 AssetType 引入 (relation=IsTypeOf)，和通过 AssetCatalog 进行目录挂载 (relation=Contains)。*

### 3.2 关系挂载约束集 (`entity_relationship` 解析)
| 发起端 (fromEntity) | 关系类型 (relationshipType) | 接收端 (toEntity) | 逻辑含义 |
|---|---|---|---|
| AssetCategory | CONTAINS | AssetCatalog | 分类下的根级目录分配 |
| AssetCatalog | CONTAINS | AssetCatalog | 目录形成嵌套的树形父子层级 |
| AssetCatalog | CONTAINS | DataAsset | 具体的数据资产实例驻扎在了该文件目录下 |
| DataAsset | IS_TYPE_OF | AssetType | 此特例属于某一分类模版体系 |
| AssetType | HAS | AssetAttribute | 某模板蓝图上搭载了特定的属性结构要素 |


## 4. 全量 API 接口契约清单 (API Specifications)

为确保前后端不发生边界遗漏遗失，现枚举全部核心路由 API 规范。所有接口受公用的 Bearer Token 控制。

### 4.1 通用/搜索集成
- **1.** `GET /api/v1/asset/search` 
  - **职责**：全景检索通道（依托 ES），接受并处理 `q` 包含 `AND`/`OR` 的高阶语句下推。

### 4.2 AssetCategory (资产分类相关)
- **2.** `POST /api/v1/asset/categories`：新建资产分类。
- **3.** `GET /api/v1/asset/categories`：查阅资产分类大盘（包含分页、简讯）。
- **4.** `GET /api/v1/asset/categories/{id}`：查阅单一对象的实体及其挂载的直系目录信息（附带 `?fields=`）。
- **5.** `PUT /api/v1/asset/categories/{id}`：更新分类主描述/名称。
- **6.** `DELETE /api/v1/asset/categories/{id}`：**执行物理清理**。系统级防呆拦截：如关系边存在至底层 `DataAsset` 节点，强制拦截报错 HTTP 409。

### 4.3 AssetCatalog (资产目录相关)
- **7.** `POST /api/v1/asset/catalogs`：新建目录。传参时支持设定向谁发起 `Contains` 挂靠。
- **8.** `GET /api/v1/asset/catalogs`：总汇检索。
- **9.** `GET /api/v1/asset/catalogs/{id}`：检索目录明细（附带返回下级包裹的所有子文件夹与资产元素集结构）。
- **10.** `PUT /api/v1/asset/catalogs/{id}`：更新名称、移动目录位置（后端转译为重绘上级的 `CONTAINS` 连接线）。
- **11.** `DELETE /api/v1/asset/catalogs/{id}`：**物理清算**。受相同强制绑定抛异常准则保护。
- **12.** `GET /api/v1/asset/catalogs/export` 与 `POST /api/v1/asset/catalogs/import`：实现该分类体系下拓扑树结构配置的 CSV 流上传与下发。

### 4.4 AssetType & AssetAttribute (模板与字典装配集)
- **13.** `POST /api/v1/asset/attributes` 和 `GET/PUT/DELETE /api/v1/asset/attributes`：完成最基本字典元素的 CRUD 操作（包含删除前的类型被占用拦截）。
- **14.** `POST /api/v1/asset/types` 和 `GET/PUT/DELETE /api/v1/asset/types`：完成蓝本实体壳子的操作注册。
- **15.** `PUT /api/v1/asset/types/{id}/attributes`：核心装载器。接收包含引用的 `attributeIds` 数组，系统负责更新对应的 `HAS` 边绑定图谱。
- **16.** `GET /api/v1/asset/types/{id}/attributes`：前端最核心的解析器。后端负责依据图谱顺藤摸瓜将该实体持有的散碎字典项捞齐，并依据 `attribute_category` 归类压扁返回为数组 `[{group_name, attrs}]` 供前台生成动态 Tab 大纲。
- **17.** `GET /api/v1/asset/types/export` 与 `POST /api/v1/asset/types/import`：资产类型与下属属性挂靠蓝本的导出及重写通道。

### 4.5 DataAsset (业务资产底座最终节点)
- **18.** `POST /api/v1/asset/dataAssets`：申请投产资源。必须持有指向 `AssetType` 的连线依赖否则返回并阻断 400 Bad Request。
- **19.** `GET/PUT/DELETE /api/v1/asset/dataAssets`：检索、基础修改和硬性除名。
- **20.** `PATCH /api/v1/asset/dataAssets/{id}/extension`：**权限防守门控**。采用 JSON Patch 规范接受局部特定值的推流，接口层必须校验访问者 Role，对照该字段元模版的 `editor_roles` 阵列。未达标拒绝 HTTP 403。
- **21.** `GET/POST /api/v1/asset/dataAssets/export` 及 `/import`：允许利用 CSV 对具有相同 `type_id` 的批次集群的数据进行快速重填补空与大面积分发。
