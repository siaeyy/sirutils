import fs from 'node:fs'
import { type BlobType, capsule, createActions, group, unwrap } from '@sirutils/core'
import { createAsyncSchema } from '@sirutils/schema'
import { deepmerge, isArray, isRawObject, isStream } from '@sirutils/toolbox'
import formidable from 'formidable'

import { logger } from '../../internal/logger'
import { createTag } from '../../internal/tag'
import { wizardTags } from '../../tag'
import { getDetails } from './getDetails'

export const actionActions = createActions(
  (context: Sirutils.Wizard.Context): Sirutils.Wizard.ActionApi => ({
    createAction: (meta, rawHandler) => {
      const bodySchema = meta.body && createAsyncSchema(meta.body)
      const paramsSchema = meta.params && createAsyncSchema(meta.params)
      const queriesSchema = meta.queries && createAsyncSchema(meta.queries)

      if (typeof meta.cache === 'undefined') {
        meta.cache = false
      }

      if (typeof meta.stream === 'undefined') {
        meta.stream = false
      }

      if (typeof meta.multipart === 'undefined') {
        meta.multipart = false
      }

      return (serviceOptions, actionName) => {
        const serviceLogger = logger.create({
          defaults: {
            tag: createTag(`${serviceOptions.name}.${serviceOptions.version}.${actionName}`),
          },
        })

        return {
          ...((meta.rest ? { rest: meta.rest } : {}) as BlobType),
          cache: meta.cache,
          handler: capsule(
            // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Redundant
            async ctx => {
              const isParamsStream =
                isStream(ctx.params) ||
                (isArray(ctx.params) && ctx.params.every(param => isStream(param)))

              if (ctx.params.req && meta.rest) {
                const isInvalid =
                  ctx.params.req.method === 'GET' ||
                  ctx.params.req.method === 'HEAD' ||
                  ctx.params.req.method === 'DELETE'

                // @ts-ignore
                const subctx: Sirutils.Wizard.ActionContext<BlobType, BlobType, BlobType, BlobType> = {
                  body: ctx.params.req.body ?? ({} as BlobType),
                  req: ctx.params.req,
                  res: ctx.params.res,
                  logger: serviceLogger,
                  raw: ctx,
                }

                let requiresCheck = true

                if (
                  !isParamsStream &&
                  isRawObject(subctx.body) &&
                  Object.keys(subctx.body).length === 0 &&
                  ctx.params.req.headers['content-type'] !== 'application/json' &&
                  !isInvalid
                ) {
                  const form = formidable(isRawObject(meta.multipart) ? meta.multipart : {})

                  const multipart = await group(
                    () => form.parse(ctx.params.req),
                    wizardTags.parserMultipart
                  )

                  if (multipart.isOk()) {
                    subctx.body = Object.fromEntries(
                      Object.entries(multipart.value[0]).map(x => x.flat(1))
                    )
                    subctx.streams = Object.entries(multipart.value[1]).reduce(
                      (acc, [key, files]) => {
                        if (files) {
                          acc.push(
                            ...(files.map(file => {
                              return [
                                fs.createReadStream(file.filepath),
                                {
                                  filename: file.originalFilename,
                                  mimetype: file.mimetype,
                                  name: key,
                                },
                              ]
                            }) as BlobType)
                          )
                        }

                        return acc
                      },
                      [] as BlobType
                    )
                  } else if (meta.stream && !isInvalid) {
                    subctx.body = {}
                    subctx.streams = [
                      (ctx.params as BlobType).req,
                      getDetails((ctx.params as BlobType).req, ctx.meta.$params),
                    ]

                    const merged = Object.assign(
                      {},
                      (ctx.params as BlobType).req.params,
                      (ctx.params as BlobType).req.query
                    )

                    if (bodySchema) {
                      unwrap(await bodySchema(merged))
                    }

                    requiresCheck = false
                  }
                }

                if (isInvalid) {
                  requiresCheck = false
                }

                if (requiresCheck && bodySchema && !isInvalid) {
                  unwrap(await bodySchema(subctx.body as BlobType), wizardTags.invalidBody)
                }

                if (paramsSchema) {
                  unwrap(await paramsSchema(ctx.params.req.params), wizardTags.invalidParams)
                }

                if (queriesSchema) {
                  unwrap(await queriesSchema(ctx.params.req.query), wizardTags.invalidQueries)
                }

                subctx.body = deepmerge.all([
                  {},
                  ctx.params.req.body ?? {},
                  ctx.params.req.params ?? {},
                  ctx.params.req.query ?? {},
                  subctx.body ?? {},
                ]) as BlobType

                if (requiresCheck && bodySchema && isInvalid) {
                  unwrap(await bodySchema(subctx.body as BlobType), wizardTags.invalidBody)
                }

                // Process through the middlewares if there are
                // And continue or return data according to the result
                const middlewaresResult = await context.api.processMiddlewares(subctx, meta.middlewares ?? [])
                return middlewaresResult.continue ? rawHandler(subctx) : middlewaresResult.returnedData
              }

              if (meta.rest) {
                if (paramsSchema) {
                  unwrap(
                    await paramsSchema(isParamsStream ? ctx.meta : ctx.params),
                    wizardTags.invalidParams
                  )
                }

                if (queriesSchema) {
                  unwrap(
                    await queriesSchema(isParamsStream ? ctx.meta : ctx.params),
                    wizardTags.invalidQueries
                  )
                }
              }

              if (bodySchema) {
                unwrap(
                  await bodySchema(isParamsStream ? ctx.meta : ctx.params),
                  wizardTags.invalidBody
                )
              }

              const subctx: Sirutils.Wizard.ActionContext<BlobType, BlobType, BlobType, BlobType> = {
                body: isParamsStream ? ctx.meta : ctx.params,
                logger: serviceLogger,
                raw: ctx,
              }

              if (isParamsStream) {
                subctx.streams = isArray(ctx.params)
                  ? ctx.params.map((param: NodeJS.ReadableStream) => [
                      param,
                      getDetails(param, ctx.meta.$params),
                    ])
                  : [ctx.params, getDetails(ctx.params, ctx.meta.$params)]
              }

              // Process through the middlewares if there are
              // And continue or return data according to the result
              const middlewaresResult = await context.api.processMiddlewares(subctx, meta.middlewares ?? [])
              return middlewaresResult.continue ? rawHandler(subctx) : middlewaresResult.returnedData
            },
            `${wizardTags.action}#createAction.handler.${serviceOptions.name}@${serviceOptions.version}#${actionName}` as Sirutils.ErrorValues,
            context.$cause
          ),
        }
      }
    },
  }),
  wizardTags.action
)
