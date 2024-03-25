import { CoreModels, _ } from 'tnp-core/src';
import { Models } from '../models';
import { CLASS } from 'typescript-class-helpers/src';
import { Models as ModelsNg2Rest } from 'ng2-rest/src';

const defaultResponseType = 'text or JSON';

function metaReq(
  method: Models.Rest.HttpMethod,
  path: string,
  target: any, propertyKey: string,
  descriptor: PropertyDescriptor,
  options: FiredevHttpDecoratorOptions) {
  const { pathIsGlobal, overrideContentType, overridResponseType } = (_.isObject(options) ? options : {}) as any as FiredevHttpDecoratorOptions;
  // const className = CLASS.getName(target.constructor);

  const config = CLASS.getConfig(target.constructor as any);
  // if (config.vChildren.length > 0) {
  // }
  config.methods[propertyKey] = (
    !config.methods[propertyKey] ? new Models.Rest.MethodConfig() : config.methods[propertyKey]
  ) as Models.Rest.MethodConfig;
  const methodConfig: Models.Rest.MethodConfig = config.methods[propertyKey];

  methodConfig.methodName = propertyKey;
  methodConfig.type = method;
  if (!path) {
    let paramsPathConcatedPath = '';
    for (const key in methodConfig.parameters) {
      if (methodConfig.parameters.hasOwnProperty(key)) {
        const element = methodConfig.parameters[key];
        if (element.paramType === 'Path' && _.isString(element.paramName) && element.paramName.trim().length > 0) {
          paramsPathConcatedPath += `/${element.paramName}/:${element.paramName}`
        }
      }
    }
    methodConfig.path = `/${propertyKey}${paramsPathConcatedPath}`
    // console.log(`Authogenerated path: `, m.path)
  } else {
    methodConfig.path = path;
  }

  methodConfig.descriptor = descriptor;
  methodConfig.global = pathIsGlobal;
  methodConfig.contentType = overrideContentType;
  methodConfig.responseType = overridResponseType;
  checkIfMethodsWithReponseTYpeAlowed(_.values(config.methods).filter(f => f !== methodConfig), methodConfig)
}

function checkIfMethodsWithReponseTYpeAlowed(methods: Models.Rest.MethodConfig[], current: Models.Rest.MethodConfig) {
  if (!current.responseType) {
    return;
  }
  for (let index = 0; index < methods.length; index++) {
    const m = methods[index];
    if (m.path === current.path && m.responseType !== current.responseType) {
      throw new Error(`
[firedev] you can have 2 methods with same path but differetn reponseType-s

        ${(m.methodName)}( ... path: ${m.path} )  -> responseType: ${m.responseType || defaultResponseType}
        ${(current.methodName)}( ... path: ${current.path} ) -> responseType: ${current.responseType}

  Please change path name on of the methods.

      `)
    }
  }
}

export interface FiredevHttpDecoratorOptions {
  path?: string;
  pathIsGlobal?: boolean;
  overrideContentType?: CoreModels.ContentType;
  overridResponseType?: ModelsNg2Rest.ResponseTypeAxios,
}


export function GET(pathOrOptions?: string | FiredevHttpDecoratorOptions, pathIsGlobal = false) {
  let obj: FiredevHttpDecoratorOptions;
  if (typeof pathOrOptions === 'object') {
    obj = pathOrOptions;
    pathOrOptions = obj.path;
    pathIsGlobal = !!obj.pathIsGlobal;
  } else {
    obj = { pathOrOptions, pathIsGlobal } as any;
  }
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    metaReq('get', pathOrOptions as string, target, propertyKey, descriptor, obj);
  }
}

export function HEAD(pathOrOptions?: string | FiredevHttpDecoratorOptions, pathIsGlobal = false) {
  let obj: FiredevHttpDecoratorOptions;
  if (typeof pathOrOptions === 'object') {
    obj = pathOrOptions;
    pathOrOptions = obj.path;
    pathIsGlobal = !!obj.pathIsGlobal;
  } else {
    obj = { pathOrOptions, pathIsGlobal } as any;
  }
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    metaReq('head', pathOrOptions as string, target, propertyKey, descriptor, obj);
  }
}

export function POST(pathOrOptions?: string | FiredevHttpDecoratorOptions, pathIsGlobal = false) {
  let obj: FiredevHttpDecoratorOptions;
  if (typeof pathOrOptions === 'object') {
    obj = pathOrOptions;
    pathOrOptions = obj.path;
    pathIsGlobal = !!obj.pathIsGlobal;
  } else {
    obj = { pathOrOptions, pathIsGlobal } as any;
  }
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    metaReq('post', pathOrOptions as string, target, propertyKey, descriptor, obj);
  }
}

export function PUT(pathOrOptions?: string | FiredevHttpDecoratorOptions, pathIsGlobal = false) {
  let obj: FiredevHttpDecoratorOptions;
  if (typeof pathOrOptions === 'object') {
    obj = pathOrOptions;
    pathOrOptions = obj.path;
    pathIsGlobal = !!obj.pathIsGlobal;
  } else {
    obj = { pathOrOptions, pathIsGlobal } as any;
  }
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    metaReq('put', pathOrOptions as string, target, propertyKey, descriptor, obj);
  }
}

export function PATCH(pathOrOptions?: string | FiredevHttpDecoratorOptions, pathIsGlobal = false) {
  let obj: FiredevHttpDecoratorOptions;
  if (typeof pathOrOptions === 'object') {
    obj = pathOrOptions;
    pathOrOptions = obj.path;
    pathIsGlobal = !!obj.pathIsGlobal;
  } else {
    obj = { pathOrOptions, pathIsGlobal } as any;
  }
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    metaReq('patch', pathOrOptions as string, target, propertyKey, descriptor, obj);
  }
}

export function DELETE(pathOrOptions?: string | FiredevHttpDecoratorOptions, pathIsGlobal = false) {
  let obj: FiredevHttpDecoratorOptions;
  if (typeof pathOrOptions === 'object') {
    obj = pathOrOptions;
    pathOrOptions = obj.path;
    pathIsGlobal = !!obj.pathIsGlobal;
  } else {
    obj = { pathOrOptions, pathIsGlobal } as any;
  }
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    metaReq('delete', pathOrOptions as string, target, propertyKey, descriptor, obj);
  }
}
