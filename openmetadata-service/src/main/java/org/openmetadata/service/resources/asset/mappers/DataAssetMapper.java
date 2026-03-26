package org.openmetadata.service.resources.asset.mappers;

import org.openmetadata.schema.api.data.asset.CreateDataAsset;
import org.openmetadata.schema.entity.data.asset.DataAsset;
import org.openmetadata.service.Entity;
import org.openmetadata.service.mapper.EntityMapper;
import org.openmetadata.service.util.EntityUtil;

public class DataAssetMapper implements EntityMapper<DataAsset, CreateDataAsset> {
  @Override
  public DataAsset createToEntity(CreateDataAsset create, String user) {
    return copy(new DataAsset(), create, user)
        .withAssetType(EntityUtil.getEntityReference(Entity.ASSET_TYPE, create.getAssetType()))
        .withCatalog(
            create.getCatalog() != null
                ? EntityUtil.getEntityReference(Entity.ASSET_CATALOG, create.getCatalog())
                : null);
    // 注意：extension → attributeValues 转换在 DataAssetRepository.prepare() 中统一处理
  }
}

