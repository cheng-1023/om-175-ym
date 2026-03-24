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

import static org.openmetadata.csv.CsvUtil.addEntityReferences;
import static org.openmetadata.csv.CsvUtil.addExtension;
import static org.openmetadata.csv.CsvUtil.addField;
import static org.openmetadata.csv.CsvUtil.addOwners;
import static org.openmetadata.csv.CsvUtil.addReviewers;
import static org.openmetadata.csv.CsvUtil.addTagLabels;
import static org.openmetadata.service.Entity.ASSET_ATTRIBUTE;
import static org.openmetadata.service.Entity.ASSET_TYPE;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.openmetadata.csv.EntityCsv;
import org.openmetadata.schema.entity.data.asset.AssetType;
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
import org.openmetadata.service.resources.asset.AssetTypeResource;
import org.openmetadata.service.util.EntityUtil.Fields;

@Repository
public class AssetTypeRepository extends EntityRepository<AssetType> {
  private static final String UPDATE_FIELDS = "";
  private static final String PATCH_FIELDS = "";

  public AssetTypeRepository() {
    super(
        AssetTypeResource.COLLECTION_PATH,
        Entity.ASSET_TYPE,
        AssetType.class,
        Entity.getCollectionDAO().assetTypeDAO(),
        PATCH_FIELDS,
        UPDATE_FIELDS);
    quoteFqn = true;
    supportsSearch = true;
    renameAllowed = true;
  }

  @Override
  public void setFields(AssetType assetType, Fields fields) {
    assetType.setAttributes(
        fields.contains("attributes") ? getAttributes(assetType) : assetType.getAttributes());
    assetType.setAssetCount(
        fields.contains("assetCount") ? getAssetCount(assetType) : assetType.getAssetCount());
  }

  @Override
  public void clearFields(AssetType assetType, Fields fields) {
    assetType.setAttributes(fields.contains("attributes") ? assetType.getAttributes() : null);
    assetType.setAssetCount(fields.contains("assetCount") ? assetType.getAssetCount() : null);
  }

  @Override
  public void prepare(AssetType assetType, boolean update) {
    // 准备逻辑，暂无特殊处理
  }

  @Override
  public void storeEntity(AssetType assetType, boolean update) {
    // 存储前清除 attributes 引用字段，避免冗余序列化到 JSON（关系通过关系表管理）
    List<EntityReference> attributes = assetType.getAttributes();
    assetType.setAttributes(null);
    store(assetType, update);
    // 恢复 attributes 字段，供后续 storeRelationships() 使用
    assetType.setAttributes(attributes);
  }

  @Override
  public void storeRelationships(AssetType assetType) {
    // 存储 AssetType 与 AssetAttribute 的关联关系
    if (assetType.getAttributes() != null) {
      for (EntityReference attribute : assetType.getAttributes()) {
        addRelationship(
            assetType.getId(), attribute.getId(), ASSET_TYPE, ASSET_ATTRIBUTE, Relationship.HAS);
      }
    }
  }

  private List<EntityReference> getAttributes(AssetType assetType) {
    return findTo(assetType.getId(), ASSET_TYPE, Relationship.HAS, ASSET_ATTRIBUTE);
  }

  private Integer getAssetCount(AssetType assetType) {
    return findTo(assetType.getId(), ASSET_TYPE, Relationship.HAS, Entity.DATA_ASSET).size();
  }

  @Override
  public EntityUpdater getUpdater(
      AssetType original, AssetType updated, Operation operation, ChangeSource changeSource) {
    return new AssetTypeUpdater(original, updated, operation);
  }

  @Override
  public String exportToCsv(String name, String user, boolean recursive) throws IOException {
    Fields fields = getFields("owners,tags,reviewers,attributes,domain,extension");
    List<AssetType> assetTypes =
        listAll(fields, new ListFilter(Include.NON_DELETED));
    assetTypes.sort(
        (a, b) -> a.getFullyQualifiedName().compareTo(b.getFullyQualifiedName()));
    return new AssetTypeCsv(user).exportCsv(assetTypes);
  }

  @Override
  public CsvImportResult importFromCsv(
      String name, String csv, boolean dryRun, String user, boolean recursive) throws IOException {
    AssetTypeCsv typeCsv = new AssetTypeCsv(user);
    return typeCsv.importCsv(csv, dryRun);
  }

  /** CSV 导入导出内部类 */
  public class AssetTypeCsv extends EntityCsv<AssetType> {
    public static final CsvDocumentation DOCUMENTATION =
        getCsvDocumentation(Entity.ASSET_TYPE, false);
    public static final List<CsvHeader> HEADERS = DOCUMENTATION.getHeaders();

    public AssetTypeCsv(String user) {
      super(Entity.ASSET_TYPE, HEADERS, user);
    }

    @Override
    protected void createEntity(CSVPrinter printer, List<CSVRecord> csvRecords) throws IOException {
      CSVRecord csvRecord = getNextRecord(printer, csvRecords);
      AssetType assetType = new AssetType()
          .withName(csvRecord.get(0))
          .withDisplayName(csvRecord.get(1))
          .withDescription(csvRecord.get(2))
          .withAttributes(getEntityReferences(printer, csvRecord, 3, Entity.ASSET_ATTRIBUTE))
          .withTags(getTagLabels(printer, csvRecord, List.of()))
          .withReviewers(getReviewers(printer, csvRecord, 5))
          .withOwners(getOwners(printer, csvRecord, 6))
          .withExtension(getExtension(printer, csvRecord, 8));

      if (processRecord) {
        createEntity(printer, csvRecord, assetType, Entity.ASSET_TYPE);
      }
    }

    @Override
    protected void addRecord(CsvFile csvFile, AssetType entity) {
      List<String> recordList = new ArrayList<>();
      addField(recordList, entity.getName());
      addField(recordList, entity.getDisplayName());
      addField(recordList, entity.getDescription());
      addEntityReferences(recordList, entity.getAttributes());
      addTagLabels(recordList, entity.getTags());
      addReviewers(recordList, entity.getReviewers());
      addOwners(recordList, entity.getOwners());
      addExtension(recordList, entity.getExtension());
      addRecord(csvFile, recordList);
    }
  }

  /** 处理 PUT 和 POST 操作的实体更新逻辑 */
  public class AssetTypeUpdater extends EntityUpdater {
    public AssetTypeUpdater(AssetType original, AssetType updated, Operation operation) {
      super(original, updated, operation);
    }

    @Override
    public void entitySpecificUpdate(boolean consolidatingChanges) {
      updateAttributes(original, updated);
    }

    private void updateAttributes(AssetType original, AssetType updated) {
      List<EntityReference> origAttributes = 
          original.getAttributes() == null ? java.util.Collections.emptyList() : original.getAttributes();
      List<EntityReference> updatedAttributes = 
          updated.getAttributes() == null ? java.util.Collections.emptyList() : updated.getAttributes();

      updateToRelationships(
          "attributes",
          ASSET_TYPE,
          original.getId(),
          Relationship.HAS,
          ASSET_ATTRIBUTE,
          origAttributes,
          updatedAttributes,
          false);
    }
  }
}
