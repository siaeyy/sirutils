import type { ServerResponse } from 'node:http'
import type { BlobType, EmptyType, Fn, Simplify } from '@sirutils/core'
import type formidable from 'formidable'
import type Moleculer from 'moleculer'
import type {
  CacherOptions,
  CallingOptions,
  ActionSchema as MoleculerActionSchema,
  Context as MoleculerContext,
  Service as MoleculerService,
  ServiceBroker,
} from 'moleculer'
import type { IncomingRequest } from 'moleculer-web'

import type { WizardTags } from '../tag'
import type { createWizard } from '../utils/create'

declare global {
  namespace Sirutils {
    interface CustomErrors {
      wizard: WizardTags
    }

    interface PluginDefinitions {
      wizard: Sirutils.PluginSystem.ExtractDefinition<typeof createWizard>
    }

    interface WizardServices {}
    interface WizardMiddlewares {}

    namespace Wizard {
      interface Options {
        environment?: 'production' | 'development' | 'test'
        id?: string
        nats?: string
        port?: string
        host?: string
        logs?: boolean
      }

      interface Service<
        T,
        S,
        R extends Record<
          string,
          Sirutils.Wizard.ActionSchema<BlobType, BlobType, BlobType, BlobType>
        >,
      > {
        $service: Moleculer.Service
      }

      interface BaseApi {
        broker: ServiceBroker
        gateway: MoleculerService
        middleware: MoleculerService
      }

      interface ServiceOptions<
        T extends string,
        S extends string,
        R extends Record<
          string,
          Sirutils.Wizard.ActionSchema<BlobType, BlobType, BlobType, BlobType>
        >,
      > {
        name: T
        version: S
        description: string

        actions?: R

        created?: <B, P, Q, S>(ctx: Sirutils.Wizard.ActionContext<B, P, Q, S>) => BlobType
      }

      type ActionNames = {
        [K in keyof Sirutils.WizardServices as Sirutils.WizardServices[K] extends Sirutils.Wizard.Service<
          BlobType,
          BlobType,
          infer R
        >
          ? keyof R extends string
            ? `${K}#${keyof R}`
            : never
          : never]: BlobType
      }

      type ExtractActionName<T extends keyof Sirutils.Wizard.ActionNames> =
        T extends `${infer N}#${infer M}`
          ? N extends keyof Sirutils.WizardServices
            ? Sirutils.WizardServices[N] extends Sirutils.Wizard.Service<
                BlobType,
                BlobType,
                infer R
              >
              ? M extends keyof R
                ? R[M]
                : never
              : never
            : never
          : never

      // Extract share props from global middleware or MiddlewareSchema 
      type ExtractShareContent<M> = M extends keyof Sirutils.WizardMiddlewares
        ? Sirutils.WizardMiddlewares[M] extends Sirutils.Wizard.MiddlewareSchema<infer S, BlobType>
          ? S
          : never
        : M extends Sirutils.Wizard.MiddlewareSchema<infer S, BlobType>
          ? S
          : never
        
      interface ServiceApi {
        service: <
          const T extends string,
          const S extends string,
          const R extends Sirutils.Wizard.ActionList,
        >(
          service: Sirutils.Wizard.ServiceOptions<T, S, R>
        ) => Promise<Sirutils.Wizard.Service<T, S, R>>

        call: <const N extends keyof Sirutils.Wizard.ActionNames>(
          name: N,
          params: Sirutils.Wizard.ExtractActionName<N> extends Fn<BlobType[], infer Sa>
            ? Sa extends Sirutils.Wizard.ActionSchema<infer B, infer P, infer Q, BlobType>
              ? Simplify<
                  (B extends { $$async?: never } ? EmptyType : B) &
                    (P extends { $$async?: never } ? EmptyType : P) &
                    (Q extends { $$async?: never } ? EmptyType : Q)
                >
              : never
            : never,
          options?: CallingOptions & { stream?: NodeJS.ReadableStream | NodeJS.ReadableStream[] }
        ) => Promise<
          Sirutils.Wizard.ExtractActionName<N> extends Fn<BlobType[], infer Sa>
            ? Sa extends Sirutils.Wizard.ActionSchema<BlobType, BlobType, BlobType, infer R>
              ? R
              : never
            : never
        >
      }

      type StreamData = [
        NodeJS.ReadableStream,
        {
          filename: string
          mimetype: string | null
          name?: string
        },
      ]

      interface ActionContext<B, P, Q, S> {
        logger: Moleculer.LoggerInstance
        body: Simplify<
          (B extends Sirutils.Schema.ValidationSchema<BlobType>
            ? Sirutils.Schema.Compose<Sirutils.Schema.ExtractSchemaType<B>>
            : never) &
            (P extends Sirutils.Schema.ValidationSchema<BlobType>
              ? Sirutils.Schema.Compose<Sirutils.Schema.ExtractSchemaType<P>>
              : never) &
            (Q extends Sirutils.Schema.ValidationSchema<BlobType>
              ? Sirutils.Schema.Compose<Sirutils.Schema.ExtractSchemaType<Q>>
              : never)
        >

        req?: IncomingRequest
        res?: ServerResponse
        streams?: Sirutils.Wizard.StreamData[]
        raw?: MoleculerContext
        share?: Partial<Pick<ContextShare, S extends keyof ContextShare ? S : never>>
      }
      // Only difference between ActionContext and MiddlewareContext is 
      // MiddlewareContext's share property is not optional
      interface MiddlewareContext<B, P, Q, S> extends Omit<ActionContext<B, P, Q, S>, "share"> {
        share: Pick<ContextShare, S extends keyof ContextShare ? S : never>
      }

      interface ContextShare {}

      interface ActionSchema<B, P, Q, R> extends MoleculerActionSchema {}
      interface MiddlewareSchema<S extends keyof ContextShare, R> {
        logger: unknown,
        share: S[],
        handler: Sirutils.Wizard.MiddlewareHandler<S, R>
      }

      type ActionList = Record<
        string,
        Sirutils.Wizard.ActionSchema<BlobType, BlobType, BlobType, BlobType>
      >

      type ActionHandler<B, P, Q, S, R> = (ctx: Sirutils.Wizard.ActionContext<B, P, Q, S>) => R
      type MiddlewareHandler<S, R> = (ctx: Sirutils.Wizard.MiddlewareContext<BlobType, BlobType, BlobType, S>, next: unknown) => R

      interface ActionApi {
        createAction: <
          const B extends Sirutils.Schema.ValidationSchema<BlobType>,
          const P extends Sirutils.Schema.ValidationSchema<BlobType>,
          const Q extends Sirutils.Schema.ValidationSchema<BlobType>,
          Hr,
          const M extends keyof Sirutils.WizardMiddlewares 
          | Sirutils.Wizard.MiddlewareSchema<keyof Sirutils.Wizard.ContextShare, Hr> = never,
        >(
          meta: {
            body?: B
            params?: P
            queries?: Q
            rest?: true | string | string[]
            cache?: boolean | CacherOptions
            stream?: boolean
            middlewares?: M[]
            multipart?: formidable.Options | boolean
          },
          handler: Sirutils.Wizard.ActionHandler<
            NoInfer<B>, NoInfer<P>, NoInfer<Q>, ExtractShareContent<M>,
            Hr
          >
        ) => (
          serviceOptions: Sirutils.Wizard.ServiceOptions<BlobType, BlobType, BlobType>,
          actionName: string
        ) => Sirutils.Wizard.ActionSchema<
          B extends Sirutils.Schema.ValidationSchema<BlobType>
            ? Sirutils.Schema.Compose<Sirutils.Schema.ExtractSchemaType<B>>
            : never,
          P extends Sirutils.Schema.ValidationSchema<BlobType>
            ? Sirutils.Schema.Compose<Sirutils.Schema.ExtractSchemaType<P>>
            : never,
          Q extends Sirutils.Schema.ValidationSchema<BlobType>
            ? Sirutils.Schema.Compose<Sirutils.Schema.ExtractSchemaType<Q>>
            : never,
          Hr
        >
      }

      interface MiddlewareApi {
        createMiddleware: <
          Hr,
          const S extends keyof ContextShare = never,
        >(
          meta: {
            name?: keyof WizardMiddlewares
            share?: S[]
          },
          handler: Sirutils.Wizard.MiddlewareHandler<S, Hr>
        ) => Sirutils.Wizard.MiddlewareSchema<S, Hr>
        processMiddlewares: (
          ctx: Sirutils.Wizard.ActionContext<BlobType, BlobType, BlobType, BlobType>,
          middlewares: (keyof WizardMiddlewares | Sirutils.Wizard.MiddlewareSchema<keyof ContextShare, BlobType>)[]
        ) => Promise<{ continue: true } | { continue: false, returnedData: BlobType}>
      }

      type Context = Sirutils.PluginSystem.Context<
        Sirutils.Wizard.Options,
        Sirutils.Wizard.BaseApi & Sirutils.Wizard.ServiceApi & Sirutils.Wizard.ActionApi & Sirutils.Wizard.MiddlewareApi
      >
    }
  }
}
