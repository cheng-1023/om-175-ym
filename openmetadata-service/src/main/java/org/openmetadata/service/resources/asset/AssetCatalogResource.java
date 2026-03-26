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
import org.openmetadata.schema.api.data.asset.CreateAssetCatalog;
import org.openmetadata.schema.entity.data.asset.AssetCatalog;
import org.openmetadata.schema.type.EntityHistory;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.MetadataOperation;
import org.openmetadata.schema.type.csv.CsvImportResult;
import org.openmetadata.schema.api.VoteRequest;
import org.openmetadata.schema.type.ChangeEvent;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.ListFilter;
import org.openmetadata.service.jdbi3.asset.AssetCatalogRepository;
import org.openmetadata.service.limits.Limits;
import org.openmetadata.service.resources.Collection;
import org.openmetadata.service.resources.EntityResource;
import org.openmetadata.service.resources.asset.mappers.AssetCatalogMapper;
import org.openmetadata.service.security.Authorizer;
import org.openmetadata.service.util.ResultList;

@Path("/v1/assetCatalogs")
@Tag(name = "AssetCatalogs", description = "资产目录管理 API，支持树形结构管理。")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "assetCatalogs", order = 9)
public class AssetCatalogResource extends EntityResource<AssetCatalog, AssetCatalogRepository> {
  public static final String COLLECTION_PATH = "v1/assetCatalogs/";
  static final String FIELDS = "owners,tags,reviewers,category,parent,children,assetCount,level,order,domain,extension";
  private final AssetCatalogMapper mapper = new AssetCatalogMapper();

  public AssetCatalogResource(Authorizer authorizer, Limits limits) {
    super(Entity.ASSET_CATALOG, authorizer, limits);
  }

  @Override
  protected List<MetadataOperation> getEntitySpecificOperations() {
    addViewOperation("reviewers,children,assetCount,level,order", MetadataOperation.VIEW_BASIC);
    return Collections.emptyList();
  }

  public static class AssetCatalogList extends ResultList<AssetCatalog> {
    /* Required for serde */
  }

  @GET
  @Valid
  @Operation(
      operationId = "listAssetCatalogs",
      summary = "列出所有资产目录",
      description = "获取资产目录列表，支持分页和字段过滤。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "资产目录列表",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = AssetCatalogList.class)))
      })
  public ResultList<AssetCatalog> list(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @QueryParam("fields") String fieldsParam,
      @DefaultValue("10") @Min(0) @Max(1000000) @QueryParam("limit") int limitParam,
      @QueryParam("before") String before,
      @QueryParam("after") String after,
      @QueryParam("include") Include include) {
    return listInternal(uriInfo, securityContext, fieldsParam, new ListFilter(include), limitParam, before, after);
  }

  @GET
  @Path("/{id}")
  @Valid
  @Operation(
      operationId = "getAssetCatalogByID",
      summary = "通过 ID 获取资产目录",
      responses = {
        @ApiResponse(
            responseCode = "200",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = AssetCatalog.class)))
      })
  public AssetCatalog get(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") UUID id,
      @QueryParam("fields") String fieldsParam,
      @QueryParam("include") Include include) {
    return getInternal(uriInfo, securityContext, id, fieldsParam, include);
  }

  @GET
  @Path("/name/{name}")
  @Valid
  @Operation(
      operationId = "getAssetCatalogByFQN",
      summary = "通过名称获取资产目录",
      responses = {
        @ApiResponse(
            responseCode = "200",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = AssetCatalog.class)))
      })
  public AssetCatalog getByName(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("name") String name,
      @QueryParam("fields") String fieldsParam,
      @QueryParam("include") Include include) {
    return getByNameInternal(uriInfo, securityContext, name, fieldsParam, include);
  }

  @GET
  @Path("/{id}/versions")
  @Valid
  @Operation(operationId = "listAssetCatalogVersions", summary = "获取资产目录版本历史")
  public EntityHistory listVersions(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @PathParam("id") UUID id) {
    return super.listVersionsInternal(securityContext, id);
  }

  @GET
  @Path("/{id}/versions/{version}")
  @Valid
  @Operation(operationId = "getAssetCatalogVersion", summary = "获取特定版本的资产目录")
  public AssetCatalog getVersion(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") UUID id,
      @PathParam("version") String version) {
    return super.getVersionInternal(securityContext, id, version);
  }

  @POST
  @Operation(
      operationId = "createAssetCatalog",
      summary = "创建资产目录",
      description = "创建一个新的资产目录，支持指定分类和父目录。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = AssetCatalog.class)))
      })
  public Response create(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Valid CreateAssetCatalog create) {
    AssetCatalog catalog = mapper.createToEntity(create, securityContext.getUserPrincipal().getName());
    return create(uriInfo, securityContext, catalog);
  }

  @PUT
  @Operation(
      operationId = "createOrUpdateAssetCatalog",
      summary = "创建或更新资产目录",
      responses = {
        @ApiResponse(
            responseCode = "200",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = AssetCatalog.class)))
      })
  public Response createOrUpdate(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Valid CreateAssetCatalog create) {
    AssetCatalog catalog = mapper.createToEntity(create, securityContext.getUserPrincipal().getName());
    return createOrUpdate(uriInfo, securityContext, catalog);
  }

  @PATCH
  @Path("/{id}")
  @Consumes(MediaType.APPLICATION_JSON_PATCH_JSON)
  @Operation(operationId = "patchAssetCatalog", summary = "部分更新资产目录")
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
  @Operation(operationId = "patchAssetCatalogByFQN", summary = "通过名称部分更新资产目录")
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
      operationId = "deleteAssetCatalog",
      summary = "删除资产目录",
      description = "删除前会检查目录下是否包含子目录或数据资产，有则拒绝删除。",
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
  @Operation(operationId = "deleteAssetCatalogByName", summary = "通过名称删除资产目录")
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
      operationId = "exportAssetCatalogs",
      summary = "导出资产目录为 CSV",
      description = "将所有资产目录导出为 CSV 格式。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "导出的 CSV 数据",
            content = @Content(mediaType = "text/plain"))
      })
  public String exportCsv(
      @Context SecurityContext securityContext,
      @Parameter(description = "资产目录名称", schema = @Schema(type = "string"))
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
      operationId = "importAssetCatalogs",
      summary = "从 CSV 导入资产目录",
      description = "从 CSV 数据创建或更新资产目录。",
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
      @Parameter(description = "资产目录名称", schema = @Schema(type = "string"))
          @PathParam("name")
          String name,
      @Parameter(description = "预演模式（默认 true）", schema = @Schema(type = "boolean"))
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
  @Operation(operationId = "getAssetCatalogCsvDocumentation", summary = "获取资产目录 CSV 文档")
  public String getCsvDocumentation(@Context SecurityContext securityContext) {
    return JsonUtils.pojoToJson(AssetCatalogRepository.AssetCatalogCsv.DOCUMENTATION);
  }
}
