import type { BlobType, EmptyType, Fn, LiteralUnion, Simplify } from '@sirutils/core'
import type Moleculer from 'moleculer'
import type {
  ActionSchema as MoleculerActionSchema,
  Context as MoleculerContext,
  Service as MoleculerService,
  ServiceBroker,
} from 'moleculer'

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

    namespace Wizard {
      interface Options {
        environment?: 'production' | 'development' | 'test'
        id?: string
        nats?: string
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
      }

      interface ServiceApi {
        service: <
          const T extends string,
          const S extends string,
          const R extends Record<
            string,
            Sirutils.Wizard.ActionSchema<BlobType, BlobType, BlobType, BlobType>
          >,
        >(
          service: Sirutils.Wizard.ServiceOptions<T, S, R>
        ) => Promise<Sirutils.Wizard.Service<T, S, R>>

        call: <
          const N extends keyof Sirutils.WizardServices,
          const M extends Sirutils.WizardServices[N] extends Sirutils.Wizard.Service<
            BlobType,
            BlobType,
            infer R
          >
            ? keyof R
            : never,
        >(
          name: LiteralUnion<`${N}#${M}`, string>,
          params: Sirutils.WizardServices[N] extends Sirutils.Wizard.Service<
            BlobType,
            BlobType,
            infer R
          >
            ? R[M] extends Fn<
                BlobType,
                Sirutils.Wizard.ActionSchema<infer B, infer P, infer Q, BlobType>
              >
              ? Simplify<
                  (B extends { $$async?: never } ? EmptyType : B) &
                    (P extends { $$async?: never } ? EmptyType : P) &
                    (Q extends { $$async?: never } ? EmptyType : Q)
                >
              : R[M] extends Sirutils.Wizard.ActionSchema<infer B, infer P, infer Q, BlobType>
                ? Simplify<
                    (B extends { $$async?: never } ? EmptyType : B) &
                      (P extends { $$async?: never } ? EmptyType : P) &
                      (Q extends { $$async?: never } ? EmptyType : Q)
                  >
                : never
            : never
        ) => Promise<
          Sirutils.WizardServices[N] extends Sirutils.Wizard.Service<BlobType, BlobType, infer R>
            ? R[M] extends Fn<
                BlobType,
                Sirutils.Wizard.ActionSchema<BlobType, BlobType, BlobType, infer H>
              >
              ? H
              : R[M] extends Sirutils.Wizard.ActionSchema<BlobType, BlobType, BlobType, infer H>
                ? H
                : never
            : never
        >
      }

      interface ActionContext<B, P, Q> {
        body: B extends Sirutils.Schema.ValidationSchema<BlobType>
          ? Sirutils.Schema.Compose<Sirutils.Schema.ExtractSchemaType<B>>
          : never
        params?: P extends Sirutils.Schema.ValidationSchema<BlobType>
          ? Sirutils.Schema.Compose<Sirutils.Schema.ExtractSchemaType<P>>
          : never
        queries?: Q extends Sirutils.Schema.ValidationSchema<BlobType>
          ? Sirutils.Schema.Compose<Sirutils.Schema.ExtractSchemaType<Q>>
          : never

        req?: Request
        res?: Response
        raw: MoleculerContext
      }

      interface ActionSchema<B, P, Q, R> extends MoleculerActionSchema {}

      type ActionHandler<B, P, Q, R> = (ctx: Sirutils.Wizard.ActionContext<B, P, Q>) => R

      interface ActionApi {
        createAction: <
          const B extends Sirutils.Schema.ValidationSchema<BlobType>,
          const P extends Sirutils.Schema.ValidationSchema<BlobType>,
          const Q extends Sirutils.Schema.ValidationSchema<BlobType>,
          Hr,
        >(
          meta: {
            description?: string
            body?: B
            params?: P
            queries?: Q
            rest?: true | string
          },
          handler: Sirutils.Wizard.ActionHandler<NoInfer<B>, NoInfer<P>, NoInfer<Q>, Hr>
        ) => (
          serviceOptions: Sirutils.Wizard.ServiceOptions<BlobType, BlobType, BlobType>
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

      type Context = Sirutils.PluginSystem.Context<
        Sirutils.Wizard.Options,
        Sirutils.Wizard.BaseApi & Sirutils.Wizard.ServiceApi & Sirutils.Wizard.ActionApi
      >
    }
  }
}
