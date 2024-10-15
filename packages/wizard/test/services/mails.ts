import { unwrap } from '@sirutils/core'

import { parsePlainTextFile } from '../../src/utils/parsers'
import { wizard } from '../wizard'

const mailsService = await wizard.api.service({
  name: 'mails',
  version: '0.1.1',
  description: 'mails api',

  actions: {
    test: wizard.api.createAction(
      {
        body: {
          name: 'string',
        },
        queries: {
          id: 'string',
        },
        rest: true,
        stream: true,
        multipart: true,
      },
      async ctx => {
        if (ctx.streams) {
          for (const [stream, options] of ctx.streams) {
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            ctx.logger.info(unwrap(await parsePlainTextFile(stream!)), options)
          }
        }

        return 'as' as const
      }
    ),
  },

  created: ctx => {
    ctx.logger.info('hi')

    return true
  },
})

declare global {
  // biome-ignore lint/style/noNamespace: <explanation>
  namespace Sirutils {
    interface WizardServices {
      'mails@0.1.1': typeof mailsService
    }
  }
}
