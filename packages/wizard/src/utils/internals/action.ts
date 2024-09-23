import { type BlobType, capsule, createActions, unwrap } from '@sirutils/core'
import { createAsyncSchema } from '@sirutils/schema'

import { wizardTags } from '../../tag'

export const actionActions = createActions(
  (context: Sirutils.Wizard.Context): Sirutils.Wizard.ActionApi => ({
    createAction: (meta, handler) => {
      const bodySchema = meta.body && createAsyncSchema(meta.body)
      const paramsSchema = meta.params && createAsyncSchema(meta.params)
      const queriesSchema = meta.queries && createAsyncSchema(meta.queries)

      return serviceOptions => ({
        // We dont have access to service's name in here
        // so we return meta datas for adding these to swagger in service module
        meta: meta,
        handler: capsule(
          // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Redundant
          async ctx => {
            if (ctx.params.req && meta.rest) {
              if (bodySchema) {
                unwrap(await bodySchema(ctx.params.req.body), wizardTags.invalidBody)
              }

              if (paramsSchema) {
                unwrap(await paramsSchema(ctx.params.req.params), wizardTags.invalidParams)
              }

              if (queriesSchema) {
                unwrap(await queriesSchema(ctx.params.req.query), wizardTags.invalidQueries)
              }

              // @ts-ignore
              const subctx: Sirutils.Wizard.ActionContext<BlobType, BlobType, BlobType> = {
                params: ctx.params.req.params,
                body: ctx.params.req.body,
                queries: ctx.params.req.query,
                req: ctx.params.req,
                res: ctx.params.res,

                raw: ctx,
              }

              return handler(subctx)
            }

            if (meta.rest) {
              if (paramsSchema) {
                unwrap(await paramsSchema(ctx.params), wizardTags.invalidParams)
              }

              if (queriesSchema) {
                unwrap(await queriesSchema(ctx.params), wizardTags.invalidQueries)
              }
            }

            if (bodySchema) {
              unwrap(await bodySchema(ctx.params), wizardTags.invalidBody)
            }

            const subctx: Sirutils.Wizard.ActionContext<BlobType, BlobType, BlobType> = {
              body: ctx.params,
              raw: ctx,
            }

            return handler(subctx)
          },
          `${wizardTags.action}#createAction.handler.${serviceOptions.name}@${serviceOptions.version}` as Sirutils.ErrorValues,
          context.$cause
        ),
      })
    },
  }),
  wizardTags.action
)
