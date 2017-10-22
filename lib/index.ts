// tslint:disable: member-access member-ordering
import tsfmt = require('typescript-formatter')
import meta = require('./meta')

class Emitter {
  def = ''

  constructor(public meta: AtomDocTypes.Metadata) {
  }

  async emit(): Promise<string> {
    this.def = `declare module AtomTypes {\n`

    Object.keys(meta.classes).forEach(clazzName => {
      const clazz = meta.classes[clazzName]
      this.emitClass(clazz)
    })

    this.def += '}\n'

    return tsfmt
      .processString('tmp.ts', this.def, {
        dryRun: true,
        replace: false,
        tslint: false,
        editorconfig: false,
        tsfmt: true,
      })
      .then(result => result.dest)
  }

  emitClass(clazz: AtomDocTypes.ClassInfo) {
    this.def += `/**\n`
    if (clazz.description) {
      this.def += this.toJSDocLine(clazz.description)
      this.def += ` *\n`
    }
    this.def += ` * file: ${clazz.filename}\n`
    // this.def += ` * srcUrl: ${clazz.srcUrl}\n`
    this.def += ` */\n`
    this.def += `class ${clazz.name} `
    if (clazz.superClass && clazz.superClass !== 'Model') {
      this.def += `extends ${clazz.superClass} `
    }
    this.def += '{ \n'

    clazz.classProperties.forEach(property => this.emitProperty(property, 'static'))
    if (clazz.classProperties && clazz.classProperties.length !== 0) {
      this.def += '\n'
    }

    clazz.instanceProperties.forEach(property => this.emitProperty(property, ''))
    if (clazz.instanceProperties && clazz.instanceProperties.length !== 0) {
      this.def += '\n'
    }

    clazz.classMethods.forEach(method => this.emitMethod(method, 'static'))
    if (clazz.classMethods && clazz.classMethods.length !== 0) {
      this.def += '\n'
    }

    clazz.instanceMethods.forEach(method => this.emitMethod(method, ''))

    this.def += '}\n\n'
  }

  emitProperty(property: AtomDocTypes.Property, modifier: string) {
    this.def += `/**\n`
    if (property.description) {
      this.def += this.toJSDocLine(property.description)
    }
    this.def += ` */\n`
    this.def += `\t${modifier} ${property.name}: `
    if (property.summary) {
      const reArray = /\{(.*?)\}/.exec(property.summary)
      if (reArray && 2 <= reArray.length) {
        this.def += this.toTSType(reArray[1])
      } else {
        this.def += 'any'
      }
    } else {
      this.def += 'any'
    }
    this.def += ';\n'
  }

  emitMethod(method: AtomDocTypes.Method, modifier: string) {
    this.def += `/**\n`
    if (method.description) {
      this.def += this.toJSDocLine(method.description)
    }
    if (method.arguments) {
      method.arguments.forEach(arg => {
        this.def += ` * @param ${arg.type ? '{' + this.toTSType(arg.type) + '}' : ''} ${arg.description}\n`
      })
    }
    if (method.returnValues) {
      method.returnValues.forEach(ret => {
        this.def += ` * @returns ${ret.type ? '{' + this.toTSType(ret.type) + '}' : ''} ${ret.description}\n`
      })
    }
    this.def += ` */\n`

    this.def += `\t${modifier} ${method.name}(`
    if (method.arguments) {
      const printArguments = (args: AtomDocTypes.Argument[]) => {
        let res = ''
        args.forEach((arg, idx, array) => {
          res += `${arg.name}${arg.isOptional ? '?' : ''}: ${this.toTSType(arg.type, true)}`
          if (idx < array.length - 1) {
            res += ', '
          }
        })
        return res
      }
      let args = []
      for (let i = method.arguments.length - 1; i >= 0; i--) {
        const arg = method.arguments[i]
        if (arg.type === 'Function' && args.length > 0) {
          arg.type = '(' + printArguments(args) + ') => void'
          args = []
        } else if (arg.type === 'Object' && args.length > 0) {
          arg.type = '{' + printArguments(args) + '}'
          args = []
        }
        args.unshift(arg)
      }
      this.def += printArguments(args)
    }
    if (method.name === 'constructor') {
      this.def += ');\n'
      return
    }
    this.def += '): '
    if (!method.returnValues || method.returnValues.length === 0) {
      this.def += 'void'
    } else {
      this.def += this.returnTypes(method.returnValues)
    }
    this.def += ';\n'
  }

  returnTypes(returnValues: AtomDocTypes.ReturnValue[]): string {
    const set = new Set<string>()
    returnValues.filter(ret => !!ret.type).forEach(ret => {
      set.add(this.toTSType(ret.type))
    })

    const result: string[] = []
    set.forEach(v => result.push(v))
    if (result.length === 0) {
      result.push('any')
    }
    return result.join(' | ')
  }

  toTSType(typeName: string, isArg: boolean = false): string {
    if (!typeName) {
      return 'any'
    } else if (typeName === 'Array') {
      return 'any[]'
    } else if (typeName === 'array') {
      return 'any[]'
    } else if (typeName === 'Promise') {
      return 'Promise<any>'
    } else if (typeName === 'Number') {
      return 'number'
    } else if (typeName === 'String') {
      return 'string'
    } else if (typeName === 'Boolean') {
      return 'boolean'
    } else if (typeName === 'Bool') {
      return 'boolean'
    }

    if (isArg) {
      if (typeName === 'Point') {
        return 'IPoint'
      } else if (typeName === 'Range') {
        return 'IRange'
      }
    }

    return typeName
  }

  toJSDocLine(str: string): string {
    return str.split('\n').map(str => ` * ${str}\n`).join('')
  }
}

new Emitter(meta).emit().then(def => console.log(def)).catch(e => console.error(e))
