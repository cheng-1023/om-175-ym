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

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.openmetadata.csv.EntityCsv;
import org.openmetadata.schema.entity.data.asset.AssetCatalog;
import org.openmetadata.schema.entity.data.asset.AssetCategory;
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
import org.openmetadata.service.resources.asset.AssetCategoryResource;
import org.openmetadata.service.util.EntityUtil.Fields;

@Repository
public class AssetCategoryRepository extends EntityRepository<AssetCategory> {
  private static final String UPDATE_FIELDS = "";
  private static final String PATCH_FIELDS = "";

  public AssetCategoryRepository() {
    super(
        AssetCategoryResource.COLLECTION_PATH,
        Entity.ASSET_CATEGORY,
        AssetCategory.class,
        Entity.getCollectionDAO().assetCategoryDAO(),
        PATCH_FIELDS,
        UPDATE_FIELDS);
    quoteFqn = true;
    supportsSearch = true;
    renameAllowed = true;
  }

  @Override
  public void setFields(AssetCategory category, Fields fields) {
    category.setCatalogCount(
        fields.contains("catalogCount") ? getCatalogCount(category) : category.getCatalogCount());
  }

  @Override
  public void clearFields(AssetCategory category, Fields fields) {
    category.setCatalogCount(fields.contains("catalogCount") ? category.getCatalogCount() : null);
  }

  @Override
  public void prepare(AssetCategory category, boolean update) {
    // 准备逻辑，暂无特殊处理
  }

  @Override
  protected void preDelete(AssetCategory category, String deletedBy) {
    // 1. 检查是否有绑定的数据资产
    int dataAssetCount = getDataAssetCount(category);
    if (dataAssetCount > 0) {
      throw new IllegalArgumentException(
          String.format(
              "资产分类 [%s] 下(含子孙目录)一共绑定了 %d 个数据资产，无法删除。请先删除或移除相关数据资产。",
              category.getFullyQualifiedName(), dataAssetCount));
    }

    // 2. 级联删除检查：删除category前检查是否有关联的catalog
    int catalogCount = getCatalogCount(category);
    if (catalogCount > 0) {
      throw new IllegalArgumentException(
          String.format(
              "资产分类 [%s] 下包含 %d 个资产目录，无法删除。请先删除或移动所有资产目录。",
              category.getFullyQualifiedName(), catalogCount));
    }
  }

  @Override
  public void storeEntity(AssetCategory category, boolean update) {
    store(category, update);
  }

  @Override
  public void storeRelationships(AssetCategory category) {
    // 存储关联关系，暂无特殊处理
  }

  private int getDataAssetCount(AssetCategory category) {
    int total = 0;
    // 获取该分类下所有的资产目录
    List<EntityReference> catalogs = findTo(
            category.getId(),
            Entity.ASSET_CATEGORY,
            Relationship.HAS,
            Entity.ASSET_CATALOG);
            
    for (EntityReference catalogRef : catalogs) {
        total += findTo(
                catalogRef.getId(),
                Entity.ASSET_CATALOG,
                Relationship.CONTAINS,
                Entity.DATA_ASSET).size();
    }
    return total;
  }

  private Integer getCatalogCount(AssetCategory category) {
    // 统计当前category下的catalog数量
    return findTo(
            category.getId(),
            Entity.ASSET_CATEGORY,
            Relationship.HAS,
            Entity.ASSET_CATALOG)
        .size();
  }

  @Override
  public EntityUpdater getUpdater(
      AssetCategory original, AssetCategory updated, Operation operation, ChangeSource changeSource) {
    return new AssetCategoryUpdater(original, updated, operation);
  }

  @Override
  public String exportToCsv(String name, String user, boolean recursive) throws IOException {
    AssetCategory category = getByName(null, name, Fields.EMPTY_FIELDS);
    AssetCatalogRepository catalogRepository = (AssetCatalogRepository) Entity.getEntityRepository(Entity.ASSET_CATALOG);
    Fields fields = catalogRepository.getFields("category,parent,order");
    List<org.openmetadata.schema.entity.data.asset.AssetCatalog> catalogs =
        catalogRepository.listAll(fields, new ListFilter(Include.NON_DELETED));

    List<org.openmetadata.schema.entity.data.asset.AssetCatalog> categoryCatalogs = catalogs.stream()
        .filter(c -> c.getCategory() != null && c.getCategory().getId().equals(category.getId()))
        .sorted(Comparator.comparing(AssetCatalog::getFullyQualifiedName))
        .collect(java.util.stream.Collectors.toList());

    return new AssetCatalogRepository.AssetCatalogCsv(user).exportCsv(categoryCatalogs);
  }

  @Override
  public CsvImportResult importFromCsv(
      String name, String csv, boolean dryRun, String user, boolean recursive) throws IOException {
    AssetCategory category = getByName(null, name, Fields.EMPTY_FIELDS);
    AssetCatalogRepository catalogRepository = (AssetCatalogRepository) Entity.getEntityRepository(Entity.ASSET_CATALOG);
    AssetCatalogRepository.AssetCatalogCsv catalogCsv = new AssetCatalogRepository.AssetCatalogCsv(user, category.getFullyQualifiedName(), null);
    return catalogCsv.importCsv(csv, dryRun);
  }

  /** CSV 导入导出内部类 */
  public static class AssetCategoryCsv extends EntityCsv<AssetCategory> {
    public static final CsvDocumentation DOCUMENTATION =
        getCsvDocumentation(Entity.ASSET_CATEGORY, false);
    public static final List<CsvHeader> HEADERS = getHeaders();

    /**
     * 安全获取 CSV Headers，当 DOCUMENTATION 为 null 时（JSON 资源文件未被 classpath 正确加载），
     * 回退到手动定义的默认 Headers，避免 NoClassDefFoundError 导致整个类无法实例化。
     */
    private static List<CsvHeader> getHeaders() {
      if (DOCUMENTATION != null) {
        return DOCUMENTATION.getHeaders();
      }
      // 备用默认 Headers — 与 assetCategoryCsvDocumentation.json 保持一致
      List<CsvHeader> fallback = new ArrayList<>();
      fallback.add(new CsvHeader().withName("name").withRequired(true));
      fallback.add(new CsvHeader().withName("displayName").withRequired(false));
      fallback.add(new CsvHeader().withName("description").withRequired(false));
      fallback.add(new CsvHeader().withName("tags").withRequired(false));
      fallback.add(new CsvHeader().withName("reviewers").withRequired(false));
      fallback.add(new CsvHeader().withName("owner").withRequired(false));
      fallback.add(new CsvHeader().withName("domain").withRequired(false));
      fallback.add(new CsvHeader().withName("extension").withRequired(false));
      return fallback;
    }

    public AssetCategoryCsv(String user) {
      super(Entity.ASSET_CATEGORY, HEADERS, user);
    }

    @Override
    protected void createEntity(CSVPrinter printer, List<CSVRecord> csvRecords) throws IOException {
      CSVRecord csvRecord = getNextRecord(printer, csvRecords);
      if (csvRecord == null) {
        return; // getNextRecord 内部已记录了导入失败信息
      }
      AssetCategory category = new AssetCategory()
          .withName(csvRecord.get(0))
          .withDisplayName(csvRecord.get(1))
          .withDescription(csvRecord.get(2))
          .withTags(getTagLabels(printer, csvRecord, List.of()))
          .withReviewers(getReviewers(printer, csvRecord, 5))
          .withOwners(getOwners(printer, csvRecord, 6))
          .withExtension(getExtension(printer, csvRecord, 8));

      if (processRecord) {
        createEntity(printer, csvRecord, category, Entity.ASSET_CATEGORY);
      }
    }

    @Override
    protected void addRecord(CsvFile csvFile, AssetCategory entity) {
      List<String> recordList = new ArrayList<>();
      addField(recordList, entity.getName());
      addField(recordList, entity.getDisplayName());
      addField(recordList, entity.getDescription());
      addTagLabels(recordList, entity.getTags());
      addReviewers(recordList, entity.getReviewers());
      addOwners(recordList, entity.getOwners());
      addExtension(recordList, entity.getExtension());
      addRecord(csvFile, recordList);
    }
  }

  /** 处理 PUT 和 POST 操作的实体更新逻辑 */
  public class AssetCategoryUpdater extends EntityUpdater {
    public AssetCategoryUpdater(AssetCategory original, AssetCategory updated, Operation operation) {
      super(original, updated, operation);
    }
  }
}
