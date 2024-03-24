//#region imports
import { Helpers, _, crossPlatformPath } from 'tnp-core/src';
//#region @websql
import { path } from 'tnp-core/src';
//#endregion
//#region @backend
import {
  fse
} from 'tnp-core/src';
//#endregion

import * as JSON5 from 'json5';
import { Helpers as HelpersNg2Rest } from 'ng2-rest/src';
import { Models } from './models';

//#region @websql
import type { Response as ExpressResponse, Request as ExpressRequest } from 'express';
//#endregion
import { CLASS } from 'typescript-class-helpers/src';
//#endregion

export class MorphiHelpers extends HelpersNg2Rest {

  //#region static

  //#region static / string operations
  static string(s: string) {
    return {
      fillUpTo(nCharacters: number) {
        return _.times(nCharacters, n => {
          if (s.charAt(n)) {
            return s.charAt(n);
          }
          return ' ';
        }).join('')
      }
    }
  }
  //#endregion

  //#region static / is good path
  static isGoodPath(p: string) {
    return p && typeof p === 'string' && p.trim() !== ''
  }
  //#endregion

  //#region static / get path for
  static getPathFor(target: Function) {
    const configs = CLASS.getConfigs(target) as any[];
    // console.log(`Class config for ${CLASS.getName(target)}`, configs)
    const classConfig: Models.Rest.ClassConfig = configs[0];
    const parentscalculatedPath = _
      .slice(configs, 1)
      .reverse()
      .map(bc => {
        if (MorphiHelpers.isGoodPath(bc.path)) {
          return bc.path
        }
        return CLASS.getName(bc.classReference);
      }).join('/');

    return `/${parentscalculatedPath}/${CLASS.getName(target)}`;
  }
  //#endregion

  //#region static / has parent class with name
  static hasParentClassWithName(target: Function, name: string, targets = []): boolean {
    if (!target) {
      // console.log(`false "${_.first(targets).name}" for ${targets.map(d => d.name).join(',')}`)
      return false;
    }
    targets.push(target)
    let targetProto = target['__proto__'] as Function;
    if (_.isFunction(targetProto) && CLASS.getName(targetProto) === name) {
      // console.log(`true  "${_.first(targets).name}" for ${targets.map(d => d.name).join(',')}`)
      return true;
    }
    return this.hasParentClassWithName(targetProto, name, targets);
  }
  //#endregion

  //#region static / try transform param
  static tryTransformParam(param) {
    if (typeof param === 'string') {
      let n = Number(param);
      if (!isNaN(n)) return n;
      const bool = param.trim().toLowerCase();
      if (bool === 'true') {
        return true;
      }
      if (bool === 'false') {
        return false;
      }
      try {
        const t = JSON5.parse(param);
        return t;
      } catch (e) {
        return param;
      }
    }
    return param;
  }
  //#endregion

  //#region static / get express path
  static getExpressPath(c: Models.Rest.ClassConfig, pathOrClassConfig: Models.Rest.MethodConfig | string) {
    if (typeof pathOrClassConfig === 'string') return `${c.calculatedPath}${pathOrClassConfig}`.replace(/\/$/, '')
    return `${c.calculatedPath}${pathOrClassConfig.path}`.replace(/\/$/, '')
  }
  //#endregion

  //#region static / default type
  static defaultType(value) {
    if (typeof value === 'string') return '';
    if (typeof value === 'boolean') return false;
    if (Array.isArray(value)) return {};
    if (typeof value === 'object') return {};
  }
  //#endregion

  //#region static / parse json with string jsons
  static parseJSONwithStringJSONs(object: Object, waring = false): Object {
    // console.log('checking object', object)
    if (!_.isObject(object)) {
      if (waring) {
        console.error(`
        parseJSONwithStringJSONs(...)
        Parameter should be a object, but is ${typeof object}
        `, object)
      }

      return object;
    }

    let res = _.cloneDeep(object);

    Object.keys(res).forEach(key => {
      let isJson = false;
      try {
        const possibleJSON = JSON.parse(res[key]);
        res[key] = possibleJSON;
        isJson = true;
      } catch (e) {
        isJson = false;
      }
      // console.log(`key ${key} is json `, isJson)
      if (isJson) {
        res[key] = this.parseJSONwithStringJSONs(res[key], false)
      }
    });

    return res;
  }
  //#endregion

  //#region static / get response value
  //#region @websql

  static getResponseValue<T>(response: Models.Response<T>, options?: { req: ExpressRequest, res: ExpressResponse }): Promise<T> {
    //#region @websqlFunc
    const { req, res } = options || {};
    return new Promise<T>(async (resolve, reject) => {
      //#region @websql
      const resp: Models.__Response<T> = response;
      if (!response && response.send === undefined) {
        console.error('[firedev] Bad response value for function');
        resolve(undefined);
      }
      else if (typeof response === 'function') {
        const asyncResponse: Models.AsyncResponse<T> = response as any;
        try {
          const result = await asyncResponse(req, res);
          resolve(result as any);
        } catch (e) {
          console.error('[firedev] Error during function call inside controller')
          Helpers.renderError(e);
          reject(e);
        }
      } else if (typeof response === 'object') {
        try {
          if (typeof response.send === 'function') {
            const result = (response as any).send(req, res) as any
            resolve(result)
          } else {
            resolve(response.send as any)
          }
        } catch (error) {
          console.error('[firedev] Bad synchonus function call ')
          Helpers.renderError(error);
          reject(error);
        }
      } else reject(`[firedev] Not recognized type of reposne ${response}`);
      //#endregion
    });
    //#endregion
  }
  //#endregion
  //#endregion

  //#region static / is plain file or folder
  //#region @websql
  static isPlainFileOrFolder(filePath) {
    return /^([a-zA-Z]|\-|\_|\@|\#|\$|\!|\^|\&|\*|\(|\))+$/.test(filePath);
  }
  //#endregion
  //#endregion

  //#endregion

}
