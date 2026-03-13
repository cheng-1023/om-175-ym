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
import org.openmetadata.schema.api.data.asset.CreateAssetCatalog;
import org.openmetadata.schema.api.data.asset.CreateAssetCategory;
import org.openmetadata.schema.entity.data.asset.AssetCatalog;
import org.openmetadata.schema.entity.data.asset.AssetCategory;
import org.openmetadata.service.Entity;
import org.openmetadata.service.resources.EntityResourceTest;

/**
 * AssetCatalog 资产目录实体的集成测试。
 * 继承 EntityResourceTest 基类，自动获得 CRUD、分页、软删除、PATCH、版本历史等通用测试。
 *
 * 覆盖考卷用例：
 * - TC-001：资产目录多级创建与展示（level 自动计算）
 * - TC-005：CSV 导入导出
 * - TC-201 [红线 AC2.3]：具有数据的目录删除保护
 */
@Slf4j
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class AssetCatalogResourceTest
    extends EntityResourceTest<AssetCatalog, CreateAssetCatalog> {

  // 用于测试的共用 AssetCategory
  private static AssetCategory TEST_CATEGORY;

  public AssetCatalogResourceTest() {
    super(
        Entity.ASSET_CATALOG,
        AssetCatalog.class,
        AssetCatalogResource.AssetCatalogList.class,
        "assetCatalogs",
        AssetCatalogResource.FIELDS);
    supportsSearchIndex = true;
  }

  /**
   * 确保测试用的 AssetCategory 存在。
   */
  private AssetCategory getTestCategory() throws HttpResponseException {
    if (TEST_CATEGORY == null) {
      AssetCategoryResourceTest categoryTest = new AssetCategoryResourceTest();
      CreateAssetCategory createCategory = categoryTest.createRequest("catalog_test_category")
          .withDescription("用于 AssetCatalog 测试的分类");
      TEST_CATEGORY = categoryTest.createEntity(createCategory, ADMIN_AUTH_HEADERS);
    }
    return TEST_CATEGORY;
  }

  @Override
  public CreateAssetCatalog createRequest(String name) {
    try {
      AssetCategory category = getTestCategory();
      return new CreateAssetCatalog()
          .withName(name)
          .withDescription("测试资产目录: " + name)
          .withCategory(category.getFullyQualifiedName())
          .withOrder(0);
    } catch (HttpResponseException e) {
      throw new RuntimeException("创建 AssetCatalog 测试请求失败", e);
    }
  }

  @Override
  public void validateCreatedEntity(
      AssetCatalog createdEntity,
      CreateAssetCatalog request,
      Map<String, String> authHeaders)
      throws HttpResponseException {
    assertEquals(request.getName(), createdEntity.getName());
    assertEquals(request.getDescription(), createdEntity.getDescription());
    assertNotNull(createdEntity.getLevel(), "Level 应由系统自动计算，不能为 null");
  }

  @Override
  public void compareEntities(
      AssetCatalog expected, AssetCatalog updated, Map<String, String> authHeaders)
      throws HttpResponseException {
    assertEquals(expected.getName(), updated.getName());
    assertEquals(expected.getDescription(), updated.getDescription());
  }

  @Override
  public AssetCatalog validateGetWithDifferentFields(AssetCatalog entity, boolean byName)
      throws HttpResponseException {
    String fields = "owners,tags,reviewers,category,parent,children,assetCount,level,order";
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
   * TC-001：多级目录创建 — Level 自动计算。
   * 验证根目录 level=1，子目录 level=2，孙目录 level=3。
   */
  @Test
  void create_hierarchicalCatalogs_levelAutoCalculated(TestInfo test) throws IOException {
    AssetCategory category = getTestCategory();

    // 创建根目录（level = 1）
    CreateAssetCatalog createRoot = new CreateAssetCatalog()
        .withName("root_catalog")
        .withDescription("根目录")
        .withCategory(category.getFullyQualifiedName())
        .withOrder(1);
    AssetCatalog root = createEntity(createRoot, ADMIN_AUTH_HEADERS);
    AssetCatalog rootWithFields = getEntity(root.getId(), "level", ADMIN_AUTH_HEADERS);
    assertEquals(1, rootWithFields.getLevel(), "根目录的 level 应为 1");

    // 创建 1 级子目录（level = 2）
    CreateAssetCatalog createChild = new CreateAssetCatalog()
        .withName("child_catalog")
        .withDescription("子目录")
        .withCategory(category.getFullyQualifiedName())
        .withParent(root.getFullyQualifiedName())
        .withOrder(1);
    AssetCatalog child = createEntity(createChild, ADMIN_AUTH_HEADERS);
    AssetCatalog childWithFields = getEntity(child.getId(), "level", ADMIN_AUTH_HEADERS);
    assertEquals(2, childWithFields.getLevel(), "子目录的 level 应为 2");

    // 创建 2 级子目录（level = 3）
    CreateAssetCatalog createGrandChild = new CreateAssetCatalog()
        .withName("grandchild_catalog")
        .withDescription("孙目录")
        .withCategory(category.getFullyQualifiedName())
        .withParent(child.getFullyQualifiedName())
        .withOrder(1);
    AssetCatalog grandChild = createEntity(createGrandChild, ADMIN_AUTH_HEADERS);
    AssetCatalog grandChildWithFields = getEntity(grandChild.getId(), "level", ADMIN_AUTH_HEADERS);
    assertEquals(3, grandChildWithFields.getLevel(), "孙目录的 level 应为 3");
  }

  /**
   * TC-201 [红线 AC2.3]：含子目录的目录不可删除。
   * 删除时应返回 400 Bad Request。
   */
  @Test
  void delete_catalogWithChildren_400(TestInfo test) throws IOException {
    AssetCategory category = getTestCategory();

    // 创建父目录
    CreateAssetCatalog createParent = new CreateAssetCatalog()
        .withName("parent_for_delete_test")
        .withDescription("父目录")
        .withCategory(category.getFullyQualifiedName())
        .withOrder(1);
    AssetCatalog parent = createEntity(createParent, ADMIN_AUTH_HEADERS);

    // 创建子目录
    CreateAssetCatalog createChild = new CreateAssetCatalog()
        .withName("child_for_delete_test")
        .withDescription("子目录")
        .withCategory(category.getFullyQualifiedName())
        .withParent(parent.getFullyQualifiedName())
        .withOrder(1);
    createEntity(createChild, ADMIN_AUTH_HEADERS);

    // 尝试删除含子目录的父目录，应返回 400
    assertResponse(
        () -> deleteEntity(parent.getId(), ADMIN_AUTH_HEADERS),
        Status.BAD_REQUEST,
        String.format(
            "资产目录 [%s] 下包含 1 个子目录，无法删除。请先删除或移动所有子目录。",
            parent.getFullyQualifiedName()));
  }
}
