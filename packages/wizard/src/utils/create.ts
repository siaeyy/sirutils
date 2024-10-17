import pkg from '../../package.json'

import { type BlobType, ProjectError, createPlugin, group } from '@sirutils/core'
import { ServiceBroker } from 'moleculer'
import ApiGatewayService from 'moleculer-web'

import { logger } from '../internal/logger'
import { wizardTags } from '../tag'
import { actionActions } from './internals/action'
import { WizardRegenerator } from './internals/error'
import { WizardLogger } from './internals/logger'
import { serviceActions } from './internals/service'
import { middlewareActions } from './internals/middleware'

export const createWizard = createPlugin<Sirutils.Wizard.Options, Sirutils.Wizard.BaseApi>(
  {
    name: pkg.name,
    version: pkg.version,
    dependencies: {
      'driver-redis': '^0.2.3',
    },
  },
  async context => {
    if (!context.options.nats) {
      context.options.nats = 'nats://localhost:4222'
    }

    const checkRedisDriver = group(() => [context.lookup('driver-redis')])

    if (checkRedisDriver.isErr()) {
      checkRedisDriver.error.throw()
    }

    const redis = context.get('driver-redis')

    const broker = new ServiceBroker({
      namespace: context.options.environment || null,
      nodeID: context.options.id || null,

      logger: new WizardLogger(),
      transporter: context.options.nats,
      serializer: 'CBOR',

      contextParamsCloning: false,
      maxCallLevel: 100,
      heartbeatInterval: 5,
      heartbeatTimeout: 15,
      disableBalancer: false,
      circuitBreaker: {
        enabled: true,
      },
      bulkhead: {
        enabled: true,
        concurrency: 10,
        maxQueueSize: 100,
      },
      cacher: {
        type: 'Redis',
        options: {
          // Prefix for keys
          prefix: 'wiz',
          // set Time-to-live to 30sec.
          ttl: 30,
          // Turns Redis client monitoring on.
          monitor: false,
          // Redis settings
          redis: redis.options.client,
        },
      },
      retryPolicy: {
        enabled: false,
      },
      errorHandler: (e, info) => {
        if (context.options.logs) {
          logger.error(e, info)
        }

        if ('action' in info) {
          if (e instanceof ProjectError) {
            return e.throw()
          }

          if ((e as BlobType)?.type === 'SERVICE_NOT_FOUND') {
            return ProjectError.create(
              wizardTags.notFound,
              `${(e as BlobType).data.action} not found`,
              context.$cause
            )
              .appendData(e)
              .throw()
          }

          return ProjectError.create(
            wizardTags.unexpected,
            'unexpected error in broker.errorHandler',
            context.$cause
          )
            .appendData(e)
            .throw()
        }

        if (e instanceof ProjectError) {
          return e.throw()
        }

        return ProjectError.create(
          wizardTags.unexpected,
          'unexpected error in broker.errorHandler',
          context.$cause
        )
          .appendData(e)
          .throw()
      },

      errorRegenerator: new WizardRegenerator(),
    })

    await broker.start()

    return {
      broker,
      gateway: broker.createService({
        name: undefined as BlobType,
        mixins: [ApiGatewayService],
        settings: {
          port: context.options.port,
          ip: context.options.host,
          routes: [
            {
              path: '/',
              mergeParams: false,
              whitelist: ['*'],
            },
          ],

          onError(_req: BlobType, res: BlobType, err: BlobType) {
            res.setHeader('Content-Type', 'application/json')
            res.writeHead(500)
            if (err instanceof ProjectError) {
              if (context.options.logs) {
                logger.error(err)
              }
              res.end(err.stringify())
            } else {
              if (context.options.logs) {
                logger.error(err)
              }
              res.end(String(err))
            }
          },
        },
      }),
      // Middleware service for global middlewares
      middleware: broker.createService({
        name: 'middleware',
      }),
      methods: {
        reformatError(err: BlobType) {
          return err
        },
      },
    }
  },
  wizardTags.plugin
)
  .register(serviceActions)
  .register(actionActions)
  .register(middlewareActions)
  .lock()
