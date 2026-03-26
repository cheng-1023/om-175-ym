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

import org.openmetadata.schema.entity.data.asset.AssetType;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.Relationship;
import org.openmetadata.schema.type.change.ChangeSource;
import org.openmetadata.schema.type.csv.CsvDocumentation;
import org.openmetadata.schema.type.csv.CsvHeader;
import org.openmetadata.schema.type.csv.CsvImportResult;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.EntityRepository;
import org.openmetadata.service.jdbi3.Repository;
import org.openmetadata.service.resources.asset.AssetTypeResource;
import org.openmetadata.service.util.EntityUtil.Fields;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import static org.openmetadata.service.Entity.ASSET_ATTRIBUTE;
import static org.openmetadata.service.Entity.ASSET_TYPE;

@Repository
public class AssetTypeRepository extends EntityRepository<AssetType> {
  private static final String UPDATE_FIELDS = "owners,tags,reviewers,attributes,domain,extension";
  private static final String PATCH_FIELDS = "owners,tags,reviewers,attributes,domain,extension";

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
    if (assetType.getAttributes() != null) {
      List<EntityReference> attributes = new ArrayList<>();
      for (EntityReference ref : assetType.getAttributes()) {
        org.openmetadata.schema.entity.data.asset.AssetAttribute resolvedAttr = 
            Entity.getEntity(ref, "", Include.NON_DELETED);
        attributes.add(resolvedAttr.getEntityReference());
      }
      assetType.setAttributes(attributes);
    }
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

  public static final CsvDocumentation ASSET_TYPE_CSV_DOC = new CsvDocumentation().withHeaders(
      java.util.Collections.singletonList(
          new CsvHeader().withName("name").withDescription("资产属性名称").withRequired(true)
      )
  );

  @Override
  public String exportToCsv(String name, String user, boolean recursive) throws IOException {
    AssetType assetType = getByName(null, name, getFields("attributes"));
    java.io.StringWriter stringWriter = new java.io.StringWriter();
    try (org.apache.commons.csv.CSVPrinter printer = new org.apache.commons.csv.CSVPrinter(stringWriter, org.apache.commons.csv.CSVFormat.DEFAULT.withHeader("name"))) {
        if (assetType.getAttributes() != null) {
            for (EntityReference ref : assetType.getAttributes()) {
                 printer.printRecord(ref.getName());
            }
        }
    }
    return stringWriter.toString();
  }

  @Override
  public CsvImportResult importFromCsv(
      String name, String csv, boolean dryRun, String user, boolean recursive) throws IOException {
    AssetType assetType = getByName(null, name, getFields("attributes"));
    AssetAttributeRepository attributeRepository =
        (AssetAttributeRepository) Entity.getEntityRepository(Entity.ASSET_ATTRIBUTE);
    
    CsvImportResult result = new CsvImportResult().withDryRun(dryRun);
    List<EntityReference> newAttributes = new ArrayList<>();
    
    java.io.StringWriter stringWriter = new java.io.StringWriter();
    try (org.apache.commons.csv.CSVPrinter printer = new org.apache.commons.csv.CSVPrinter(stringWriter, org.apache.commons.csv.CSVFormat.DEFAULT.withHeader("status", "details", "name"))) {
        try (org.apache.commons.csv.CSVParser csvParser = org.apache.commons.csv.CSVParser.parse(csv, org.apache.commons.csv.CSVFormat.DEFAULT.withHeader())) {
            List<String> headers = csvParser.getHeaderNames();
            if (headers == null || headers.isEmpty() || !headers.get(0).equals("name")) {
                 return result.withNumberOfRowsFailed(1)
                              .withImportResultsCsv("failure,Invalid header (expected 'name'),\n");
            }
            
            int rowsPassed = 0;
            int rowsFailed = 0;
            
            for (org.apache.commons.csv.CSVRecord record : csvParser) {
               String attrName = record.get(0);
               if (attrName == null || attrName.trim().isEmpty()) {
                   printer.printRecord("failure", "Name cannot be empty", "");
                   rowsFailed++;
                   continue;
               }
               try {
                 org.openmetadata.schema.entity.data.asset.AssetAttribute attr = attributeRepository.getByName(null, attrName.trim(), attributeRepository.getFields(""));
                 newAttributes.add(attr.getEntityReference());
                 printer.printRecord("success", "Entity linked", attrName.trim());
                 rowsPassed++;
               } catch (Exception e) {
                 printer.printRecord("failure", "Attribute not found", attrName.trim());
                 rowsFailed++;
               }
            }
            result.withNumberOfRowsPassed(rowsPassed).withNumberOfRowsFailed(rowsFailed);
        }
    }
    result.withImportResultsCsv(stringWriter.toString());

    if (!dryRun && result.getNumberOfRowsPassed() != null && result.getNumberOfRowsPassed() > 0) {
      // 批量维护：以导入的 CSV 为准进行全量替换
      AssetType updated = org.openmetadata.service.util.JsonUtils.deepCopy(assetType, AssetType.class);
      updated.setAttributes(newAttributes);
      
      javax.json.JsonPatch patch = org.openmetadata.service.util.JsonUtils.getJsonPatch(assetType, updated);
      patch(null, assetType.getId(), user, patch);
    }
    
    return result;
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
