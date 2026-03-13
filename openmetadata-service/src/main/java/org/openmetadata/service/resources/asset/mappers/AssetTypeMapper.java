package org.openmetadata.service.resources.asset.mappers;

import java.util.ArrayList;
import java.util.List;
import org.openmetadata.schema.api.data.asset.CreateAssetType;
import org.openmetadata.schema.entity.data.asset.AssetType;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.service.Entity;
import org.openmetadata.service.mapper.EntityMapper;
import org.openmetadata.service.util.EntityUtil;

public class AssetTypeMapper implements EntityMapper<AssetType, CreateAssetType> {
  @Override
  public AssetType createToEntity(CreateAssetType create, String user) {
    List<EntityReference> attributes = new ArrayList<>();
    if (create.getAttributes() != null) {
      for (String attributeFqn : create.getAttributes()) {
        attributes.add(EntityUtil.getEntityReference(Entity.ASSET_ATTRIBUTE, attributeFqn));
      }
    }
    return copy(new AssetType(), create, user).withAttributes(attributes);
  }
}
