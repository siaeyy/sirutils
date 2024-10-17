// import fs from 'node:fs'
import { type BlobType, capsule, createActions } from '@sirutils/core'

import { logger } from '../../internal/logger'
import { createTag } from '../../internal/tag'
import { wizardTags } from '../../tag'

import type { LoggerInstance, ServiceAction } from 'moleculer'


export const middlewareActions = createActions(
    (context: Sirutils.Wizard.Context): Sirutils.Wizard.MiddlewareApi => ({
        /**
         * Creates middleware and returns its schema
         * 
         * If middleware is created with a name, it becomes middleware servive's action
         * For access it from anywhere with just its name
         * 
         * Nameless middlewares can be used for generators
         */
        createMiddleware(meta, rawHandler) {
            // Logger for use it in the handler
            const middlewareLogger = logger.create({
                defaults: {
                    tag: createTag(`middleware.${meta.name}`),
                },
            })

            // Capsule the handler for better error handling
            const handler = capsule(
                rawHandler,
                `${wizardTags.middleware}#createMiddleware.handler.${meta.name}` as Sirutils.ErrorValues,
                context.$cause
            )

            const middlewareSchema: Sirutils.Wizard.MiddlewareSchema<keyof Sirutils.Wizard.ContextShare, BlobType> = {
                logger: middlewareLogger,
                share: Array.from(new Set(meta.share ? meta.share : [])),
                handler
            }

            const settings = context.api.middleware.settings

            // If middleware has a name, make it a action of middleware service
            if (meta.name) {
                if (settings.middlewareSchemas === undefined) {
                    settings.middlewareSchemas = {}
                }

                settings.middlewareSchemas[meta.name] = middlewareSchema

                context.api.middleware.actions[meta.name] = (handler) as ServiceAction
            }

            return middlewareSchema
        },
        /**
         * Processes middlewares that given its name or schema in order
         * And returns that whether endpoint processes must continue after middlewares
         * 
         * If there is a returned data from any middleware, returns it in the case continue is false
         */
        async processMiddlewares(actionCtx, middlewares) {
            if(middlewares.length === 0) {
                return { continue: true }
            }

            let willContinue = true
            let returnedData: BlobType

            // Data structure that has shared usage between middlewares
            // Its properties are defined in ContextShare interface
            const share: Record<string, BlobType> = {}

            // TODO: Sometimes interCtx is causing error about 
            // Excessively deep and possibly infinite instantiation ts(2589)
            const interCtx = { 
                ...actionCtx, share
            }

            // Symbol for determining to pass the next middleware
            const nextSymbol = Symbol('next-middleware')
            const settings = context.api.middleware.settings

            const shareKeys: string[] = middlewares.flatMap(middleware => {
                if (typeof middleware === 'string') {
                    return settings.middlewareSchemas[middleware].share
                }
                return middleware.share
            })

            // Grap given share props in schemas and add these into share object as undefined
            //biome-ignore lint/complexity/noForEach: <explanation>
            shareKeys.forEach(key => {
                if (!Object.hasOwn(share, key)) {
                    Object.defineProperty(share, key, { writable: true })
                }
            });

            // Process middleware and everytime passing next middleware, change the logger 
            for (const middleware of middlewares) {
                if (typeof middleware === 'string') {
                    const middlewareSchema = settings.middlewareSchemas[middleware] as 
                        Sirutils.Wizard.MiddlewareSchema<keyof Sirutils.Wizard.ContextShare, BlobType>

                    interCtx.logger = middlewareSchema.logger as LoggerInstance
                    returnedData = await middlewareSchema.handler(interCtx, nextSymbol)
                } else {
                    interCtx.logger = middleware.logger as LoggerInstance
                    returnedData = await middleware.handler(interCtx, nextSymbol)
                }

                if (returnedData !== nextSymbol) {
                    willContinue = false
                    break
                }
            }

            // After processes remove props that have undefined value
            // For avoiding confusion on share object keys
            actionCtx.share = shareKeys.reduce((acc, key) => {
                if(share[key] !== undefined) {
                    acc[key] = share[key]
                }
                return acc;
            }, {} as Record<string, BlobType>);

            return willContinue
                ? { continue: willContinue }
                : { continue: willContinue, returnedData }
        }
    }),
    wizardTags.middleware
)