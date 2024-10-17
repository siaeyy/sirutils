import { wizard } from '../wizard'

export const auth = wizard.api.createMiddleware(
    {
        name: 'auth',
        share: ['user']
    },
    (ctx, next) => {
        if(ctx.req && ctx.res) {
            const authHeader = ctx.req.headers.authorization
            //biome-ignore lint/complexity/useOptionalChain: <explanation>
            const token = authHeader && authHeader.split(" ")[1]

            if (token !== undefined) {
                ctx.share.user = {
                    name: "siaeyy"
                }
                return next
            }

            ctx.res.statusCode = 404
            ctx.res.end("Authorization is not found!")
            return 
        }
        
        return undefined
    }
)

declare global {
    //biome-ignore lint/style/noNamespace: <explanation>
    namespace Sirutils {
        //biome-ignore lint/style/noNamespace: <explanation>
        namespace Wizard {
            interface ContextShare {
                'user': {
                    name: string
                }
            }
        }

        interface WizardMiddlewares {
            'auth': typeof auth
        }
    }
}