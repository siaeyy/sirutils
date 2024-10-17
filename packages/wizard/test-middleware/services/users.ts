import { wizard } from '../wizard'

const usersService = await wizard.api.service({
  name: 'users',
  version: '0.0.1',
  description: 'users api',

  actions: {
    get: wizard.api.createAction(
      {
        rest: 'GET /',
        middlewares: ['auth']
      },
      ctx => {
        //biome-ignore lint/suspicious/noConsole: <explanation>
        console.log(ctx.share?.user)

        return JSON.stringify(ctx.share?.user)
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
