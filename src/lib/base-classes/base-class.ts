import { Helpers } from 'tnp-core/src';
import { EndpointContext } from '../endpoint-context';
import { Symbols } from '../symbols';
import { ClassHelpers } from '../helpers/class-helpers';
//#region @browser
import { inject } from '@angular/core';
//#endregion

export class BaseClass {
  /**
   * class initialization hook
   * firedev after class instace creation
   */
  _() {}

  /**
   * Current endpoint context
   */
  get __endpoint_context__() {
    return this[Symbols.ctxInClassOrClassObj] as EndpointContext;
  }

  /**
   * Inject: Controllers, Providers, Repositories, Services, etc.
   * TODO  addd nest js injecting
   */
  inject<T>(
    ctor: new (...args: any[]) => T,
    options?: {
      /**
       * (repositories are ONLY/ALWAYS local instances)
       * If true, then local instance will be created
       * controllers, providers can be local or global
       */
      localInstance: boolean;
      //  instanceArgs?: ConstructorParameters<typeof ctor>; .. TODO
    },
  ): T {
    if (!options) {
      options = {} as any;
    }

    const contextClassInstance = this;
    return new Proxy(
      {},
      {
        get: (_, propName) => {
          const contextFromClass: EndpointContext =
            ctor[Symbols.ctxInClassOrClassObj];

          const resultContext: EndpointContext = contextFromClass
            ? contextFromClass
            : this.__endpoint_context__;

          if (resultContext) {
            var instance: T = resultContext.inject(ctor, {
              ...options,
              contextClassInstance,
            });
            if (!instance) {
              throw new Error(
                `Not able to inject "${
                  ClassHelpers.getName(ctor) || ctor.name
                }" inside ` +
                  `property "${propName?.toString()}" on  class "${ClassHelpers.getName(
                    this,
                  )}".

              Please add "${
                ClassHelpers.getName(ctor) || ctor.name
              }" to (entites or contorllers or providers or repositories)

              `,
              );
            }

            const result =
              typeof instance[propName] === 'function'
                ? instance[propName].bind(instance)
                : instance[propName];

            // console.log(`Accessing injected "${propName?.toString()}" from "${ClassHelpers.getName(ctor) || ctor.name}"`,result)
            return result;
          }
          //#region @browser
          return inject(ctor)[propName];
          //#endregion
        },
        set: (_, propName, value) => {
          const contextFromClass = ctor[Symbols.ctxInClassOrClassObj];
          const resultContext: EndpointContext = contextFromClass
            ? contextFromClass
            : this.__endpoint_context__;
          if (resultContext) {
            var instance: T = resultContext.inject(ctor, {
              ...options,
              contextClassInstance,
            });
            if (!instance) {
              throw new Error(
                `Not able to inject "${
                  ClassHelpers.getName(ctor) || ctor.name
                }" inside ` +
                  `property "${propName?.toString()}" on  class "${ClassHelpers.getName(
                    this,
                  )}".

              Please add "${
                ClassHelpers.getName(ctor) || ctor.name
              }" to (entites or contorllers or providers or repositories)

              `,
              );
            }
          }
          instance[propName] = value;
          return true;
        },
      },
    ) as T;
  }
}
