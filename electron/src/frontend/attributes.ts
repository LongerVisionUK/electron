import { parse, matchCPL } from 'electro-grammar'
import * as ast from './ast'
import { Logger } from '../diagnostic'
import { CPL } from '../cpl'
import * as ir from '../backend/ir'

export interface IAttributeHandler {
    validate(logger: Logger, attr: ast.IAttr): boolean
    compile(attr: ast.IAttr): ir.IAttr[]
}

function validateParams(logger: Logger, attr: ast.IAttr,
                            message: string, tys: string[]): boolean {
    let ok = true
    // No params and not enough parameters
    if (attr.params.length < 1 && tys.length > 0 ||
        attr.params.length < tys.length) {
        logger.error(message, attr.src)
        ok = false
    }
    // Check each supplied parameter
    for (let i = 0; i < attr.params.length; i++) {
        let param = attr.params[i]
        if (!(i < tys.length)) {
            logger.error(message, param.src)
            ok = false
            continue
        }
        if (param.tag !== tys[i]) {
            logger.error(message, param.src)
            ok = false
        }
    }
    return ok
}

/* Attributes for Schematic generation */
const SkinAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        let message = `'@${attr.name}' takes one parameter of type Xml\n`

        return validateParams(logger, attr, message, ['xml'])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        const skin = attr.params[0] as ast.IXml
        return [ new ir.Attr('skin', skin.value, attr.src) ]
    }
}

const RotateAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        let message = `'@${attr.name}' takes one parameter of type Integer\n` +
            ` - allowed values are 0, 90, 180, 270`

        if (!validateParams(logger, attr, message, ['integer'])) {
            return false
        }

        const angle = attr.params[0] as ast.IInteger
        switch(angle.value) {
            case 0:
            case 90:
            case 180:
            case 270:
                break
            default:
                logger.error(message, angle.src)
                return false
        }
        return true
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        const angle = attr.params[0] as ast.IInteger
        return [
            new ir.Attr('rotate', angle.value, attr.src)
        ]
    }
}

const LeftAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes no params.`
        return validateParams(logger, attr, message, [])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        return [ new ir.Attr('side', 'left', attr.src) ]
    }
}

const RightAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes no params.`
        return validateParams(logger, attr, message, [])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        return [ new ir.Attr('side', 'right', attr.src) ]
    }
}

const TopAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes no params.`
        return validateParams(logger, attr, message, [])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        return [ new ir.Attr('side', 'top', attr.src) ]
    }
}

const BottomAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes no params.`
        return validateParams(logger, attr, message, [])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        return [ new ir.Attr('side', 'bottom', attr.src) ]
    }
}

const FixedAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes two params of type Integer.`
        return validateParams(logger, attr, message, ['integer', 'integer'])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        const x = attr.params[0] as ast.IInteger
        const y = attr.params[1] as ast.IInteger
        return [
            new ir.Attr('port_x', x.value, attr.params[0].src),
            new ir.Attr('port_y', y.value, attr.params[1].src),
        ]
    }
}

const GroupAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes one parameter of type String.`
        return validateParams(logger, attr, message, ['string'])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        const group = attr.params[0] as ast.IString
        return [ new ir.Attr('group', group.value, attr.src) ]
    }
}

const PowerAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes no params.`
        return validateParams(logger, attr, message, [])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        return [ new ir.Attr('splitnet', '$vcc', attr.src) ]
    }
}

const GroundAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes no params.`
        return validateParams(logger, attr, message, [])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        return [ new ir.Attr('splitnet', '$gnd', attr.src) ]
    }
}

/* Attributes for RTL */
const ClockAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes no params.`
        return validateParams(logger, attr, message, [])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        // TODO
        return []
    }
}

const InitAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes one parameter of type Integer.`
        return validateParams(logger, attr, message, ['integer'])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        const value = attr.params[0] as ast.IInteger

        return [ new ir.Attr('init', value.value, attr.src) ]
    }
}

/* Attributes for BOM generation */
const CPLAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes a parameter of type String.`
        if (!validateParams(logger, attr, message, ['string'])) {
            return false
        }
        const eg = attr.params[0] as ast.IString
        const matches = matchCPL(parse(eg.value))
        if (matches.length < 1) {
            logger.error(`No CPL matches found for '${eg}'.`, attr.params[0].src)
            return false
        }
        if (matches.length > 1) {
            //logger.warn(`Multiple CPL matches found for '${eg}'.`, attr.params[0].src)
        }
        attr.params.push(ast.String(matches[0], attr.params[0].src))
        return true
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        const cplParam = attr.params[1] as ast.IString
        const cpl = new CPL(cplParam.value)

        return [
            new ir.Attr('man', 'CPL', cplParam.src),
            new ir.Attr('mpn', cplParam.value, cplParam.src),
            new ir.Attr('value', cpl.value || ''),
            new ir.Attr('footprint', cpl.getFootprint() || ''),
        ]
    }
}

const BomAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes two params of type String.`
        return validateParams(logger, attr, message,
                              ['string', 'string'])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        const man = attr.params[0] as ast.IString
        const mpn = attr.params[1] as ast.IString
        return [
            new ir.Attr('man', man.value, man.src),
            new ir.Attr('mpn', mpn.value, mpn.src)
        ]
    }
}

/* Attributes for Simulation */
const ModelAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        // TODO
        return true
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        return []
    }
}

/* Attributes for PCB generation */
const FootprintAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes one param of type String.`
        return validateParams(logger, attr, message, ['string'])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        const fp = attr.params[0] as ast.IString
        return [
            new ir.Attr('footprint', fp.value, attr.src)
        ]
    }
}

const ValueAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes one param of type String.`
        return validateParams(logger, attr, message, ['string'])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        const value = attr.params[0] as ast.IString
        return [
            new ir.Attr('value', value.value, attr.src)
        ]
    }
}

const SetPadAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes at least one param of type ` +
            `String or Integer.`
        let ok = true
        if (attr.params.length < 1) {
            logger.error(message, attr.src)
            ok = false
        }
        for (let param of attr.params) {
            if (param.tag !== 'string' && param.tag !== 'integer') {
                logger.error(message, param.src)
                ok = false
            }
        }
        return ok
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        const pads = attr.params as ast.IString[]
        return [
            new ir.Attr('pads', pads.map((p) => p.value.toString()))
        ]
    }
}

/* Attributes for FPGA bitstream generation */
const FpgaAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes a target triple ARCH-FAMILY-PACKAGE.`
        if (!validateParams(logger, attr, message, ['string'])) {
            return false
        }
        const fpga = attr.params[0] as ast.IString
        let arr = fpga.value.split('-')
        if (arr.length !== 3) {
            logger.error(`Invalid target triple.`, fpga.src)
            return false
        }
        return true
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        const fpga = attr.params[0] as ast.IString
        return [ new ir.Attr('fpga', fpga.value, attr.src) ]
    }
}

const BoardAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        const message = `@${attr.name} takes a parameter of type String.`
        return validateParams(logger, attr, message, ['string'])
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        const board = attr.params[0] as ast.IString
        return [ new ir.Attr('board', board.value, attr.src) ]
    }
}

const BitstreamAttribute: IAttributeHandler = {
    validate(logger: Logger, attr: ast.IAttr): boolean {
        // TODO
        return true
    },

    compile(attr: ast.IAttr): ir.IAttr[] {
        return []
    }
}

export const allAttributes: {[name: string]: IAttributeHandler} = {
    // Schematic
    skin: SkinAttribute,
    rotate: RotateAttribute,
    left: LeftAttribute,
    right: RightAttribute,
    top: TopAttribute,
    bottom: BottomAttribute,
    fixed: FixedAttribute,
    group: GroupAttribute,
    power: PowerAttribute,
    ground: GroundAttribute,
    // RTL
    clock: ClockAttribute,
    init: InitAttribute,
    // BOM
    cpl: CPLAttribute,
    bom: BomAttribute,
    // Simulation
    model: ModelAttribute,
    // PCB
    footprint: FootprintAttribute,
    value: ValueAttribute,
    set_pad: SetPadAttribute,
    // Bitstream
    fpga: FpgaAttribute,
    board: BoardAttribute,
    bitstream: BitstreamAttribute,
}
