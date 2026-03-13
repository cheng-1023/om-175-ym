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
import java.util.List;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.openmetadata.csv.EntityCsv;
import org.openmetadata.schema.entity.data.asset.AssetAttribute;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.change.ChangeSource;
import org.openmetadata.schema.type.csv.CsvDocumentation;
import org.openmetadata.schema.type.csv.CsvFile;
import org.openmetadata.schema.type.csv.CsvHeader;
import org.openmetadata.schema.type.csv.CsvImportResult;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.EntityRepository;
import org.openmetadata.service.jdbi3.ListFilter;
import org.openmetadata.service.jdbi3.Repository;
import org.openmetadata.service.resources.asset.AssetAttributeResource;
import org.openmetadata.service.util.EntityUtil.Fields;

@Repository
public class AssetAttributeRepository extends EntityRepository<AssetAttribute> {
  private static final String UPDATE_FIELDS = "";
  private static final String PATCH_FIELDS = "";

  public AssetAttributeRepository() {
    super(
        AssetAttributeResource.COLLECTION_PATH,
        Entity.ASSET_ATTRIBUTE,
        AssetAttribute.class,
        Entity.getCollectionDAO().assetAttributeDAO(),
        PATCH_FIELDS,
        UPDATE_FIELDS);
    quoteFqn = true;
    supportsSearch = true;
    renameAllowed = true;
  }

  @Override
  public void setFields(AssetAttribute attribute, Fields fields) {
    // 暂无额外的字段设置
  }

  @Override
  public void clearFields(AssetAttribute attribute, Fields fields) {
    // 暂无额外的字段清理
  }

  @Override
  public void prepare(AssetAttribute attribute, boolean update) {
    // 准备逻辑，暂无特殊处理
  }

  @Override
  public void storeEntity(AssetAttribute attribute, boolean update) {
    store(attribute, update);
  }

  @Override
  public void storeRelationships(AssetAttribute attribute) {
    // 存储关联关系，暂无特殊处理
  }

  @Override
  public EntityUpdater getUpdater(
      AssetAttribute original, AssetAttribute updated, Operation operation, ChangeSource changeSource) {
    return new AssetAttributeUpdater(original, updated, operation);
  }

  @Override
  public String exportToCsv(String name, String user, boolean recursive) throws IOException {
    Fields fields = getFields("owners,tags,reviewers,attributeCategory,dataType,required,assignableRoles,domain,extension");
    List<AssetAttribute> attributes =
        listAll(fields, new ListFilter(Include.NON_DELETED));
    attributes.sort(
        (a, b) -> a.getFullyQualifiedName().compareTo(b.getFullyQualifiedName()));
    return new AssetAttributeCsv(user).exportCsv(attributes);
  }

  @Override
  public CsvImportResult importFromCsv(
      String name, String csv, boolean dryRun, String user, boolean recursive) throws IOException {
    AssetAttributeCsv assetAttributeCsv = new AssetAttributeCsv(user);
    return assetAttributeCsv.importCsv(csv, dryRun);
  }

  /** CSV 导入导出内部类 */
  public class AssetAttributeCsv extends EntityCsv<AssetAttribute> {
    public static final CsvDocumentation DOCUMENTATION =
        getCsvDocumentation(Entity.ASSET_ATTRIBUTE, false);
    public static final List<CsvHeader> HEADERS = DOCUMENTATION.getHeaders();

    public AssetAttributeCsv(String user) {
      super(Entity.ASSET_ATTRIBUTE, HEADERS, user);
    }

    @Override
    protected void createEntity(CSVPrinter printer, List<CSVRecord> csvRecords) throws IOException {
      CSVRecord csvRecord = getNextRecord(printer, csvRecords);
      AssetAttribute attribute = new AssetAttribute()
          .withName(csvRecord.get(0))
          .withDisplayName(csvRecord.get(1))
          .withDescription(csvRecord.get(2))
          .withAttributeCategory(AssetAttribute.AttributeCategory.valueOf(csvRecord.get(3)))
          .withDataType(AssetAttribute.DataType.valueOf(csvRecord.get(4)))
          .withRequired(Boolean.parseBoolean(csvRecord.get(5)))
          .withTags(getTagLabels(printer, csvRecord, List.of()))
          .withReviewers(getReviewers(printer, csvRecord, 7))
          .withOwners(getOwners(printer, csvRecord, 8))
          .withExtension(getExtension(printer, csvRecord, 10));

      if (processRecord) {
        createEntity(printer, csvRecord, attribute, Entity.ASSET_ATTRIBUTE);
      }
    }

    @Override
    protected void addRecord(CsvFile csvFile, AssetAttribute entity) {
      List<String> recordList = new ArrayList<>();
      addField(recordList, entity.getName());
      addField(recordList, entity.getDisplayName());
      addField(recordList, entity.getDescription());
      addField(recordList, entity.getAttributeCategory().value());
      addField(recordList, entity.getDataType().value());
      addField(recordList, entity.getRequired());
      addTagLabels(recordList, entity.getTags());
      addReviewers(recordList, entity.getReviewers());
      addOwners(recordList, entity.getOwners());
      addExtension(recordList, entity.getExtension());
      addRecord(csvFile, recordList);
    }
  }

  /** 处理 PUT 和 POST 操作的实体更新逻辑 */
  public class AssetAttributeUpdater extends EntityUpdater {
    public AssetAttributeUpdater(
        AssetAttribute original, AssetAttribute updated, Operation operation) {
      super(original, updated, operation);
    }
  }
}
