
import * as _ from 'lodash';
import { Log } from 'ng2-logger';
import { SYMBOL } from '../symbols';
import { FormlyArrayTransformFn } from '../crud/fromly';
import { classNameVlidation } from './framework-helpers';
import { Mapping, CLASSNAME, Helpers, Models } from 'ng2-rest';


//#region @backend
import {
  InsertEvent, UpdateEvent, RemoveEvent,
  Entity as TypeormEntity, Tree
} from 'typeorm';
import { tableNameFrom } from './framework-helpers';
//#endregion
import { RealtimeBrowser } from '../realtime';
import { BaseCRUD, ModelDataConfig } from '../crud'

const log = Log.create('Framework entity')

export interface IBASE_ENTITY extends BASE_ENTITY<any> {

}

const IS_RELATIME = Symbol()

export function Entity<T = {}>(options?: {
  className?: string;
  defaultModelValues?: Mapping.ModelValue<T>;
  mapping?: Mapping.Mapping<T>;
  additionalMapping?: { [lodashPathes: string]: string | [string]; }
  tree?: 'closure-table';
  formly?: {
    transformFn?: FormlyArrayTransformFn;
    include?: (keyof T)[];
    exclude?: (keyof T)[];
  },
  //#region @backend
  createTable?: boolean;
  browserTransformFn?: (entity: T) => T
  //#endregion
}) {
  if (!options) {
    options = { formly: {} };
  }
  if (!options.formly) {
    options.formly = {}
  }
  let {
    defaultModelValues,
    tree,
    mapping,
    additionalMapping = {},
    className,
    formly: {
      transformFn = undefined,
      include = undefined,
      exclude = undefined
    } = {},
    //#region @backend
    browserTransformFn,
    createTable = true,
    //#endregion
  } = options;
  return function (target: any) {


    className = classNameVlidation(className, target);

    CLASSNAME.CLASSNAME(className)(target)
    Mapping.DefaultModelWithMapping<T>(defaultModelValues, _.merge(mapping, additionalMapping))(target)

    //#region @backend
    if (_.isFunction(browserTransformFn)) {
      const configs = Helpers.Class.getConfig(target)
      const config = _.first(configs);
      config.browserTransformFn = browserTransformFn;
      // console.log('BROWSER TRANSFORM FUNCTION ADDED TO CONFIGS', configs)
    }

    if (createTable) {
      TypeormEntity(tableNameFrom(target))(target)
    }
    target[SYMBOL.HAS_TABLE_IN_DB] = createTable;

    if (_.isString(tree)) {
      Tree("closure-table")(target)
    }
    //#endregion
  }

}

export abstract class BASE_ENTITY<T, TRAW=T, CTRL extends BaseCRUD<T> = any> {

  abstract id: number;

  /**
   * injected controller for entity for easy coding
   */
  public ctrl: CTRL;
  public static ctrl: any;

  /**
   * keep backend data here for getters, function etc
   */
  browser: IBASE_ENTITY;

  get isListeningToRealtimeChanges() {
    return !!this[IS_RELATIME];
  }
  unsubscribeRealtimeUpdates() {
    this[IS_RELATIME] = false;
    RealtimeBrowser.UnsubscribeEntityChanges(this);
  }
  subscribeRealtimeUpdates(options: {
    modelDataConfig?: ModelDataConfig,
    /**
     * Only listen realtime update when condition function  true
     */
    condition?: (entity: T) => boolean,
    /**
     * Trigers when realtime update new data.
     * This function helpse merging new entity changes.
     */
    mergeCallback?: (response: Models.HttpResponse<T>) => T | void
  } = {} as any) {
    const { modelDataConfig, mergeCallback, condition } = options;


    const changesListener = (entityToUpdate: BASE_ENTITY<any>) => {
      return async () => {
        // console.log('entity should be updated !')
        const data = await this.ctrl.getBy(entityToUpdate.id, modelDataConfig).received;
        let newData = data.body.json;
        if (_.isFunction(mergeCallback)) {
          const newDataCallaback = mergeCallback(data)
          if (!_.isUndefined(newDataCallaback)) {
            newData = newDataCallaback as any;
          }
        }
        _.merge(entityToUpdate, newData);
        if (_.isFunction(condition)) {
          const listenChanges = condition(entityToUpdate as any)
          if (!listenChanges) {
            this.unsubscribeRealtimeUpdates()
          }
        }
      }
    }

    if (this.isListeningToRealtimeChanges) {
      console.warn('Alread listen to this entiy ', this)
      RealtimeBrowser.addDupicateRealtimeEntityListener(this, changesListener(this))
      return;
    }
    this[IS_RELATIME] = true;
    RealtimeBrowser.SubscribeEntityChanges(this, changesListener(this))
  }


}


