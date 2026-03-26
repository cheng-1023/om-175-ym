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

import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.openmetadata.csv.EntityCsv;
import org.openmetadata.schema.entity.data.asset.AssetCatalog;
import org.openmetadata.schema.entity.data.asset.AssetType;
import org.openmetadata.schema.entity.data.asset.AttributeValue;
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

import java.io.IOException;
import java.util.*;

import static org.openmetadata.csv.CsvUtil.*;
import static org.openmetadata.service.Entity.*;



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
    // 将 extension 中的动态属性值转换为 attributeValues 列表
    // DataAsset 的动态属性由 AssetType/AssetAttribute 体系管理，
    // 不走 TypeRegistry 的 extension 验证路径
    convertExtensionToAttributeValues(asset);

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

  /**
   * 将 extension Map 转换为 List<AttributeValue> 并清除 extension。
   * 前端通过 extension 字段传入动态属性值（如 {attrName: value}），
   * 但 DataAsset 的属性由 AssetType/AssetAttribute 自定义体系管理，
   * 不在 TypeRegistry 中注册，validateExtension() 会报 unknownCustomField。
   * 此方法在 prepare() 中执行，覆盖 CREATE/PUT/PATCH 所有路径。
   */
  @SuppressWarnings("unchecked")
  private void convertExtensionToAttributeValues(DataAsset asset) {
    Object extension = asset.getExtension();
    if (extension == null) {
      return;
    }

    if (extension instanceof java.util.Map) {
      java.util.Map<String, Object> extMap = (java.util.Map<String, Object>) extension;
      List<AttributeValue> attributeValues = asset.getAttributeValues();
      if (attributeValues == null) {
        attributeValues = new ArrayList<>();
      }

      for (java.util.Map.Entry<String, Object> entry : extMap.entrySet()) {
        // 移除同名的旧值（PATCH 场景可能会覆盖）
        String attrName = entry.getKey();
        attributeValues.removeIf(av -> attrName.equals(av.getName()));
        attributeValues.add(
            new AttributeValue()
                .withName(attrName)
                .withValue(entry.getValue()));
      }
      asset.setAttributeValues(attributeValues);
    }

    // 清除 extension，防止 validateExtension 报错
    asset.setExtension(null);
  }

  @Override
  public void restorePatchAttributes(DataAsset original, DataAsset updated) {
    // Patch can't make changes to following fields. Ignore the changes
    super.restorePatchAttributes(original, updated);
    updated.setAssetType(original.getAssetType());
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

  /**
   * 覆写 postUpdate：当 catalog 或 assetType 等自定义字段发生变更时，
   * 强制走全量重建 ES 索引文档的路径。
   * <p>
   * 原因：SearchRepository.getScriptWithParams() 中的增量更新脚本只处理了
   * 标准字段（followers、votes、usageSummary 等），不感知 DataAsset 的
   * catalog/assetType 这类自定义引用字段。如果走增量路径，变更后的 catalog
   * 值不会写入 ES 文档，导致概览页面显示旧数据。
   * <p>
   * 通过清除 incrementalChangeDescription，updateEntity 会进入 else 分支
   * （完整重建 SearchIndex doc），确保所有字段都被正确索引。
   */
  @Override
  protected void postUpdate(DataAsset original, DataAsset updated) {
    // 确保 updated 实体上的引用字段已恢复（从关系表重新加载），
    // 以保证 ES 索引文档中 catalog/assetType 的值是最新的
    updated.setAssetType(getAssetTypeRef(updated));
    updated.setCatalog(getCatalogRef(updated));

    // 清除增量变更描述，强制 SearchRepository.updateEntity()
    // 走全量重建索引文档的路径
    updated.setIncrementalChangeDescription(null);
    updated.setChangeDescription(null);

    super.postUpdate(original, updated);
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
    assets.sort(Comparator.comparing(DataAsset::getFullyQualifiedName));
    return new DataAssetCsv(user).exportCsv(assets);
  }

  @Override
  public CsvImportResult importFromCsv(
      String name, String csv, boolean dryRun, String user, boolean recursive) throws IOException {
    DataAssetCsv assetCsv = new DataAssetCsv(user);
    return assetCsv.importCsv(csv, dryRun);
  }

  /** CSV 导入导出内部类 */
  public static class DataAssetCsv extends EntityCsv<DataAsset> {
    public static final CsvDocumentation DOCUMENTATION =
        getCsvDocumentation(Entity.DATA_ASSET, false);
    public static final List<CsvHeader> HEADERS = DOCUMENTATION.getHeaders();

    public DataAssetCsv(String user) {
      super(Entity.DATA_ASSET, HEADERS, user);
    }

    @Override
    protected void createEntity(CSVPrinter printer, List<CSVRecord> csvRecords) throws IOException {
      CSVRecord csvRecord = getNextRecord(printer, csvRecords);
      if (csvRecord == null) {
        return;
      }

      Map<String, Object> extensionMap = null;
      String extensionString = csvRecord.get(9);
      if (!org.openmetadata.common.utils.CommonUtil.nullOrEmpty(extensionString)) {
        extensionMap = new HashMap<>();
        for (String extensions : org.openmetadata.csv.CsvUtil.fieldToExtensionStrings(extensionString)) {
          int separatorIndex = extensions.indexOf(org.openmetadata.csv.CsvUtil.ENTITY_TYPE_SEPARATOR);
          if (separatorIndex == -1) {
            importFailure(printer, invalidExtension(9, extensions, "null"), csvRecord);
            continue;
          }
          String key = extensions.substring(0, separatorIndex);
          String value = extensions.substring(separatorIndex + 1);
          if (key.isEmpty() || value.isEmpty()) {
            importFailure(printer, invalidExtension(9, key, value), csvRecord);
          } else {
            extensionMap.put(key, value);
          }
        }
      }

      DataAsset asset = new DataAsset()
          .withName(csvRecord.get(0))
          .withDisplayName(csvRecord.get(1))
          .withDescription(csvRecord.get(2))
          .withAssetType(getEntityReference(printer, csvRecord, 3, Entity.ASSET_TYPE))
          .withCatalog(getEntityReference(printer, csvRecord, 4, Entity.ASSET_CATALOG))
          .withTags(getTagLabels(printer, csvRecord, List.of(org.apache.commons.lang3.tuple.Pair.of(5, org.openmetadata.schema.type.TagLabel.TagSource.CLASSIFICATION))))
          .withReviewers(getReviewers(printer, csvRecord, 6))
          .withOwners(getOwners(printer, csvRecord, 7))
          .withDomain(getEntityReference(printer, csvRecord, 8, Entity.DOMAIN))
          .withExtension(extensionMap);

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
      addField(recordList, entity.getDomain() != null ? entity.getDomain().getFullyQualifiedName() : null);
      
      java.util.Map<String, Object> extensionMap = null;
      if (entity.getAttributeValues() != null && !entity.getAttributeValues().isEmpty()) {
        extensionMap = new java.util.LinkedHashMap<>();
        for (AttributeValue av : entity.getAttributeValues()) {
            extensionMap.put(av.getName(), av.getValue());
        }
      }
      addExtension(recordList, extensionMap);
      
      addRecord(csvFile, recordList);
    }
  }

  /** 处理 PUT 和 POST 操作的实体更新逻辑 */
  public class DataAssetUpdater extends EntityUpdater {
    public DataAssetUpdater(DataAsset original, DataAsset updated, Operation operation) {
      super(original, updated, operation);
    }
    
    @org.jdbi.v3.sqlobject.transaction.Transaction
    @Override
    public void entitySpecificUpdate(boolean consolidatingChanges) {
      recordChange("attributeValues", original.getAttributeValues(), updated.getAttributeValues());
      updateCatalog(original, updated);
      updateAssetType(original, updated);
    }
    
    private void updateCatalog(DataAsset original, DataAsset updated) {
      EntityReference origCatalog = original.getCatalog();
      EntityReference updatedCatalog = updated.getCatalog();
      if (recordChange("catalog", origCatalog, updatedCatalog)) {
        if (origCatalog != null) {
          deleteRelationship(
              origCatalog.getId(),
              ASSET_CATALOG,
              original.getId(),
              DATA_ASSET,
              Relationship.CONTAINS);
        }
        if (updatedCatalog != null) {
          addRelationship(
              updatedCatalog.getId(),
              original.getId(),
              ASSET_CATALOG,
              DATA_ASSET,
              Relationship.CONTAINS);
        }
      }
    }
    
    private void updateAssetType(DataAsset original, DataAsset updated) {
      EntityReference origAssetType = original.getAssetType();
      EntityReference updatedAssetType = updated.getAssetType();
      if (recordChange("assetType", origAssetType, updatedAssetType)) {
        if (origAssetType != null) {
          deleteRelationship(
              original.getId(),
              DATA_ASSET,
              origAssetType.getId(),
              ASSET_TYPE,
              Relationship.HAS);
        }
        if (updatedAssetType != null) {
          addRelationship(
              original.getId(),
              updatedAssetType.getId(),
              DATA_ASSET,
              ASSET_TYPE,
              Relationship.HAS);
        }
      }
    }
  }
}
