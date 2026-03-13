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
import static org.openmetadata.service.util.TestUtils.assertResponse;

import java.io.IOException;
import java.util.Map;
import javax.ws.rs.core.Response.Status;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.HttpResponseException;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.TestMethodOrder;
import org.openmetadata.schema.api.data.asset.CreateAssetCategory;
import org.openmetadata.schema.api.data.asset.CreateAssetCatalog;
import org.openmetadata.schema.entity.data.asset.AssetCategory;
import org.openmetadata.schema.entity.data.asset.AssetCatalog;
import org.openmetadata.service.Entity;
import org.openmetadata.service.resources.EntityResourceTest;

/**
 * AssetCategory 资产分类实体的集成测试。
 * 继承 EntityResourceTest 基类，自动获得 CRUD、分页、软删除、PATCH、版本历史等通用测试。
 * 
 * 覆盖考卷用例：
 * - TC-001：资产分类创建与展示
 * - 级联删除保护：含 Catalog 的 Category 不可删除
 */
@Slf4j
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class AssetCategoryResourceTest
    extends EntityResourceTest<AssetCategory, CreateAssetCategory> {

  public AssetCategoryResourceTest() {
    super(
        Entity.ASSET_CATEGORY,
        AssetCategory.class,
        AssetCategoryResource.AssetCategoryList.class,
        "assetCategories",
        AssetCategoryResource.FIELDS);
    supportsSearchIndex = true;
  }

  @Override
  public CreateAssetCategory createRequest(String name) {
    return new CreateAssetCategory()
        .withName(name)
        .withDescription("测试资产分类: " + name);
  }

  @Override
  public void validateCreatedEntity(
      AssetCategory createdEntity,
      CreateAssetCategory request,
      Map<String, String> authHeaders)
      throws HttpResponseException {
    // 验证名称和描述正确回显
    assertEquals(request.getName(), createdEntity.getName());
    assertEquals(request.getDescription(), createdEntity.getDescription());
  }

  @Override
  public void compareEntities(
      AssetCategory expected, AssetCategory updated, Map<String, String> authHeaders)
      throws HttpResponseException {
    assertEquals(expected.getName(), updated.getName());
    assertEquals(expected.getDescription(), updated.getDescription());
  }

  @Override
  public AssetCategory validateGetWithDifferentFields(AssetCategory entity, boolean byName)
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
   * TC-级联保护：当 Category 下存在 AssetCatalog 时，删除 Category 应返回 400。
   * 对应前置测试大纲中的级联删除保护要求。
   */
  @Test
  void delete_categoryWithCatalogs_400(TestInfo test) throws IOException {
    // 1. 创建一个 AssetCategory
    CreateAssetCategory createCategory = createRequest("delete_protection_category");
    AssetCategory category = createEntity(createCategory, ADMIN_AUTH_HEADERS);

    // 2. 在该 Category 下创建一个 AssetCatalog
    AssetCatalogResourceTest catalogTest = new AssetCatalogResourceTest();
    CreateAssetCatalog createCatalog = catalogTest.createRequest("child_catalog")
        .withCategory(category.getFullyQualifiedName());
    catalogTest.createEntity(createCatalog, ADMIN_AUTH_HEADERS);

    // 3. 尝试删除含有 Catalog 的 Category，应返回 400
    assertResponse(
        () -> deleteEntity(category.getId(), ADMIN_AUTH_HEADERS),
        Status.BAD_REQUEST,
        String.format(
            "资产分类 [%s] 下包含 1 个资产目录，无法删除。请先删除或移动所有资产目录。",
            category.getFullyQualifiedName()));
  }
}
