import type { BASE_CONTROLLER } from './framework-controller';
import type { BASE_ENTITY } from './framework-entity';
import { CoreModels } from 'tnp-core/src';


export interface IConnectionOptions {
  database: string;
  type?: CoreModels.DatabaseType;
  synchronize: boolean;
  dropSchema: boolean;
  logging: boolean;
}


export type IConnectionOptionInit = Pick<IConnectionOptions, 'database' | 'logging' | 'type'>;
export type ISession = {
  /**
     * frontend host only needed when we are using
     * withCredentials for axios
     * and session cookie
     */
  frontendHost: string;
  secret: string,
  saveUninitialized: boolean,
  cookie: {
    maxAge: number,
    /**
     * true only for https, false fopr the rest
     * when is true and http => everytime new session
     */
    secure: boolean
  },
  resave: boolean,
}

export type ISessionExposed = {
  /**
   * REQUIRED - backend need to know that to negotiate credentials
   * frontend host only needed when we are using
   * withCredentials for axios
   * and session cookie
   */
  frontendHost: string;
  /**
   * max age of session
   */
  maxAge?: number;
}

export type MiddlewareType = [Function, any[]];

export type FrameworkMode =
  'backend/frontend' |
  'remote-backend' |
  'tests' |
  'backend/frontend-worker' |
  'websql/backend-frontend'
  ;

export interface StartOptions {

  /**
   * start server on this host
   */
  host: string;

  /**
   * Put firedev controllers here
   */
  controllers?: BASE_CONTROLLER<any>[] | Function[];

  /**
   * Put firedev entities here
   */
  entities?: BASE_ENTITY<any>[] | Function[];
  /**
   * Disable realtime/socket for this context
   */
  disabledRealtime?: boolean;

  /**
   * @deprecated
   */
  allowedHosts?: string[];
  /**
   * config for express http cookie sesison
   */
  session?: ISessionExposed;


  //#region @websql
  mode?: FrameworkMode;
  config?: IConnectionOptionInit;
  middlewares?: MiddlewareType[];
  /**
   * @deprecated
   */
  InitDataPrioritypublicAssets?: { path: string; location: string }[];
  /**
 * Put (some/all) firedev controllers here in data init priority order
 */
  InitDataPriority?: BASE_CONTROLLER<any>[] | Function[];
  /**
   * @deprecated
   */
  publicAssets?: { path: string; location: string; }[];
  //#endregion

}
