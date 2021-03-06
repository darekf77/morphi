import type { FrameworkContext } from './framework-context';
import { Application } from 'express';
import {
  _,
  path,
  fse,
  http,
} from 'tnp-core';
import * as express from 'express';
import { SYMBOL } from '../symbols';
import * as  cors from 'cors';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as methodOverride from 'method-override';
import * as fileUpload from 'express-fileupload';
import { createConnections, getConnection } from 'typeorm';
import { Connection } from 'typeorm';
import { CLASS } from 'typescript-class-helpers';
import { Models } from '../models';
import { FrameworkContextBase } from './framework-context-base';
import type { BASE_CONTROLLER } from './framework-controller';
import { Http2Server } from 'http2';
import { RealtimeNodejs } from '../realtime';

export class FrameworkContextNodeApp extends FrameworkContextBase {
  public readonly app: Application;
  public readonly httpServer: Http2Server;
  public readonly connection: Connection;
  readonly realtime: RealtimeNodejs;
  constructor(private context: FrameworkContext) {
    super();
  }

  private async initConnection() {

    if (this.context.mode === 'backend/frontend' || this.context.mode === 'tests') {
      try {
        const con = await getConnection();

        const connectionExists = !!(con);
        if (connectionExists) {
          console.log('Connection exists')
          await con.close()
        }
      } catch (error) { };

      const connections = await createConnections([this.context.config] as any);
      // @ts-ignore
      this.connection = connections[0];
    }

  }

  async init() {
    // console.log(`

    // INIT

    // this.context.onlyForBackendRemoteServerAccess : ${this.context.onlyForBackendRemoteServerAccess}

    // `)
    if (this.context.onlyForBackendRemoteServerAccess) {
      // @ts-ignore
      this.app = {} as any;
    } else {
      // @ts-ignore
      this.app = express()
      this.initMidleware();
      const h = new http.Server(this.app);
      // @ts-ignore
      this.httpServer = h;

      if (!this.context.testMode) {
        h.listen(this.context.uri.port, () => {
          console.log(`Server listening on port: ${this.context.uri.port}, hostname: ${this.context.uri.pathname},
              env: ${this.app.settings.env}
              `);
        });
      }
      await this.initConnection();
      this.initDecoratorsFunctions();
      this.writeActiveRoutes(this.context.workerMode);

      this.context.publicAssets.forEach(asset => {
        this.app.use(asset.path, express.static(asset.location))
      });

      // @ts-ignore
      this.realtime = new RealtimeNodejs(this.context);

      const instancesOfControllers: BASE_CONTROLLER<any>[] = this.context
        .controllers
        .filter(f => _.isFunction((f as BASE_CONTROLLER<any>).initExampleDbData)) as any;

      for (let index = 0; index < instancesOfControllers.length; index++) {
        const controllerInstance = instancesOfControllers[index];
        await controllerInstance.initExampleDbData(this.context.workerMode);
      }
    }
  }

  private initDecoratorsFunctions() {
    this.context.initFunc.filter(e => {
      const currentCtrl = this.context.controllersClasses.find(ctrl => ctrl === e.target);
      if (currentCtrl) {
        e.initFN();

        ((controller: Function) => {

          const instance = this.context.getInstance(controller);
          const c = CLASS.getConfig(currentCtrl)[0];

          c.injections.forEach(inj => {
            Object.defineProperty(instance, inj.propertyName, { get: inj.getter as any });
          });
          // CLASS.setSing letonObj(controller, new (controller as any)());

          // Helpers.isBrowser && console.log(`[morphi] Sing leton cleated for "${controller && controller.name}"`, CLASS.getSing leton(controller))
        })(currentCtrl);

      }
    });

  }

  public activeRoutes: { routePath: string; method: Models.Rest.HttpMethod }[] = []

  private writeActiveRoutes(isWorker = false) {
    const routes = this.activeRoutes.map(({ method, routePath }) => {
      return `${method.toUpperCase()}:    ${this.context.uri.href.replace(/\/$/, '')}${routePath}`
    });
    const instanceClass = _.first(this.context.controllersClasses) as any;
    const instance = instanceClass && this.context.getInstance(instanceClass as any) as any;
    fse.writeJSONSync(path.join(process.cwd(), `tmp-routes${isWorker ? '--worker--'
      + path.basename(instance.filename).replace(/\.js$/, '')
      : ''}.json`), routes, {
      spaces: 2,
      encoding: 'utf8'
    })
  }

  private initMidleware() {
    const app = this.app;
    app.use(fileUpload())
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(methodOverride());
    app.use(cookieParser());
    app.use(cors());

    (() => {
      app.use((req, res, next) => {

        res.set('Access-Control-Expose-Headers',
          [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            SYMBOL.X_TOTAL_COUNT,
            SYMBOL.MAPPING_CONFIG_HEADER,
            SYMBOL.CIRCURAL_OBJECTS_MAP_BODY,
            SYMBOL.CIRCURAL_OBJECTS_MAP_QUERY_PARAM
          ].join(', '))
        next();
      });
    })()

  }

}
