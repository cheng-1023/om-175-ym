/*
 *  Licensed to the Apache Software Foundation (ASF) under one or more
 *  contributor license agreements. See the NOTICE file distributed with
 *  this work for additional information regarding copyright ownership.
 *  The ASF licenses this file to You under the Apache License, Version 2.0
 *  (the "License"); you may not use this file except in compliance with
 *  the License. You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.openmetadata.service.jdbi3.asset;

import static org.openmetadata.csv.CsvUtil.addExtension;
import static org.openmetadata.csv.CsvUtil.addOwners;
import static org.openmetadata.csv.CsvUtil.addReviewers;
import static org.openmetadata.csv.CsvUtil.addTagLabels;
import static org.openmetadata.csv.CsvUtil.addField;
import static org.openmetadata.service.Entity.ASSET_CATALOG;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.openmetadata.csv.EntityCsv;
import org.openmetadata.schema.entity.data.asset.AssetCatalog;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.Relationship;
import org.openmetadata.schema.type.change.ChangeSource;
import org.openmetadata.schema.type.csv.CsvDocumentation;
import org.openmetadata.schema.type.csv.CsvFile;
import org.openmetadata.schema.type.csv.CsvHeader;
import org.openmetadata.schema.type.csv.CsvImportResult;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.EntityRepository;
import org.openmetadata.service.jdbi3.ListFilter;
import org.openmetadata.service.jdbi3.Repository;
import org.openmetadata.service.resources.asset.AssetCatalogResource;
import org.openmetadata.service.util.EntityUtil;
import org.openmetadata.service.util.EntityUtil.Fields;

@Repository
public class AssetCatalogRepository extends EntityRepository<AssetCatalog> {
  private static final String UPDATE_FIELDS = "";
  private static final String PATCH_FIELDS = "";

  public AssetCatalogRepository() {
    super(
        AssetCatalogResource.COLLECTION_PATH,
        Entity.ASSET_CATALOG,
        AssetCatalog.class,
        Entity.getCollectionDAO().assetCatalogDAO(),
        PATCH_FIELDS,
        UPDATE_FIELDS);
    quoteFqn = true;
    supportsSearch = true;
    renameAllowed = true;
  }

  @Override
  public void setFields(AssetCatalog catalog, Fields fields) {
    catalog.withChildren(
        fields.contains("children") ? getChildren(catalog) : catalog.getChildren());
    catalog.setAssetCount(
        fields.contains("assetCount") ? getAssetCount(catalog) : catalog.getAssetCount());
  }

  @Override
  public void clearFields(AssetCatalog catalog, Fields fields) {
    catalog.withChildren(fields.contains("children") ? catalog.getChildren() : null);
    catalog.setAssetCount(fields.contains("assetCount") ? catalog.getAssetCount() : null);
  }

  @Override
  public void prepare(AssetCatalog catalog, boolean update) {
    // 校验 category 并将其转换为完整的 EntityReference
    if (catalog.getCategory() != null) {
      org.openmetadata.schema.entity.data.asset.AssetCategory category = 
          Entity.getEntity(catalog.getCategory(), "", Include.NON_DELETED);
      catalog.setCategory(category.getEntityReference());
    }

    AssetCatalog parentCatalog = null;
    // 校验 parent 并将其转换为完整的 EntityReference
    if (catalog.getParent() != null) {
      parentCatalog = Entity.getEntity(catalog.getParent(), "", Include.NON_DELETED);
      catalog.setParent(parentCatalog.getEntityReference());
    }

    if (update) {
      // 更新时 level 不允许修改
      catalog.setLevel(null);
    } else {
      // 新建时自动计算 level
      if (parentCatalog == null) {
        catalog.setLevel(1);
      } else {
        catalog.setLevel(parentCatalog.getLevel() + 1);
      }
    }
  }

  @Override
  public void setFullyQualifiedName(AssetCatalog catalog) {
    if (catalog.getParent() != null) {
      catalog.setFullyQualifiedName(
          org.openmetadata.service.util.FullyQualifiedName.add(catalog.getParent().getFullyQualifiedName(), catalog.getName()));
    } else if (catalog.getCategory() != null) {
      catalog.setFullyQualifiedName(
          org.openmetadata.service.util.FullyQualifiedName.add(catalog.getCategory().getFullyQualifiedName(), catalog.getName()));
    } else {
      catalog.setFullyQualifiedName(catalog.getName());
    }
  }

  @Override
  public void storeEntity(AssetCatalog catalog, boolean update) {
    // 存储前清除 category 引用字段，避免冗余序列化到 JSON（关系通过关系表管理）
    EntityReference category = catalog.getCategory();
    catalog.setCategory(null);
    store(catalog, update);
    // 恢复 category 字段，供后续 storeRelationships() 使用
    catalog.setCategory(category);
  }

  @Override
  public void storeRelationships(AssetCatalog catalog) {
    // 存储 AssetCategory HAS AssetCatalog 关系（资产分类拥有资产目录）
    if (catalog.getCategory() != null) {
      addRelationship(
          catalog.getCategory().getId(),
          catalog.getId(),
          Entity.ASSET_CATEGORY,
          ASSET_CATALOG,
          Relationship.HAS);
    }
    // 存储 parent CONTAINS child 关系（父目录包含子目录）
    if (catalog.getParent() != null) {
      addRelationship(
          catalog.getParent().getId(),
          catalog.getId(),
          ASSET_CATALOG,
          ASSET_CATALOG,
          Relationship.CONTAINS);
    }
  }

  @Override
  public EntityUpdater getUpdater(
      AssetCatalog original, AssetCatalog updated, Operation operation, ChangeSource changeSource) {
    return new AssetCatalogUpdater(original, updated, operation);
  }

  @Override
  protected void preDelete(AssetCatalog catalog, String deletedBy) {
    // 删除前检查是否包含子目录
    int childrenCount = getChildrenCount(catalog);
    if (childrenCount > 0) {
      throw new IllegalArgumentException(
          String.format(
              "资产目录 [%s] 下包含 %d 个子目录，无法删除。请先删除或移动所有子目录。",
              catalog.getFullyQualifiedName(), childrenCount));
    }

    // 删除前检查是否包含数据资产
    int assetCount = getAssetCount(catalog);
    if (assetCount > 0) {
      throw new IllegalArgumentException(
          String.format(
              "资产目录 [%s] 下包含 %d 个数据资产，无法删除。请先删除或移动所有数据资产。",
              catalog.getFullyQualifiedName(), assetCount));
    }
  }

  protected List<EntityReference> getChildren(AssetCatalog catalog) {
    return findTo(catalog.getId(), ASSET_CATALOG, Relationship.CONTAINS, ASSET_CATALOG);
  }

  private int getChildrenCount(AssetCatalog catalog) {
    return daoCollection
        .relationshipDAO()
        .findTo(catalog.getId(), ASSET_CATALOG, Relationship.CONTAINS.ordinal(), ASSET_CATALOG)
        .size();
  }

  private Integer getAssetCount(AssetCatalog catalog) {
    // 查询该目录下包含的数据资产数量（Catalog CONTAINS DataAsset，查 to 端）
    return findTo(catalog.getId(), ASSET_CATALOG, Relationship.CONTAINS, Entity.DATA_ASSET).size();
  }

  @Override
  public String exportToCsv(String name, String user, boolean recursive) throws IOException {
    AssetCatalog catalog = getByName(null, name, Fields.EMPTY_FIELDS);
    Fields fields = getFields("owners,tags,reviewers,category,parent,children,assetCount,level,order,domain,extension");
    List<AssetCatalog> catalogs =
        listAll(fields, new ListFilter(Include.NON_DELETED));
    catalogs.sort(
        (a, b) -> a.getFullyQualifiedName().compareTo(b.getFullyQualifiedName()));
    return new AssetCatalogCsv(user).exportCsv(catalogs);
  }

  @Override
  public CsvImportResult importFromCsv(
      String name, String csv, boolean dryRun, String user, boolean recursive) throws IOException {
    AssetCatalogCsv catalogCsv = new AssetCatalogCsv(user);
    return catalogCsv.importCsv(csv, dryRun);
  }

  /** CSV 导入导出内部类 */
  public class AssetCatalogCsv extends EntityCsv<AssetCatalog> {
    public static final CsvDocumentation DOCUMENTATION =
        getCsvDocumentation(Entity.ASSET_CATALOG, false);
    public static final List<CsvHeader> HEADERS = DOCUMENTATION.getHeaders();

    public AssetCatalogCsv(String user) {
      super(Entity.ASSET_CATALOG, HEADERS, user);
    }

    @Override
    protected void createEntity(CSVPrinter printer, List<CSVRecord> csvRecords) throws IOException {
      CSVRecord csvRecord = getNextRecord(printer, csvRecords);
      AssetCatalog catalog = new AssetCatalog()
          .withName(csvRecord.get(2))
          .withDisplayName(csvRecord.get(3))
          .withDescription(csvRecord.get(4))
          .withOrder(Integer.parseInt(csvRecord.get(5)))
          .withCategory(
              EntityUtil.getEntityReference(Entity.ASSET_CATEGORY, csvRecord.get(0)))
          .withParent(csvRecord.get(1).isEmpty()
                  ? null
                  : EntityUtil.getEntityReference(Entity.ASSET_CATALOG, csvRecord.get(1)))
          .withTags(getTagLabels(printer, csvRecord, List.of()))
          .withReviewers(getReviewers(printer, csvRecord, 7))
          .withOwners(getOwners(printer, csvRecord, 8))
          .withExtension(getExtension(printer, csvRecord, 10));

      if (processRecord) {
        createEntity(printer, csvRecord, catalog, Entity.ASSET_CATALOG);
      }
    }

    @Override
    protected void addRecord(CsvFile csvFile, AssetCatalog entity) {
      List<String> recordList = new ArrayList<>();
      addField(recordList, entity.getCategory() != null ? entity.getCategory().getFullyQualifiedName() : "");
      addField(recordList, entity.getParent() != null ? entity.getParent().getFullyQualifiedName() : "");
      addField(recordList, entity.getName());
      addField(recordList, entity.getDisplayName());
      addField(recordList, entity.getDescription());
      addField(recordList, entity.getOrder().toString());
      addTagLabels(recordList, entity.getTags());
      addReviewers(recordList, entity.getReviewers());
      addOwners(recordList, entity.getOwners());
      addExtension(recordList, entity.getExtension());
      addRecord(csvFile, recordList);
    }
  }

  /** 处理 PUT 和 POST 操作的实体更新逻辑 */
  public class AssetCatalogUpdater extends EntityUpdater {
    public AssetCatalogUpdater(AssetCatalog original, AssetCatalog updated, Operation operation) {
      super(original, updated, operation);
    }

    @Override
    public void entitySpecificUpdate(boolean consolidatingChanges) {
      // level 字段在 prepare 阶段已设置，更新时保持不变
      updated.setLevel(original.getLevel());
    }
  }
}
