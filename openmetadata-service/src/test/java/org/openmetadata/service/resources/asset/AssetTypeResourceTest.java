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

package org.openmetadata.service.resources.asset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.openmetadata.service.util.TestUtils.ADMIN_AUTH_HEADERS;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.HttpResponseException;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.TestMethodOrder;
import org.openmetadata.schema.api.data.asset.CreateAssetAttribute;
import org.openmetadata.schema.api.data.asset.CreateAssetType;
import org.openmetadata.schema.entity.data.asset.AssetAttribute;
import org.openmetadata.schema.entity.data.asset.AssetType;
import org.openmetadata.service.Entity;
import org.openmetadata.service.resources.EntityResourceTest;

/**
 * AssetType 资产类型实体的集成测试。
 *
 * 覆盖考卷用例：
 * - TC-002：定义带有受控属性的数据类型
 */
@Slf4j
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class AssetTypeResourceTest
    extends EntityResourceTest<AssetType, CreateAssetType> {

  public AssetTypeResourceTest() {
    super(
        Entity.ASSET_TYPE,
        AssetType.class,
        AssetTypeResource.AssetTypeList.class,
        "assetTypes",
        AssetTypeResource.FIELDS);
    supportsSearchIndex = true;
  }

  @Override
  public CreateAssetType createRequest(String name) {
    return new CreateAssetType()
        .withName(name)
        .withDescription("测试资产类型: " + name);
  }

  @Override
  public void validateCreatedEntity(
      AssetType createdEntity,
      CreateAssetType request,
      Map<String, String> authHeaders)
      throws HttpResponseException {
    assertEquals(request.getName(), createdEntity.getName());
    assertEquals(request.getDescription(), createdEntity.getDescription());
  }

  @Override
  public void compareEntities(
      AssetType expected, AssetType updated, Map<String, String> authHeaders)
      throws HttpResponseException {
    assertEquals(expected.getName(), updated.getName());
    assertEquals(expected.getDescription(), updated.getDescription());
  }

  @Override
  public AssetType validateGetWithDifferentFields(AssetType entity, boolean byName)
      throws HttpResponseException {
    String fields = "owners,tags,reviewers,attributes,assetCount";
    entity =
        byName
            ? getEntityByName(entity.getFullyQualifiedName(), fields, ADMIN_AUTH_HEADERS)
            : getEntity(entity.getId(), fields, ADMIN_AUTH_HEADERS);
    assertNotNull(entity);
    return entity;
  }

  @Override
  public void assertFieldChange(String fieldName, Object expected, Object actual)
      throws IOException {
    assertCommonFieldChange(fieldName, expected, actual);
  }

  // ============================= 自定义测试 =============================

  /**
   * TC-002：创建带属性的 AssetType 并验证关联。
   * 1. 创建一个 AssetAttribute
   * 2. 创建一个 AssetType 并关联该属性
   * 3. 验证 GET 时 attributes 字段返回正确
   */
  @Test
  void create_assetTypeWithAttributes(TestInfo test) throws IOException {
    // 创建一个 AssetAttribute
    AssetAttributeResourceTest attrTest = new AssetAttributeResourceTest();
    CreateAssetAttribute createAttr = attrTest.createRequest("type_test_attr")
        .withAttributeCategory(CreateAssetAttribute.AttributeCategory.BUSINESS)
        .withDataType(CreateAssetAttribute.DataType.STRING)
        .withRequired(true);
    AssetAttribute attr = attrTest.createEntity(createAttr, ADMIN_AUTH_HEADERS);

    // 创建 AssetType 并关联属性
    CreateAssetType createType = createRequest("type_with_attributes")
        .withAttributes(List.of(attr.getFullyQualifiedName()));
    AssetType assetType = createEntity(createType, ADMIN_AUTH_HEADERS);

    // 验证属性返回
    AssetType retrieved = getEntity(assetType.getId(), "attributes", ADMIN_AUTH_HEADERS);
    assertNotNull(retrieved.getAttributes(), "AssetType 应包含关联的 attributes");
    assertEquals(1, retrieved.getAttributes().size(), "应有 1 个关联属性");
  }
}
