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
import static org.openmetadata.service.Entity.ASSET_TYPE;
import static org.openmetadata.service.Entity.DATA_ASSET;
import static org.openmetadata.service.util.EntityUtil.toEntityReferences;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.openmetadata.csv.EntityCsv;
import org.openmetadata.schema.entity.data.asset.AssetCatalog;
import org.openmetadata.schema.entity.data.asset.AssetType;
import org.openmetadata.schema.entity.data.asset.DataAsset;
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
import org.openmetadata.service.resources.asset.DataAssetResource;
import org.openmetadata.service.util.EntityUtil.Fields;



@Repository
public class DataAssetRepository extends EntityRepository<DataAsset> {
  private static final String UPDATE_FIELDS = "";
  private static final String PATCH_FIELDS = "";

  public DataAssetRepository() {
    super(
        DataAssetResource.COLLECTION_PATH,
        Entity.DATA_ASSET,
        DataAsset.class,
        Entity.getCollectionDAO().dataAssetDAO(),
        PATCH_FIELDS,
        UPDATE_FIELDS);
    quoteFqn = true;
    supportsSearch = true;
    renameAllowed = true;
  }

  @Override
  public void setFields(DataAsset asset, Fields fields) {
    // 从关系表恢复 assetType 和 catalog 引用
    asset.setAssetType(getAssetTypeRef(asset));
    asset.setCatalog(getCatalogRef(asset));
  }

  @Override
  public void clearFields(DataAsset asset, Fields fields) {
    // 暂无额外的字段清理
  }

  @Override
  public void prepare(DataAsset asset, boolean update) {
    // 验证assetType必填
    if (asset.getAssetType() == null) {
      throw new IllegalArgumentException("资产类型(AssetType)不能为空");
    }

    // 通过 EntityReference 获取完整 AssetType 实体并转换为完整的 EntityReference
    AssetType assetType = Entity.getEntity(asset.getAssetType(), "", Include.NON_DELETED);
    asset.setAssetType(assetType.getEntityReference());

    // 验证 catalog 存在性（如果提供），并转换为完整的 EntityReference
    if (asset.getCatalog() != null) {
      AssetCatalog catalog = Entity.getEntity(asset.getCatalog(), "", Include.NON_DELETED);
      asset.setCatalog(catalog.getEntityReference());
    }
  }

  @Override
  public void storeEntity(DataAsset asset, boolean update) {
    // 存储前清除引用字段，避免冗余序列化到 JSON（关系通过关系表管理）
    EntityReference assetType = asset.getAssetType();
    EntityReference catalog = asset.getCatalog();
    asset.setAssetType(null);
    asset.setCatalog(null);
    store(asset, update);
    // 恢复引用字段，供后续 storeRelationships() 使用
    asset.setAssetType(assetType);
    asset.setCatalog(catalog);
  }

  @Override
  public void storeRelationships(DataAsset asset) {
    // 存储 DataAsset 与 AssetType 的关联关系
    if (asset.getAssetType() != null && asset.getAssetType().getId() != null) {
      addRelationship(
          asset.getId(),
          asset.getAssetType().getId(),
          DATA_ASSET,
          ASSET_TYPE,
          Relationship.HAS);
    }
    // 存储 DataAsset 与 AssetCatalog 的关联关系（Catalog CONTAINS DataAsset）
    if (asset.getCatalog() != null && asset.getCatalog().getId() != null) {
      addRelationship(
          asset.getCatalog().getId(),
          asset.getId(),
          ASSET_CATALOG,
          DATA_ASSET,
          Relationship.CONTAINS);
    }
  }

  @Override
  public EntityUpdater getUpdater(
      DataAsset original, DataAsset updated, Operation operation, ChangeSource changeSource) {
    return new DataAssetUpdater(original, updated, operation);
  }

  /** 从关系表恢复 DataAsset 关联的 AssetType（DataAsset HAS AssetType） */
  private EntityReference getAssetTypeRef(DataAsset asset) {
    return getToEntityRef(asset.getId(), Relationship.HAS, ASSET_TYPE, false);
  }

  /** 从关系表恢复 DataAsset 所属的 AssetCatalog（AssetCatalog CONTAINS DataAsset） */
  private EntityReference getCatalogRef(DataAsset asset) {
    return getFromEntityRef(asset.getId(), DATA_ASSET, Relationship.CONTAINS, ASSET_CATALOG, false);
  }

  @Override
  public String exportToCsv(String name, String user, boolean recursive) throws IOException {
    Fields fields = getFields("owners,tags,reviewers,assetType,catalog,attributeValues,domain,extension");
    List<DataAsset> assets =
        listAll(fields, new ListFilter(Include.NON_DELETED));
    assets.sort(
        (a, b) -> a.getFullyQualifiedName().compareTo(b.getFullyQualifiedName()));
    return new DataAssetCsv(user).exportCsv(assets);
  }

  @Override
  public CsvImportResult importFromCsv(
      String name, String csv, boolean dryRun, String user, boolean recursive) throws IOException {
    DataAssetCsv assetCsv = new DataAssetCsv(user);
    return assetCsv.importCsv(csv, dryRun);
  }

  /** CSV 导入导出内部类 */
  public class DataAssetCsv extends EntityCsv<DataAsset> {
    public static final CsvDocumentation DOCUMENTATION =
        getCsvDocumentation(Entity.DATA_ASSET, false);
    public static final List<CsvHeader> HEADERS = DOCUMENTATION.getHeaders();

    public DataAssetCsv(String user) {
      super(Entity.DATA_ASSET, HEADERS, user);
    }

    @Override
    protected void createEntity(CSVPrinter printer, List<CSVRecord> csvRecords) throws IOException {
      CSVRecord csvRecord = getNextRecord(printer, csvRecords);
      DataAsset asset = new DataAsset()
          .withName(csvRecord.get(0))
          .withDisplayName(csvRecord.get(1))
          .withDescription(csvRecord.get(2))
          .withTags(getTagLabels(printer, csvRecord, List.of()))
          .withReviewers(getReviewers(printer, csvRecord, 6))
          .withOwners(getOwners(printer, csvRecord, 7))
          .withExtension(getExtension(printer, csvRecord, 9));

      if (processRecord) {
        createEntity(printer, csvRecord, asset, Entity.DATA_ASSET);
      }
    }

    @Override
    protected void addRecord(CsvFile csvFile, DataAsset entity) {
      List<String> recordList = new ArrayList<>();
      addField(recordList, entity.getName());
      addField(recordList, entity.getDisplayName());
      addField(recordList, entity.getDescription());
      addField(recordList, entity.getAssetType() != null ? entity.getAssetType().getFullyQualifiedName() : null);
      addField(recordList, entity.getCatalog() != null ? entity.getCatalog().getFullyQualifiedName() : null);
      addTagLabels(recordList, entity.getTags());
      addReviewers(recordList, entity.getReviewers());
      addOwners(recordList, entity.getOwners());
      addExtension(recordList, entity.getExtension());
      addRecord(csvFile, recordList);
    }
  }

  /** 处理 PUT 和 POST 操作的实体更新逻辑 */
  public class DataAssetUpdater extends EntityUpdater {
    public DataAssetUpdater(DataAsset original, DataAsset updated, Operation operation) {
      super(original, updated, operation);
    }
  }
}
