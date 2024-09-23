import { logger } from '../../src/internal/logger'
import { wizard } from '../wizard'

const usersService = await wizard.api.service({
  name: 'users',
  version: '0.1.1',
  description: 'users api',

  actions: {
    create: wizard.api.createAction(
      {
        description: 'Create user',
        body: {
          name: 'string',
        },
        queries: {
          id: 'string',
        },
        rest: 'POST /:id',
      },
      ctx => {
        logger.log(ctx.body, ctx.params, ctx.queries)

        return 'as' as const
      }
    ),
  },
})

declare global {
  // biome-ignore lint/style/noNamespace: <explanation>
  namespace Sirutils {
    interface WizardServices {
      'users@0.1.1': typeof usersService
    }
  }
}
