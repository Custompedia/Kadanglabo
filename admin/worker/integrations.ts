import type { Hono, MiddlewareHandler } from 'hono'
import type { AppEnv, Env } from './env'
import { articleflow } from '../articleflow/index.worker'

/*
 * Optional add-ons of the CMS Worker. Each lives in its own folder and is known to the core only through this file.
 * To remove one: delete its import and its entry below (see the add-on's README).
 */
export interface Integration {
  /** Add routes and middleware. Called before the core routes, so middleware registered here also wraps them. */
  mount(api: Hono<AppEnv>, requireUser: MiddlewareHandler<AppEnv>): void
  /** Runs on the Worker's cron, next to the weekly media cleanup. */
  scheduled?(env: Env): Promise<unknown>
}

export const integrations: Integration[] = [articleflow]
