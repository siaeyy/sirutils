import { createTag } from './internal/tag'

export const wizardTags = {
  // internal
  logger: createTag('logger'),
  unexpected: createTag('unexpected'),

  plugin: createTag('plugin'),
  service: createTag('service'),
  action: createTag('action'),
  middleware: createTag('middleware'),
  httpMixin: createTag('http-mixin'),
  getDetails: createTag('get-details'),

  parserMultipart: createTag('parser-multipart'),
  parserPlainText: createTag('parser-plain-text'),

  invalidBody: createTag('invalid-body'),
  invalidParams: createTag('invalid-params'),
  invalidQueries: createTag('invalid-queries'),
  notFound: createTag('not-found'),
} as const

export type WizardTags = (typeof wizardTags)[keyof typeof wizardTags]
