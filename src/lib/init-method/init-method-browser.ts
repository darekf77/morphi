//#region imports
import { SYMBOL } from '../symbols';
import { _ } from 'tnp-core/src';
import { Models } from '../models';
import { Resource, Rest, RestHeaders } from 'ng2-rest/src';
import { Models as Ng2RestModels } from 'ng2-rest/src';
import { Helpers } from 'tnp-core/src';
import { MorphiHelpers } from '../helpers';
import { FrameworkContext } from '../framework/framework-context';
import { from, Observable, Subject } from 'rxjs';
import { CLASS } from 'typescript-class-helpers/src';
//#endregion

export function initMethodBrowser(
  //#region parameters
  target: Function,
  type: Models.Rest.HttpMethod,
  methodConfig: Models.Rest.MethodConfig,
  expressPath: string,
  //#endregion
)
// : { received: any; /* Rest<any, any>  */ }
 {

  //#region resolve storage
  let storage: any;
  if (Helpers.isBrowser) {
    storage = window;
  }
  //#region @backend
  if (Helpers.isNode) {
    storage = global;
  }
  //#endregion
  //#endregion

  const context = FrameworkContext.findForTraget(target);
  const uri: URL = context.uri;

  //#region handling web sql request
  //#region @websqlOnly

  //#region resolve variables
  const MIN_TIMEOUT = 500;
  const MIN_TIMEOUT_STEP = 200;
  const timeout = window[SYMBOL.WEBSQL_REST_PROGRESS_TIMEOUT] || MIN_TIMEOUT;

  let updateFun: Subject<number> = window[SYMBOL.WEBSQL_REST_PROGRESS_FUN];
  if (!window[SYMBOL.WEBSQL_REST_PROGRESS_FUN]) {
    window[SYMBOL.WEBSQL_REST_PROGRESS_FUN] = new Subject();
  }
  updateFun = window[SYMBOL.WEBSQL_REST_PROGRESS_FUN];

  let startFun: Subject<void> = window[SYMBOL.WEBSQL_REST_PROGRESS_FUN_START];
  if (!window[SYMBOL.WEBSQL_REST_PROGRESS_FUN_START]) {
    window[SYMBOL.WEBSQL_REST_PROGRESS_FUN_START] = new Subject();
  }
  startFun = window[SYMBOL.WEBSQL_REST_PROGRESS_FUN_START];

  let doneFun: Subject<void> = window[SYMBOL.WEBSQL_REST_PROGRESS_FUN_DONE];
  if (!window[SYMBOL.WEBSQL_REST_PROGRESS_FUN_DONE]) {
    window[SYMBOL.WEBSQL_REST_PROGRESS_FUN_DONE] = new Subject();
  }
  doneFun = window[SYMBOL.WEBSQL_REST_PROGRESS_FUN_DONE];

  let periodsToUpdate = 0;
  if (timeout >= MIN_TIMEOUT) {
    periodsToUpdate = Math.floor(timeout / MIN_TIMEOUT_STEP);
  }
  //#endregion

  //#region web sql periods to wait
  const periods = async () => {
    startFun.next();
    for (let n = 1; n <= periodsToUpdate; n++) {
      // if (n === 0) {
      // updateFun.next(0)
      // } else {
      let upValue = Math.round(((MIN_TIMEOUT_STEP * n) / timeout) * 100);
      if (upValue > 100) {
        upValue = 100;
      }
      // console.log(`ping upValue: ${upValue}`)
      updateFun.next(upValue);
      // }
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(void 0);
        }, MIN_TIMEOUT_STEP)
      })
      // console.log('pong')
    }
    doneFun.next();
  }
  //#endregion

  const orgMethods = target.prototype[methodConfig.methodName];

  target.prototype[methodConfig.methodName] = function (...args) {
    // if (!target.prototype[methodConfig.methodName][subjectHandler]) {
    //   target.prototype[methodConfig.methodName][subjectHandler] = new Subject();
    // }
    const received = new Promise(async (resolve, reject) => {
      const headers = {};
      const { request, response } = websqlMocks(headers)

      let res: any;
      try {
        res = await Helpers.runSyncOrAsync({
          functionFn: orgMethods,
          context: this,
          arrayOfParams: args
        });
        // console.log({ res1: res })
        if (typeof res === 'function') {
          res = await Helpers.runSyncOrAsync({
            functionFn: res,
            context: this,
            arrayOfParams: [request, response]
          });
        }
        // console.log({ res2: res })
        if (typeof res === 'function') {
          res = await Helpers.runSyncOrAsync({
            functionFn: res,
            context: this,
            arrayOfParams: [request, response]
          });
        }
        // console.log({ res3: res })

        if ((typeof res === 'object') && res?.received) {
          res = await res.received;
        }

        const body = res;

        res = new Ng2RestModels.HttpResponse({
          body: void 0,
          isArray: void 0 as any,
          method: methodConfig.type,
          url: `${uri.origin}${'' // TODO express path
            }${methodConfig.path}`
        },
          (Helpers.isBlob(body) || _.isString(body)) ? body : JSON.stringify(body),
          RestHeaders.from(headers),
          void 0,
          () => body,
        );

        // @LAST blob should be blob not json
        // console.log('NEXT', res);
        // target.prototype[methodConfig.methodName][subjectHandler].next(res);

        await periods();
        resolve(res);
      } catch (error) {
        await periods();
        console.error(error)
        // error = new Ng2RestModels.HttpResponseError('Error during websql request',
        //   JSON.stringify(error));
        // target.prototype[methodConfig.methodName][subjectHandler].error(error);
        reject(error);


      }
    });
    received['observable'] = from(received);
    // debugger
    if (Helpers.isWebSQL) {
      return {
        received
      }
    }

  }
  if (Helpers.isWebSQL) {
    return;
  }
  //#endregion

  //#endregion

  // FRONTEND PATHES
  // console.log(`FRONTEND ${target.name} method on ${expressPath}`)

  target.prototype[methodConfig.methodName] = function (...args) {
    // console.log('[init method browser] FRONTEND expressPath', expressPath)
    // const productionMode = FrameworkContext.isProductionMode;

    //#region resolve frontend parameters

    if (!storage[SYMBOL.ENDPOINT_META_CONFIG]) storage[SYMBOL.ENDPOINT_META_CONFIG] = {};
    if (!storage[SYMBOL.ENDPOINT_META_CONFIG][uri.href]) storage[SYMBOL.ENDPOINT_META_CONFIG][uri.href] = {};
    const endpoints = storage[SYMBOL.ENDPOINT_META_CONFIG];
    let rest: Ng2RestModels.ResourceModel<any, any>;
    if (!endpoints[uri.href][expressPath]) {
      let headers = {};
      if (methodConfig.contentType && !methodConfig.responseType) {
        rest = Resource.create(uri.href, expressPath, SYMBOL.MAPPING_CONFIG_HEADER as any,
          SYMBOL.CIRCURAL_OBJECTS_MAP_BODY as any,
          RestHeaders.from({
            'Content-Type': methodConfig.contentType,
            'Accept': methodConfig.contentType,
          }),
        );
      } else if (methodConfig.contentType && methodConfig.responseType) {
        rest = Resource.create(uri.href, expressPath, SYMBOL.MAPPING_CONFIG_HEADER as any,
          SYMBOL.CIRCURAL_OBJECTS_MAP_BODY as any,
          RestHeaders.from({
            'Content-Type': methodConfig.contentType,
            'Accept': methodConfig.contentType,
            'responsetypeaxios': methodConfig.responseType
          }),
        );
      } else if (!methodConfig.contentType && methodConfig.responseType) {
        rest = Resource.create(uri.href, expressPath, SYMBOL.MAPPING_CONFIG_HEADER as any,
          SYMBOL.CIRCURAL_OBJECTS_MAP_BODY as any,
          RestHeaders.from({
            'responsetypeaxios': methodConfig.responseType
          }),
        );
      } else {
        rest = Resource.create(uri.href, expressPath, SYMBOL.MAPPING_CONFIG_HEADER as any,
          SYMBOL.CIRCURAL_OBJECTS_MAP_BODY as any,
        );
      }

      endpoints[uri.href][expressPath] = rest;
    } else {
      rest = endpoints[uri.href][expressPath] as any;
    }

    const method = type.toLowerCase();
    const isWithBody = (method === 'put' || method === 'post');
    const pathPrams = {};
    let queryParams = {};
    let bodyObject = {};
    args.forEach((param, i) => {
      let currentParam: Models.Rest.ParamConfig = void 0 as any;

      for (let pp in methodConfig.parameters) {
        let v = methodConfig.parameters[pp];
        if (v.index === i) {
          currentParam = v;
          break;
        }
      }


      if (currentParam.paramType === 'Path') {
        pathPrams[currentParam.paramName] = param;
      }
      if (currentParam.paramType === 'Query') {
        if (currentParam.paramName) {
          const mapping = MorphiHelpers.Mapping.decode(param, !FrameworkContext.isProductionMode);
          if (mapping) {
            rest.headers.set(
              `${SYMBOL.MAPPING_CONFIG_HEADER_QUERY_PARAMS}${currentParam.paramName}`,
              JSON.stringify(mapping))
          }
          queryParams[currentParam.paramName] = param;
        } else {
          const mapping = MorphiHelpers.Mapping.decode(param, !FrameworkContext.isProductionMode);
          if (mapping) {
            rest.headers.set(
              SYMBOL.MAPPING_CONFIG_HEADER_QUERY_PARAMS,
              JSON.stringify(mapping))
          }
          queryParams = _.cloneDeep(param);
        }
      }
      if (currentParam.paramType === 'Header') {
        if (currentParam.paramName) {
          if (currentParam.paramName === SYMBOL.MDC_KEY) { // parese MDC
            rest.headers.set(currentParam.paramName, encodeURIComponent(JSON.stringify(param)))
          } else {
            rest.headers.set(currentParam.paramName, param)
          }
        } else {
          for (let header in param) {
            rest.headers.set(header, param[header])
          }
        }
      }
      if (currentParam.paramType === 'Cookie') {
        Resource.Cookies.write(currentParam.paramName, param, currentParam.expireInSeconds);
      }
      if (currentParam.paramType === 'Body') {
        if (currentParam.paramName) {
          if (CLASS.getNameFromObject(bodyObject) === 'FormData') {
            throw new Error(`[firedev-framework] Don use param names when posting/putting FormData.
            Use this:
            // ...
            (@Firedev.Http.Param.Body() formData: FormData) ...
            // ...

            instead
            // ...
            (@Firedev.Http.Param.Body('${currentParam.paramName}') formData: FormData) ...
            // ...
            `)
          }
          const mapping = MorphiHelpers.Mapping.decode(param, !FrameworkContext.isProductionMode);
          if (mapping) {
            rest.headers.set(
              `${SYMBOL.MAPPING_CONFIG_HEADER_BODY_PARAMS}${currentParam.paramName}`,
              JSON.stringify(mapping))
          }
          bodyObject[currentParam.paramName] = param;
        } else {
          const mapping = MorphiHelpers.Mapping.decode(param, !FrameworkContext.isProductionMode);
          if (mapping) {
            rest.headers.set(
              SYMBOL.MAPPING_CONFIG_HEADER_BODY_PARAMS,
              JSON.stringify(mapping))
          }
          bodyObject = param;
        }
      }
    });

    if (typeof bodyObject === 'object' && (CLASS.getNameFromObject(bodyObject) !== 'FormData')) {
      let circuralFromItem = []
      bodyObject = MorphiHelpers.JSON.parse(MorphiHelpers.JSON.stringify(bodyObject, void 0, void 0, circs => {
        // @ts-ignore
        circuralFromItem = circs;
      }))
      rest.headers.set(
        SYMBOL.CIRCURAL_OBJECTS_MAP_BODY,
        JSON.stringify(circuralFromItem)
      )
    }

    if (typeof queryParams === 'object') {
      let circuralFromQueryParams = []
      queryParams = MorphiHelpers.JSON.parse(MorphiHelpers.JSON.stringify(queryParams, void 0, void 0, circs => {
        // @ts-ignore
        circuralFromQueryParams = circs;
      }))

      rest.headers.set(
        SYMBOL.CIRCURAL_OBJECTS_MAP_QUERY_PARAM,
        JSON.stringify(circuralFromQueryParams))
    }
    //#endregion

    return {
      received: isWithBody ? rest.model(pathPrams)[method](bodyObject, [queryParams]) : rest.model(pathPrams)[method]([queryParams])
    }
  };
}



//#region @websqlOnly
function websqlMocks(headers) {

  const response: Express.Response = {

     status(status: any) {
      // console.log({status})
      return {
        send(send: any) {
          // console.log({status})
        }
      }
    },
    setHeader(key: string, value: any) {
      // console.log('Dummy set header', arguments)
      headers[key] = value;
    }
  };
  const request: Express.Request = {

  };
  return { request, response }
}
//#endregion
