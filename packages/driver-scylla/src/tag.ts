import { tagBuilder } from '@sirutils/core'

const createTag = tagBuilder('@sirutils/driver-scylla')

export const driverScyllaTags = {
  logger: createTag('logger'),
  plugin: createTag('plugin'),

  // # driver
  driver: createTag('driver'),
  resultSet: createTag('exec#result-set'),

  migration: createTag('migration'),

  invalidUpUsage: createTag('invalid-up-usage'),
  invalidDownUsage: createTag('invalid-down-usage'),
} as const

export type DriverScyllaTags = (typeof driverScyllaTags)[keyof typeof driverScyllaTags]
