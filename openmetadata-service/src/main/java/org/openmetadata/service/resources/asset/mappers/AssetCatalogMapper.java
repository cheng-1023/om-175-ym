package org.openmetadata.service.resources.asset.mappers;

import org.openmetadata.schema.api.data.asset.CreateAssetCatalog;
import org.openmetadata.schema.entity.data.asset.AssetCatalog;
import org.openmetadata.service.Entity;
import org.openmetadata.service.mapper.EntityMapper;
import org.openmetadata.service.util.EntityUtil;

public class AssetCatalogMapper implements EntityMapper<AssetCatalog, CreateAssetCatalog> {
  @Override
  public AssetCatalog createToEntity(CreateAssetCatalog create, String user) {
    return copy(new AssetCatalog(), create, user)
        .withOrder(create.getOrder())
        .withCategory(EntityUtil.getEntityReference(Entity.ASSET_CATEGORY, create.getCategory()))
        .withParent(
            create.getParent() != null
                ? EntityUtil.getEntityReference(Entity.ASSET_CATALOG, create.getParent())
                : null);
  }
}
