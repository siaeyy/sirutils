import { type BlobType, createActions, group, unwrap } from '@sirutils/core'
import { isArray, isRawObject, safeJsonStringify } from '@sirutils/toolbox'
import type { GatewayResponse, IncomingRequest } from 'moleculer-web'

import { wizardTags } from '../../tag'
import { toMethod } from '../toMethod'

export const serviceActions = createActions(
  (context: Sirutils.Wizard.Context): Sirutils.Wizard.ServiceApi => {
    return {
      service: async serviceOptions => {
        const aliases: Record<string, BlobType> = {}

        serviceOptions.actions = Object.fromEntries(
          Object.entries(serviceOptions.actions ?? {}).map(([key, value]) => [
            key,
            (value as BlobType)(serviceOptions),
          ])
        ) as BlobType

        for (const [key, value] of Object.entries(serviceOptions.actions ?? {})) {
          if (value.meta.rest) {
            // Create alias for redirecting
            const alias =
              typeof value.meta.rest === 'boolean'
                ? `${toMethod(key)} /`
                : (value.meta.rest as string)

            aliases[alias] = async (req: IncomingRequest, res: GatewayResponse) => {
              const result = await group(() =>
                // biome-ignore lint/style/noNonNullAssertion: Redundant
                serviceOptions.actions![key]?.handler!(req.$ctx)
              )

              if (result.isOk() && typeof result.value !== 'undefined') {
                if (isRawObject(result.value) || isArray(result.value)) {
                  res.setHeader('Content-Type', 'application/json')
                  res.end(unwrap(safeJsonStringify(result.value)))
                } else {
                  res.end(result.value)
                }
              }

              if (result.isErr()) {
                res.setHeader('Content-Type', 'application/json')
                res.end(result.error.stringify())
              }
            }

            // Extract method and path from alias
            const [method, path] = alias.split(' ') as [string, string]

            // Format param variables
            const formattedPath = path
              .substring(1)
              .split('/')
              .map(val => (val.startsWith(':') ? `\{${val.substring(1)}\}` : val))
              .join('/')

            // Get the paths object of swagger
            const paths = context.api.gateway.settings.swagger.paths

            // Original path
            const oriPath = `/${serviceOptions.name}\/${serviceOptions.version}\/${formattedPath}`

            // Omit $$async to get body content
            // and create swagger struct
            const { $$async: _$b, ...omittedBody } = value.meta.body ?? {}
            // biome-ignore lint/complexity/noForEach: <explanation>
            Object.keys(omittedBody).forEach(key => {
              omittedBody[key] = {
                type: omittedBody[key],
              }
            })

            // Omit $$async to get params
            // and create swagger struct
            const { $$async: _$p, ...omittedParams } = value.meta.queries ?? {}
            // biome-ignore lint/complexity/noForEach: <explanation>
            Object.keys(omittedParams).forEach(key => {
              omittedParams[key] = {
                name: key,
                in: 'path',
                required: true,
                schema: {
                  type: omittedParams[key],
                },
              }
            })

            // Create request body struct for swagger
            const bodyDef = value.meta.body
              ? {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: omittedBody,
                      },
                    },
                  },
                }
              : {}

            // Add struct of the endpoint to swagger
            paths[oriPath] = {}
            paths[oriPath][method.toLowerCase()] = {
              ...(value.meta.description ? { description: value.meta.description } : {}),
              parameters: Object.values(omittedParams),
              requestBody: bodyDef,
            }
          }
        }

        const $service = context.api.broker.createService({
          name: serviceOptions.name,
          version: serviceOptions.version,
          actions: serviceOptions.actions ?? {},
        })

        await $service.waitForServices([
          {
            name: serviceOptions.name,
            version: serviceOptions.version,
          },
        ])

        await group(() =>
          context.api.gateway.removeRoute(`${serviceOptions.name}/${serviceOptions.version}`)
        )

        await context.api.gateway.addRoute({
          path: `${serviceOptions.name}/${serviceOptions.version}`,
          aliases,
          mergeParams: false,
        })

        return { $service }
      },

      call: async (target, params) => {
        const name = target.slice(0, target.indexOf('@'))
        const version = target.slice(target.indexOf('@') + 1, target.indexOf('#'))
        const method = target.slice(target.indexOf('#') + 1)

        return (await context.api.broker.call(`${version}.${name}.${method}`, params)) as BlobType
      },
    }
  },
  wizardTags.service
)
