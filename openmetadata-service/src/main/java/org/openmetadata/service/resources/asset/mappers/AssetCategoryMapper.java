package org.openmetadata.service.resources.asset.mappers;

import org.openmetadata.schema.api.data.asset.CreateAssetCategory;
import org.openmetadata.schema.entity.data.asset.AssetCategory;
import org.openmetadata.service.mapper.EntityMapper;

public class AssetCategoryMapper implements EntityMapper<AssetCategory, CreateAssetCategory> {
  @Override
  public AssetCategory createToEntity(CreateAssetCategory create, String user) {
    return copy(new AssetCategory(), create, user);
  }
}
