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

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import javax.json.JsonPatch;
import javax.validation.Valid;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.PATCH;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.SecurityContext;
import javax.ws.rs.core.UriInfo;
import org.openmetadata.schema.api.data.asset.CreateAssetCategory;
import org.openmetadata.schema.entity.data.asset.AssetCategory;
import org.openmetadata.schema.type.EntityHistory;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.MetadataOperation;
import org.openmetadata.schema.type.csv.CsvImportResult;
import org.openmetadata.schema.api.VoteRequest;
import org.openmetadata.schema.type.ChangeEvent;
import org.openmetadata.service.jdbi3.ListFilter;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.asset.AssetCategoryRepository;
import org.openmetadata.service.limits.Limits;
import org.openmetadata.service.resources.Collection;
import org.openmetadata.service.resources.EntityResource;
import org.openmetadata.service.resources.asset.mappers.AssetCategoryMapper;
import org.openmetadata.service.security.Authorizer;
import org.openmetadata.service.util.ResultList;

@Path("/v1/assetCategories")
@Tag(name = "AssetCategories", description = "资产分类管理 API")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "assetCategories", order = 9)
public class AssetCategoryResource extends EntityResource<AssetCategory, AssetCategoryRepository> {
  public static final String COLLECTION_PATH = "v1/assetCategories/";
  static final String FIELDS = "owners,tags,reviewers,catalogCount,domain,extension";
  private final AssetCategoryMapper mapper = new AssetCategoryMapper();

  public AssetCategoryResource(Authorizer authorizer, Limits limits) {
    super(Entity.ASSET_CATEGORY, authorizer, limits);
  }

  @Override
  protected List<MetadataOperation> getEntitySpecificOperations() {
    addViewOperation("reviewers,catalogCount", MetadataOperation.VIEW_BASIC);
    return Collections.emptyList();
  }

  public static class AssetCategoryList extends ResultList<AssetCategory> {
    /* Required for serde */
  }

  @GET
  @Valid
  @Operation(
      operationId = "listAssetCategories",
      summary = "列出所有资产分类",
      description = "获取资产分类列表，支持分页和字段过滤。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "资产分类列表",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = AssetCategoryList.class)))
      })
  public ResultList<AssetCategory> list(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "请求返回的字段", schema = @Schema(type = "string", defaultValue = FIELDS))
          @QueryParam("fields")
          String fieldsParam,
      @Parameter(description = "分页大小限制", schema = @Schema(type = "integer", defaultValue = "10"))
          @DefaultValue("10")
          @Min(0)
          @Max(1000000)
          @QueryParam("limit")
          int limitParam,
      @Parameter(description = "分页起始游标", schema = @Schema(type = "string")) @QueryParam("before") String before,
      @Parameter(description = "分页结束游标", schema = @Schema(type = "string")) @QueryParam("after") String after,
      @Parameter(
              description = "包含已删除的实体",
              schema = @Schema(type = "string", allowableValues = {"all", "deleted", "non-deleted"}))
          @QueryParam("include")
          Include include) {
      ListFilter filter = new ListFilter(include);
      return super.listInternal(
              uriInfo, securityContext, fieldsParam, filter, limitParam, before, after);
  }

  @GET
  @Path("/{id}")
  @Valid
  @Operation(
      operationId = "getAssetCategoryByID",
      summary = "通过 ID 获取资产分类",
      description = "通过 UUID 获取资产分类详情。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "资产分类详情",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = AssetCategory.class))),
        @ApiResponse(responseCode = "404", description = "资产分类不存在")
      })
  public AssetCategory get(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") UUID id,
      @Parameter(description = "请求返回的字段", schema = @Schema(type = "string", defaultValue = FIELDS))
          @QueryParam("fields")
          String fieldsParam,
      @Parameter(description = "包含已删除的实体") @QueryParam("include") Include include) {
    return getInternal(uriInfo, securityContext, id, fieldsParam, include);
  }

  @GET
  @Path("/name/{name}")
  @Valid
  @Operation(
      operationId = "getAssetCategoryByFQN",
      summary = "通过名称获取资产分类",
      description = "通过全限定名称获取资产分类详情。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "资产分类详情",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = AssetCategory.class))),
        @ApiResponse(responseCode = "404", description = "资产分类不存在")
      })
  public AssetCategory getByName(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("name") String name,
      @Parameter(description = "请求返回的字段", schema = @Schema(type = "string", defaultValue = FIELDS))
          @QueryParam("fields")
          String fieldsParam,
      @Parameter(description = "包含已删除的实体") @QueryParam("include") Include include) {
    return getByNameInternal(uriInfo, securityContext, name, fieldsParam, include);
  }

  @GET
  @Path("/{id}/versions")
  @Valid
  @Operation(
      operationId = "listAssetCategoryVersions",
      summary = "获取资产分类版本历史",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "版本历史列表",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = EntityHistory.class)))
      })
  public EntityHistory listVersions(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @PathParam("id") UUID id) {
    return super.listVersionsInternal(securityContext, id);
  }

  @GET
  @Path("/{id}/versions/{version}")
  @Valid
  @Operation(
      operationId = "getAssetCategoryVersion",
      summary = "获取特定版本的资产分类",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "特定版本的资产分类",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = AssetCategory.class)))
      })
  public AssetCategory getVersion(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") UUID id,
      @PathParam("version") String version) {
    return super.getVersionInternal(securityContext, id, version);
  }

  @POST
  @Operation(
      operationId = "createAssetCategory",
      summary = "创建资产分类",
      description = "创建一个新的资产分类。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "创建的资产分类",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = AssetCategory.class))),
        @ApiResponse(responseCode = "400", description = "请求参数无效")
      })
  public Response create(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Valid CreateAssetCategory create) {
    AssetCategory category = mapper.createToEntity(create, securityContext.getUserPrincipal().getName());
    return create(uriInfo, securityContext, category);
  }

  @PUT
  @Operation(
      operationId = "createOrUpdateAssetCategory",
      summary = "创建或更新资产分类",
      description = "如果资产分类存在则更新，否则创建。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "创建或更新的资产分类",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = AssetCategory.class)))
      })
  public Response createOrUpdate(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Valid CreateAssetCategory create) {
    AssetCategory category = mapper.createToEntity(create, securityContext.getUserPrincipal().getName());
    return createOrUpdate(uriInfo, securityContext, category);
  }

  @PATCH
  @Path("/{id}")
  @Consumes(MediaType.APPLICATION_JSON_PATCH_JSON)
  @Operation(
      operationId = "patchAssetCategory",
      summary = "部分更新资产分类",
      description = "通过 JSON Patch 部分更新资产分类。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "更新后的资产分类",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = AssetCategory.class)))
      })
  public Response patch(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") UUID id,
      @Valid JsonPatch patch) {
    return patchInternal(uriInfo, securityContext, id, patch);
  }

  @PATCH
  @Path("/name/{fqn}")
  @Consumes(MediaType.APPLICATION_JSON_PATCH_JSON)
  @Operation(
      operationId = "patchAssetCategoryByFQN",
      summary = "通过名称部分更新资产分类",
      description = "通过全限定名称和 JSON Patch 部分更新资产分类。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "更新后的资产分类",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = AssetCategory.class)))
      })
  public Response patchByName(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("fqn") String fqn,
      @Valid JsonPatch patch) {
    return patchInternal(uriInfo, securityContext, fqn, patch);
  }

  @DELETE
  @Path("/{id}")
  @Operation(
      operationId = "deleteAssetCategory",
      summary = "删除资产分类",
      description = "通过 ID 删除资产分类，支持软删除和硬删除。",
      responses = {@ApiResponse(responseCode = "200", description = "删除成功")})
  public Response delete(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") UUID id,
      @QueryParam("recursive") boolean recursive,
      @QueryParam("hardDelete") boolean hardDelete) {
    return super.delete(uriInfo, securityContext, id, recursive, hardDelete);
  }

  @DELETE
  @Path("/name/{name}")
  @Operation(
      operationId = "deleteAssetCategoryByName",
      summary = "通过名称删除资产分类",
      description = "通过名称删除资产分类，支持软删除和硬删除。",
      responses = {@ApiResponse(responseCode = "200", description = "删除成功")})
  public Response deleteByName(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("name") String name,
      @QueryParam("recursive") boolean recursive,
      @QueryParam("hardDelete") boolean hardDelete) {
    return super.deleteByName(uriInfo, securityContext, name, recursive, hardDelete);
  }

  @PUT
  @Path("/{id}/vote")
  @Operation(
      operationId = "updateVoteForEntity",
      summary = "Update Vote for a Entity",
      description = "Update vote for a Entity",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "OK",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = ChangeEvent.class))),
        @ApiResponse(responseCode = "404", description = "model for instance {id} is not found")
      })
  public Response updateVote(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the Entity", schema = @Schema(type = "UUID")) @PathParam("id")
          UUID id,
      @Valid VoteRequest request) {
    return repository
        .updateVote(securityContext.getUserPrincipal().getName(), id, request)
        .toResponse();
  }

  // ==================== CSV 导入导出 ====================

  @GET
  @Path("/name/{name}/export")
  @Produces(MediaType.TEXT_PLAIN)
  @Valid
  @Operation(
      operationId = "exportAssetCategories",
      summary = "导出资产分类为 CSV",
      description = "将所有资产分类导出为 CSV 格式。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "导出的 CSV 数据",
            content = @Content(mediaType = "text/plain"))
      })
  public String exportCsv(
      @Context SecurityContext securityContext,
      @Parameter(description = "资产分类名称", schema = @Schema(type = "string"))
          @PathParam("name")
          String name)
      throws IOException {
    return exportCsvInternal(securityContext, name, false);
  }

  @PUT
  @Path("/name/{name}/import")
  @Consumes({MediaType.TEXT_PLAIN, "text/csv", "*/*"})
  @Valid
  @Operation(
      operationId = "importAssetCategories",
      summary = "从 CSV 导入资产分类",
      description = "从 CSV 数据创建或更新资产分类。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "导入结果",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = CsvImportResult.class)))
      })
  public CsvImportResult importCsv(
      @Context SecurityContext securityContext,
      @Parameter(description = "资产分类名称", schema = @Schema(type = "string"))
          @PathParam("name")
          String name,
      @Parameter(
              description = "预演模式，为 true 时仅验证 CSV 不实际导入（默认 true）",
              schema = @Schema(type = "boolean"))
          @DefaultValue("true")
          @QueryParam("dryRun")
          boolean dryRun,
      String csv)
      throws IOException {
    return importCsvInternal(securityContext, name, csv, dryRun, false);
  }

  @GET
  @Path("/documentation/csv")
  @Valid
  @Operation(operationId = "getAssetCategoryCsvDocumentation", summary = "获取资产分类 CSV 文档")
  public String getCsvDocumentation(@Context SecurityContext securityContext) {
    return JsonUtils.pojoToJson(org.openmetadata.service.jdbi3.asset.AssetCatalogRepository.AssetCatalogCsv.DOCUMENTATION);
  }
}
