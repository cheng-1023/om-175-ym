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
import org.openmetadata.schema.entity.data.asset.AssetAttribute;
import org.openmetadata.service.Entity;
import org.openmetadata.service.resources.EntityResourceTest;

/**
 * AssetAttribute 资产属性实体的集成测试。
 *
 * 覆盖考卷用例：
 * - TC-002：属性分类与数据类型的枚举验证
 * - 角色可填写配置（assignableRoles）
 */
@Slf4j
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class AssetAttributeResourceTest
    extends EntityResourceTest<AssetAttribute, CreateAssetAttribute> {

  public AssetAttributeResourceTest() {
    super(
        Entity.ASSET_ATTRIBUTE,
        AssetAttribute.class,
        AssetAttributeResource.AssetAttributeList.class,
        "assetAttributes",
        AssetAttributeResource.FIELDS);
    supportsSearchIndex = true;
  }

  @Override
  public CreateAssetAttribute createRequest(String name) {
    return new CreateAssetAttribute()
        .withName(name)
        .withDescription("测试资产属性: " + name)
        .withAttributeCategory(CreateAssetAttribute.AttributeCategory.BASIC)
        .withDataType(CreateAssetAttribute.DataType.STRING)
        .withRequired(false);
  }

  @Override
  public void validateCreatedEntity(
      AssetAttribute createdEntity,
      CreateAssetAttribute request,
      Map<String, String> authHeaders)
      throws HttpResponseException {
    assertEquals(request.getName(), createdEntity.getName());
    assertEquals(request.getDescription(), createdEntity.getDescription());
  }

  @Override
  public void compareEntities(
      AssetAttribute expected, AssetAttribute updated, Map<String, String> authHeaders)
      throws HttpResponseException {
    assertEquals(expected.getName(), updated.getName());
    assertEquals(expected.getDescription(), updated.getDescription());
  }

  @Override
  public AssetAttribute validateGetWithDifferentFields(AssetAttribute entity, boolean byName)
      throws HttpResponseException {
    String fields = "owners,tags,reviewers";
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
   * TC-002 扩展：创建带安全分类和布尔类型的属性，验证枚举值正确持久化。
   */
  @Test
  void create_attributeWithSecurityCategoryAndBooleanType(TestInfo test) throws IOException {
    CreateAssetAttribute createAttr = createRequest("security_bool_attr")
        .withAttributeCategory(CreateAssetAttribute.AttributeCategory.SECURITY)
        .withDataType(CreateAssetAttribute.DataType.BOOLEAN)
        .withRequired(true)
        .withAssignableRoles(List.of("admin", "DataSteward"));

    AssetAttribute entity = createEntity(createAttr, ADMIN_AUTH_HEADERS);

    assertEquals(
        AssetAttribute.AttributeCategory.SECURITY,
        entity.getAttributeCategory(),
        "属性分类应为 SECURITY");
    assertEquals(
        AssetAttribute.DataType.BOOLEAN,
        entity.getDataType(),
        "数据类型应为 BOOLEAN");
    assertEquals(true, entity.getRequired(), "应为必填");
  }
}
