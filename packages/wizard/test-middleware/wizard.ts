import { createWizard } from '../src'
import { ENV } from './consts'
import { redis, scylla } from './drivers'

export const wizard = await createWizard(
  {
    environment: ENV.mode,
  },
  redis,
  scylla
)
