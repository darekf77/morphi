//#region @backend
import {
  EventSubscriber
} from 'typeorm';
//#endregion

import { _ } from 'tnp-core';
import { ENDPOINT, __ENDPOINT } from '../decorators/decorators-endpoint-class';
import { BaseCRUD } from '../crud/base-crud-model';
import { classNameVlidation } from './framework-helpers';
import { Models } from '../models';
import { CLASS } from 'typescript-class-helpers';
import { FrameworkContext } from './framework-context';

const updatedWithCtrl = {};
const updatedStaticWithCtrl = {};

function getSing(target) {
  const context = FrameworkContext.findForTraget(target);
  const res = context.getInstance(target);;
  if (!res) {
    debugger
  }
  return res;
}

function updateChain(entity: Function, target: Function) {
  if (!_.isFunction(entity)) {
    return
  }
  const className = CLASS.getName(entity);

  if (updatedWithCtrl[className]) {
    console.warn(`[morphi] Property 'ctrl' already exist for ${className}`);
    try {
      Object.defineProperty(entity.prototype, 'ctrl', {
        get: function () {
          return getSing(target);
        }
      })
    } catch (error) { }
  } else {
    updatedWithCtrl[className] = true;
    Object.defineProperty(entity.prototype, 'ctrl', {
      get: function () {
        return getSing(target);
      }
    })
  }
  if (updatedStaticWithCtrl[className]) {
    console.warn(`[morphi] Static property 'ctrl' already exist for ${className}`);
    try {
      Object.defineProperty(entity, 'ctrl', {
        get: function () {
          return getSing(target);
        }
      })
    } catch (error) { }
  } else {
    updatedStaticWithCtrl[className] = true;
    Object.defineProperty(entity, 'ctrl', {
      get: function () {
        return getSing(target);
      }
    })
  }


}

export function Controller(options?: {
  className?: string;
  realtime?: boolean,
  entity?: Function,
  additionalEntities?: Function[],
  path?: string,
  autoinit?: boolean,
  //#region @backend
  auth?: Models.AuthCallBack
  //#endregion
}) {
  let { className, realtime, autoinit = false, entity, additionalEntities } = options || {} as any;

  return function (target: Function) {
    //#region @backend
    if (realtime) {
      EventSubscriber()(target)
    }
    //#endregion

    className = classNameVlidation(className, target);
    CLASS.NAME(className)(target);

    // if (Helpers.isBrowser && _.isFunction(rep)) {
    //   target = rep;
    // }


    // debugger
    if (autoinit) {
      // console.log(`AUTOINTI!!!!! Options for ${target.name}, partnt ${target['__proto__'].name}`, options)
      __ENDPOINT(target)(target)
    } else {
      // console.log(`Options for ${target.name}, partnt ${target['__proto__'].name}`, options)
      ENDPOINT(options)(target)
    }

    if (_.isArray(additionalEntities)) {
      additionalEntities.forEach(c => {
        updateChain(c, target)
      })
    }
    if (_.isFunction(entity)) {
      updateChain(entity, target);
    }
    return target as any;
  }
}

//#region @backend
export interface BASE_CONTROLLER_INIT {
  initExampleDbData?: (isWoker?: boolean) => Promise<any>;
}
//#endregion

@Controller({
  className: 'BASE_CONTROLLER',
  autoinit: true
})
export abstract class BASE_CONTROLLER<T> extends BaseCRUD<T>
  //#region @backend
  implements BASE_CONTROLLER_INIT
//#endregion
{
  /**
   * Controller entites
   */
  entites: Function[];


  //#region @backend

  // get db(): { [entities: string]: Repository<any> } {
  //   throw `db method not implemented ${CLASS.getNameFromObject(this)}`
  // }
  // get ctrl(): { [controller: string]: BASE_CONTROLLER<any> } {
  //   throw `ctrl method not implemented ${CLASS.getNameFromObject(this)}`
  // }

  async initExampleDbData(isWorker = false) {

  }

  //#endregion

}
