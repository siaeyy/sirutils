import type { BlobType, Fn, Simplify } from '@sirutils/core'
import type {
  ValidationRule,
  ValidationRuleObject,
  ValidationSchemaMetaKeys,
} from 'fastest-validator'

import type { SchemaTags } from '../tag'

type ValueOf<T> = T[keyof T]

declare global {
  namespace Sirutils {
    interface CustomErrors {
      schema: SchemaTags
    }

    /**
     * Add the env definitions
     */
    interface Env {}

    namespace Schema {
      type Mutable<T> = {
        -readonly [K in keyof T]: T[K]
      }

      type UndefinedToOptional<T> = {
        [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>
      } & {
        [K in keyof T as undefined extends T[K] ? never : K]: T[K]
      }

      type Compose<T> = Simplify<Sirutils.Schema.Mutable<Sirutils.Schema.UndefinedToOptional<T>>>

      /**
       * Definition for validation schema based on validation rules
       */
      type ValidationSchema<T = BlobType> = ValidationSchemaMetaKeys & {
        /**
         * List of validation rules for each defined field
         */
        [K in keyof T]: ValidationRule | undefined
      }

      interface SimpleTypeMapper {
        any: BlobType
        boolean: boolean
        currency: string
        date: Date
        email: string
        equal: unknown
        forbidden: never
        luhn: string
        mac: string
        number: number
        objectID: string
        string: string
        url: string
        uuid: string
        ulid: string
      }

      interface ComplexTypeMapper {
        object: Record<BlobType, BlobType>
        array: BlobType[]
        enum: BlobType
        record: Record<BlobType, BlobType>

        multi: BlobType
        class: Fn<BlobType[], BlobType>
        function: Fn<BlobType[], BlobType>
        tuple: BlobType[]
      }

      type Extract<T> = T extends (v: infer S) => BlobType ? S : never

      type ImplementEnumDatas<S extends ValidationRuleObject> = S['enum'] extends BlobType[]
        ? S['enum'][number]
        : never

      type ImplementMulti<S extends ValidationRuleObject> = S['type'] extends 'multi'
        ? S['rules'] extends BlobType[]
          ? Simplify<
              ValueOf<{
                [Key in keyof S['rules']]: Sirutils.Schema.ImplementProperties<S['rules'][Key]>
              }>
            >
          : never
        : never

      type ImplementArray<S extends ValidationRuleObject> = S['type'] extends 'array'
        ? S['enum'] extends BlobType[]
          ? Sirutils.Schema.ImplementEnumDatas<S>[]
          : Sirutils.Schema.Compose<
              S['items'] extends keyof Sirutils.Schema.SimpleTypeMapper
                ? Sirutils.Schema.SimpleTypeMapper[S['items']]
                : Sirutils.Schema.ImplementProperties<S['items']>
            >[]
        : never

      type ImplementObject<S extends ValidationRuleObject> = S['type'] extends 'object'
        ? Sirutils.Schema.Compose<Sirutils.Schema.ExtractSchemaType<S['props']>>
        : never

      type ImplementEnum<S extends ValidationRuleObject> = S['type'] extends 'enum'
        ? S['values'][number]
        : never

      type ImplementRecord<S extends ValidationRuleObject> = S['type'] extends 'record'
        ? Record<
            Sirutils.Schema.ImplementProperties<S['key']> extends string | number | symbol
              ? Sirutils.Schema.ImplementProperties<S['key']>
              : string,
            Sirutils.Schema.ImplementProperties<S['value']>
          >
        : never

      type ImplementOthers<S extends ValidationRuleObject> = S['type'] extends Exclude<
        keyof Sirutils.Schema.ComplexTypeMapper,
        'array' | 'object' | 'enum' | 'record' | 'multi'
      >
        ? Sirutils.Schema.ComplexTypeMapper[S['type']]
        : never

      type ImplementProperties<S extends ValidationRuleObject> =
        | (S['type'] extends keyof Sirutils.Schema.SimpleTypeMapper
            ? Sirutils.Schema.ImplementEnum<S> extends never
              ? Sirutils.Schema.ImplementEnumDatas<S> extends never
                ? Sirutils.Schema.SimpleTypeMapper[S['type']]
                : Sirutils.Schema.ImplementEnumDatas<S>
              : Sirutils.Schema.ImplementEnum<S>
            : S['type'] extends keyof Sirutils.Schema.ComplexTypeMapper
              ?
                  | Sirutils.Schema.ImplementArray<S>
                  | Sirutils.Schema.ImplementObject<S>
                  | Sirutils.Schema.ImplementEnum<S>
                  | Sirutils.Schema.ImplementRecord<S>
                  | Sirutils.Schema.ImplementMulti<S>
                  | Sirutils.Schema.ImplementOthers<S>
              : never)
        | (S['nullable'] extends true ? null : never)
        | (S['optional'] extends true ? undefined : never)

      type ExtractSchemaType<S extends Sirutils.Schema.ValidationSchema<BlobType>> = {
        [K in keyof S]: S[K] extends keyof Sirutils.Schema.SimpleTypeMapper
          ? Sirutils.Schema.SimpleTypeMapper[S[K]]
          : S[K] extends ValidationRuleObject
            ? Sirutils.Schema.ImplementProperties<S[K]>
            : S[K] extends keyof Sirutils.Schema.ComplexTypeMapper
              ? Sirutils.Schema.ComplexTypeMapper[S[K]]
              : never
      }
    }
  }
}
