export { Models } from './models';
//#region @browser
export { RepeatTypeComponent } from './crud/formly-repeat-component';
export { FormlyHorizontalWrapper } from './crud/formly-group-wrapper-component';
//#endregion
import { Observable, Subject } from 'rxjs';

export { Log, Level } from 'ng2-logger/src';

import { _, Utils } from 'tnp-core/src';
import * as crudMorph from './crud';
import * as decoratorsMorphi from './decorators';
import * as framework from './framework';
import * as realtime from './realtime';
import * as models from './models';
import * as sym from './symbols';
import { Helpers } from 'tnp-core/src';
import { FrameworkContext } from './framework/framework-context';
export { FrameworkContext } from './framework/framework-context';
import * as context from './framework/framework-context';
import { MorphiHelpers } from './helpers';

//#region @websql
import * as tsorm from 'firedev-typeorm/src'
//#endregion

//#region @backend
import { generate as generateHash } from 'password-hash';
import * as pass from 'passport';
import { Handler } from 'express'
//#endregion


let generate
  //#region @backend
  = generateHash;
//#endregion

//#region @websqlOnly
// @ts-ignore
generate = () => { }
//#endregion


//#region @websql
import { Repository } from 'firedev-typeorm/src';
//#endregion

export class TypeormRepository<T>
  //#region @websql
  extends Repository<T>
//#endregion
{

}


export namespace Morphi {
  export const symbols = sym.SYMBOL;
  export const IsNode = Helpers.isNode;
  export const IsBrowser = Helpers.isBrowser;
  export function initNgZone(ngZone: any) {
    context.FrameworkContext.initNGZone(ngZone);
  }

  /**
   * Function only for websql mode
   */
  export const anyContextLoaded = () => {
    //#region @browser
    let obs: Subject<boolean>;
    if (!window['firedev']['contextLoaded']) {
      obs = new Subject<boolean>();
      window['firedev']['contextLoaded'] = obs;
    } else {
      obs = window['firedev']['contextLoaded'];
    }
    setTimeout(() => {
      obs.next(!!obs['anyContextLoaded']);
    })
    return obs.asObservable();
    //#endregion
  }

  export const isNode = Helpers.isNode;
  export const isBrowser = Helpers.isBrowser;
  export import FrameworkContext = context.FrameworkContext;
  export function destroyContext(contextOrHost: FrameworkContext | string) {
    if (_.isString(contextOrHost)) {
      Helpers.log(`[Firedev] Destroying context by host: ${contextOrHost}`)
      const context = FrameworkContext.findByHost(contextOrHost);
      if (!context) {
        Helpers.log(`[Firedev] no context to delete by host: "${contextOrHost}"`);
        return;
      }
      contextOrHost = context;
    }
    FrameworkContext.destroy(contextOrHost);
  }

  export function getHttpPathBy<T = Function>(classFn: new () => T, port: number, method: (keyof T)) {
    return `http://localhost:${port}${MorphiHelpers.getPathFor(classFn as any)}/${method as any}`;
  }

  /**
   * Header name for model data config
   */
  export const MDC_KEY = sym.SYMBOL.MDC_KEY;
  export const Platform = IsNode ? 'node' : 'browser';

  // export const Providers: Function[] = FrameworkContext.Providers;

  export import Response = models.Models.Response;

  export function enableProductionMode() {
    FrameworkContext.isProductionMode = true;
  }

  export import Controller = framework.Controller;
  export import Entity = framework.Entity;
  //#region @websql
  export type Session = {
    [additionalvalues: string]: any;
    destroy: () => void;
    save: () => void;
    reload: () => void;
    id: string;
    token: string;
    req: any;
    userId: number | string;
    cookie: any;
  };

  export import BASE_CONTROLLER_INIT = framework.BASE_CONTROLLER_INIT;
  export import Repository = framework.Repository;
  export const getResponseValue = MorphiHelpers.getResponseValue;

  // export const authenticate = pass.authenticate
  //#endregion
  export import init = framework.start;
  export import InitOptions = framework.StartOptions;
  export import IConnectionOptions = framework.IConnectionOptions;
  export import SYMBOL = sym.SYMBOL;



  export namespace Realtime {
    export namespace Browser {

      export const listenChangesTableEntity = realtime.RealtimeBrowserRxjs.listenChangesEntityTable;
      export const listenChangesEntity = realtime.RealtimeBrowserRxjs.listenChangesEntity;
      export const listenChangesEntityObj = realtime.RealtimeBrowserRxjs.listenChangesEntityObj


      // export const stopListenChangesEntity = realtime.RealtimeBrowserRxjs.listenChangesEntity;
      // export const stopListenChangesEntityObj = realtime.RealtimeBrowserRxjs.listenChangesEntityObj
      // export const SubscribeEntity = realtime.RealtimeBrowser.SubscribeEntity;
      // export const SubscribeEntityChanges = realtime.RealtimeBrowser.SubscribeEntityChanges;
      // export const SubscribeEntityPropertyChanges = realtime.RealtimeBrowser.SubscribeEntityPropertyChanges;
      // export const UnsubscribeEverything = realtime.RealtimeBrowser.UnsubscribeEverything;
      // export const UnsubscribeEntityChanges = realtime.RealtimeBrowser.UnsubscribeEntityChanges;
      // export const UnsubscribeEntityPropertyChanges = realtime.RealtimeBrowser.UnsubscribeEntityPropertyChanges;
    }

    //#region @websql
    export namespace Server {
      export const TrigggerEntityTableChanges = realtime.RealtimeNodejs.TrigggerEntityTableChanges;
      export const TrigggerEntityChanges = realtime.RealtimeNodejs.TrigggerEntityChanges;
      export const TrigggerEntityPropertyChanges = realtime.RealtimeNodejs.TrigggerEntityPropertyChanges;
    }
    //#endregion
  }

  export namespace CRUD {
    export import Base = crudMorph.BaseCRUD;
    //#region @websql
    export import DB = crudMorph.DbCrud;
    //#endregion
  }

  export namespace Formly {
    export import getFrom = crudMorph.getFromlyConfigFor;
    export import RegisterComponentForEntity = crudMorph.RegisterComponentTypeForEntity;
  }

  export namespace Base {
    export import Controller = framework.BASE_CONTROLLER;
    export import Entity = framework.BASE_ENTITY;
    //#region @websql
    export import Repository = framework.BASE_REPOSITORY;
    //#endregion
  }

  export namespace Http {
    export import GET = decoratorsMorphi.GET;
    export import POST = decoratorsMorphi.POST;
    export import PUT = decoratorsMorphi.PUT;
    export import DELETE = decoratorsMorphi.DELETE;
    export import PATCH = decoratorsMorphi.PATCH;
    export import HEAD = decoratorsMorphi.HEAD;
    export namespace Param {
      export import Query = decoratorsMorphi.Query;
      export import Path = decoratorsMorphi.Path;
      export import Body = decoratorsMorphi.Body;
      export import Cookie = decoratorsMorphi.Cookie;
      export import Header = decoratorsMorphi.Header;
    }
    export namespace Resopnse {
      export import Success = models.Models.Rest.HttpResponse;
      export import Error = models.Models.Rest.HttpResponseError;
    }
  }


  export namespace Websql {
    export function useFakeTimeout(miliseconds: number) {
      //#region @browser
      window[sym.SYMBOL.WEBSQL_REST_PROGRESS_TIMEOUT] = miliseconds;
      //#endregion
    }
  }

  export namespace Auth {
    //#region @websql
    export namespace Password {
      export namespace Hash {
        export const Generate = generate;
      }
    }
    //#endregion
  }


  /**
   * Check typeorm
   * https://typeorm.io
   */
  export namespace Orm {
    export const Repository = TypeormRepository;
    //#region @websql
    export import getConnection = tsorm.getConnection;
    export import Errors = models.Models.Errors;
    export import Connection = tsorm.Connection;
    export import TableNameFrom = framework.tableNameFrom;
    export import RepositoryFrom = framework.repositoryFrom
    export namespace ListenEvent {
      export import AfterInsert = tsorm.AfterInsert;
      export import AfterLoad = tsorm.AfterLoad;
      export import AfterRecover = tsorm.AfterRecover;
      export import AfterRemove = tsorm.AfterRemove;
      export import AfterSoftRemove = tsorm.AfterSoftRemove;
      export import AfterUpdate = tsorm.AfterUpdate;
      export import BeforeInsert = tsorm.BeforeInsert;
      export import BeforeRecover = tsorm.BeforeRecover;
      export import BeforeRemove = tsorm.BeforeRemove;
      export import BeforeSoftRemove = tsorm.BeforeSoftRemove;
      export import BeforeUpdate = tsorm.BeforeUpdate;
    }

    export namespace Tree {
      export import Children = tsorm.TreeChildren;
      export import Parent = tsorm.TreeParent;
    }
    export namespace Column {
      export import Generated = tsorm.PrimaryGeneratedColumn;
      export import Primary = tsorm.PrimaryColumn;
      export import Index = tsorm.Index;
      export import CreateDate = tsorm.CreateDateColumn;
      export import UpdateDate = tsorm.UpdateDateColumn
      export import DeleteDate = tsorm.DeleteDateColumn
      export import Custom = tsorm.Column;
      export const SimpleJson = () => tsorm.Column({ type: 'simple-json', nullable: true });

      export const Boolean = (defaultValue: boolean) => tsorm.Column({ type: 'boolean', default: defaultValue });

      // TODO has limitation => comma in name
      // export const SimpleArray = () => tsorm.Column({ type: 'simple-array', nullable: true });
      export import Version = tsorm.VersionColumn;
      export import Virtual = tsorm.VirtualColumn;
    }

    export namespace Join {
      export import Table = tsorm.JoinTable;
      export import Column = tsorm.JoinColumn;
    }
    export namespace Relation {
      export import OneToMany = tsorm.OneToMany;
      export import OneToOne = tsorm.OneToOne;
      export import ManyToMany = tsorm.ManyToMany;
      export import ManyToOne = tsorm.ManyToOne;
    }
    //#endregion
  }



}
