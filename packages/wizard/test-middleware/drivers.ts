import { createRedisDriver } from '@sirutils/driver-redis'
import { createScyllaDriver } from '@sirutils/driver-scylla'

import { ENV } from './consts'

export const redis = await createRedisDriver({
  client: {
    host: ENV.redisHost,
    port: ENV.redisPort,
    db: ENV.redisDatabase,
    password: ENV.redisPassword,
  },
})

export const scylla = await createScyllaDriver(
  {
    client: {
      contactPoints: ENV.scyllaContactPoints,
      localDataCenter: ENV.scyllaLocalDataCenter,
      credentials: { username: ENV.scyllaUsername, password: ENV.scyllaPassword },
      keyspace: 'sirius',
    },
  },
  redis
)
