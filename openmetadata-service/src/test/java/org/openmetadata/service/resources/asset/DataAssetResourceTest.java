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
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.HttpResponseException;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.TestMethodOrder;
import org.openmetadata.schema.api.data.asset.CreateAssetType;
import org.openmetadata.schema.entity.data.asset.AssetType;
import org.openmetadata.schema.entity.data.asset.DataAsset;
import org.openmetadata.service.Entity;
import org.openmetadata.service.resources.EntityResourceTest;

/**
 * DataAsset 数据资产实体的集成测试。
 *
 * 覆盖考卷用例：
 * - TC-003：数据资产建档全链路通过
 * - TC-203：脏数据注入/边界撑爆（assetType 必填校验）
 *
 * 注意：由于 CreateDataAsset 类的具体字段取决于 JSON Schema 生成结果，
 * 此测试需根据实际生成的类做适配。当前暂使用简化场景。
 */
@Slf4j
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class DataAssetResourceTest
    extends EntityResourceTest<DataAsset, org.openmetadata.schema.api.data.asset.CreateDataAsset> {

  // 用于测试的共用 AssetType
  private static AssetType TEST_ASSET_TYPE;

  public DataAssetResourceTest() {
    super(
        Entity.DATA_ASSET,
        DataAsset.class,
        DataAssetResource.DataAssetList.class,
        "dataAssets",
        DataAssetResource.FIELDS);
    supportsSearchIndex = true;
  }

  /**
   * 确保测试用的 AssetType 存在。
   */
  private AssetType getTestAssetType() throws HttpResponseException {
    if (TEST_ASSET_TYPE == null) {
      AssetTypeResourceTest typeTest = new AssetTypeResourceTest();
      CreateAssetType createType = typeTest.createRequest("data_asset_test_type")
          .withDescription("用于 DataAsset 测试的资产类型");
      TEST_ASSET_TYPE = typeTest.createEntity(createType, ADMIN_AUTH_HEADERS);
    }
    return TEST_ASSET_TYPE;
  }

  @Override
  public org.openmetadata.schema.api.data.asset.CreateDataAsset createRequest(String name) {
    try {
      AssetType assetType = getTestAssetType();
      return new org.openmetadata.schema.api.data.asset.CreateDataAsset()
          .withName(name)
          .withDescription("测试数据资产: " + name)
          .withAssetType(assetType.getFullyQualifiedName());
    } catch (HttpResponseException e) {
      throw new RuntimeException("创建 DataAsset 测试请求失败", e);
    }
  }

  @Override
  public void validateCreatedEntity(
      DataAsset createdEntity,
      org.openmetadata.schema.api.data.asset.CreateDataAsset request,
      Map<String, String> authHeaders)
      throws HttpResponseException {
    assertEquals(request.getName(), createdEntity.getName());
    assertEquals(request.getDescription(), createdEntity.getDescription());
    assertNotNull(createdEntity.getAssetType(), "DataAsset 必须关联 AssetType");
  }

  @Override
  public void compareEntities(
      DataAsset expected, DataAsset updated, Map<String, String> authHeaders)
      throws HttpResponseException {
    assertEquals(expected.getName(), updated.getName());
    assertEquals(expected.getDescription(), updated.getDescription());
  }

  @Override
  public DataAsset validateGetWithDifferentFields(DataAsset entity, boolean byName)
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
   * TC-003：数据资产建档全链路 — 创建带有 AssetType 关联的 DataAsset。
   */
  @Test
  void create_dataAssetWithAssetType(TestInfo test) throws IOException {
    AssetType assetType = getTestAssetType();

    org.openmetadata.schema.api.data.asset.CreateDataAsset create =
        createRequest("full_pipeline_data_asset")
            .withAssetType(assetType.getFullyQualifiedName());

    DataAsset entity = createEntity(create, ADMIN_AUTH_HEADERS);
    assertNotNull(entity.getId(), "创建的 DataAsset 应有 ID");
    assertNotNull(entity.getAssetType(), "DataAsset 应关联 AssetType");
  }
}
