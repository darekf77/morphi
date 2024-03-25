import { FormlyFieldConfig } from '@ngx-formly/core';
import { _ } from 'tnp-core/src';
import { Mapping } from 'ng2-rest/src';
import { findTypeForEntity } from './type-from-entity';
import { CLASS } from 'typescript-class-helpers/src';
import { CoreModels } from 'tnp-core/src';
import { FormlyInputType } from './formly.models';

export function getFromlyConfigFor(
  target: Function,
  options: {
    formType?: CoreModels.UIFramework;
    keysPathesToInclude?: string[];
    keysPathesToExclude?: string[];
    parentModel?: string;
    relativePath?: string;
    level?: number;
    maxLevel?: number;
  } = {}
) {
  const { formType = 'material', keysPathesToExclude = [], keysPathesToInclude = [],
    parentModel, relativePath = '', level = 0, maxLevel = 4,
  } = options;


  if (level === maxLevel) {
    return [];
  }

  const mapping: Mapping.Mapping = Mapping.getModelsMapping(target);
  // console.log('mapping', mapping)
  const fieldNames = CLASS.describeProperites(target);
  const checkExclude = (_.isArray(keysPathesToExclude) && keysPathesToExclude.length > 0);
  const checkInclude = (_.isArray(keysPathesToInclude) && keysPathesToInclude.length > 0);
  if (checkExclude && checkInclude) {
    throw new Error(`In Firedev function getFromlyConfigFor(...) please use keysPathesToInclude or keysPathesToExclude, `)
  }
  // if (checkInclude) {
  //   console.log('check include', keysPathesToExclude)
  // }

  // if (checkExclude) {
  //   console.log('check exclude', keysPathesToExclude)
  // }

  let fields: FormlyFieldConfig[] = [];

  //#region input to push
  function inputToPush(key: string, type: FormlyInputType, model: string,
    inptToPushOptions?: {
      targetChild?: Function,
      selectOptions?: any[],
    }) {
    const { targetChild, selectOptions } = inptToPushOptions || {};
    // console.log(`key(${key}) type: ${type} | model: ${model} targetChild: ${targetChild && targetChild.name}`)
    let res: FormlyFieldConfig;
    if (type === 'repeat') {
      const fieldGroup = getFromlyConfigFor(targetChild,
        {
          formType, keysPathesToInclude, keysPathesToExclude,
          relativePath: `${relativePath}.${key}`,
          level: (level + 1), maxLevel
        })
      if (fieldGroup.length > 0) {
        res = {
          key,
          type,
          defaultValue: [],
          fieldArray: {
            fieldGroupClassName: 'row',
            templateOptions: {
              label: `Add new ${_.startCase(key)}`
            },
            fieldGroup
          }
        }
      }

    } else if (type === 'group') {
      const fieldGroup = getFromlyConfigFor(targetChild,
        {
          formType, keysPathesToInclude, keysPathesToExclude, parentModel: model,
          relativePath: `${relativePath}.${key}`,
          level: (level + 1), maxLevel
        })
      if (fieldGroup.length > 0) {
        res = {
          fieldGroupClassName: 'row',
          templateOptions: {
            label: `${_.startCase(key)}`
          },
          wrappers: ['groupwrap'],
          fieldGroup
        }
      }
    } else {
      res = {
        key,
        model,
        type,
        defaultValue: !_.isUndefined(target.prototype[key]) ? target.prototype[key] : undefined,
        templateOptions: {
          label: _.isString(model) ? `${model.split('.').map(l => _.startCase(l)).join(' / ')} / ${_.startCase(key)}`
            : _.startCase(key),
          options: selectOptions,
        }
      }
    }
    if (res) {
      Object.keys(res).forEach(key => res[key] === undefined ? delete res[key] : '');
    }
    return res;
  }
  //#endregion

  //#region is allowed path
  function isAlowedPath(key: string) {
    let isAlowed = true;
    const matchPath = relativePath === '' ? key : `${relativePath}:${key}`
    if (checkExclude) {
      if (keysPathesToExclude.includes(matchPath)) {
        // console.log(`Not allowed key: ${key}`)
        isAlowed = false;
      } else {
        isAlowed = true;
      }
    } else if (checkInclude) {
      if (keysPathesToInclude.includes(matchPath)) {
        // console.log(`Allowed key: ${key}`)
        isAlowed = true;
      } else {
        isAlowed = false;
      }
    }
    // console.log(`Is allowed;${matchPath} `, isAlowed)
    return isAlowed;
  }
  //#endregion

  const simpleResolved = []

  //#region resolve simple types
  function resolveSimpleTypes() {

    for (const key in target.prototype) {
      if (target.prototype.hasOwnProperty(key) && !_.isFunction(target.prototype[key])) {

        if (!isAlowedPath(key)) {
          continue;
        }

        if (!_.isUndefined(mapping[key])) {
          continue;
        }

        const element = target.prototype[key];
        let type: FormlyInputType = 'input';
        if (_.isBoolean(element)) {
          type = 'switch'
        } else if (_.isDate(element)) {
          type = 'datepicker'
        } else if (_.isFunction(target['getOptionsFor'])) {
          var selectOptions = target['getOptionsFor'](key);
          if (!_.isUndefined(selectOptions)) {
            type = 'select'
          }
        } else if (_.isFunction(target.prototype?.getOptionsFor)) {
          var selectOptions = target.prototype?.getOptionsFor(key);
          if (!_.isUndefined(selectOptions)) {
            type = 'select'
          }
        }
        fields.push(inputToPush(key, type, parentModel, { selectOptions }))
        simpleResolved.push(key)
      }
    }
  }
  //#endregion

  //#region resolve complex types
  function resolveComplexTypes() {

    fieldNames
      .filter(key => !simpleResolved.includes(key))
      .forEach(key => {

        if (isAlowedPath(key) && !_.isUndefined(mapping[key])) {
          let className = mapping[key]
          const isArray = _.isArray(className)
          className = isArray ? _.first(className) : className;

          if (className === 'Date') {
            fields.push(inputToPush(key, 'datepicker', parentModel))
          } else {
            const targetChild = CLASS.getBy(className);

            if (targetChild) {


              const ftype = findTypeForEntity(targetChild, isArray);

              if (ftype) {
                fields = fields.concat(inputToPush(key, ftype.name as any, key))
              } else {
                if (isArray) {
                  fields = fields.concat(inputToPush(key, 'repeat', key, { targetChild }))
                } else {
                  fields = fields.concat(inputToPush(key, 'group', key, { targetChild }))
                }
              }

            }
          }

        }
      });
  }
  //#endregion

  function generate() {
    resolveSimpleTypes();
    // console.log('after simple', fields);
    resolveComplexTypes()
    // console.log('after complext', fields);
  }

  generate()
  return fields.filter(f => !!f);
}

export type FormlyArrayTransformFn =
  (fieldsArray: FormlyFieldConfig[],
    fieldObject?: { [propKey: string]: FormlyFieldConfig })
    => FormlyFieldConfig[]
