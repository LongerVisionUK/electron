import { SModelElementSchema } from 'sprotty/lib'
import * as cl from '@electron-lang/celllib'
import * as urn from './urn'
import { PortPortSchema, CellNodeSchema, SymbolNodeSchema, NetEdgeSchema,
         sideToOrientation, Side } from './graph-model'
import { getSideForPort } from './symbol'

export interface ICell extends cl.ICell {
    mod: cl.IModule
    sym: SymbolNodeSchema
}

export interface ICells {
    [cellName: string]: ICell
}

export interface IModule extends cl.IModule {
    cells: ICells
}

interface Net {
    netname: string
    drivers: string[]
    laterals: string[]
    riders: string[]
}

type Nets = {[n: string]: Net}

export function createSchematicForModule(uschem: urn.Schematic, mod: IModule)
: SModelElementSchema[] {
    const elements: SModelElementSchema[] = []
    const nets: Nets = {}

    for (let portName in mod.ports) {
        const port = mod.ports[portName]
        const side = getSideForPort(port)
        const uport = urn.Port(uschem, portName)
        const node = <PortPortSchema> {
            id: urn.toString(uport),
            type: 'port:port',
            urn: uport,
            orient: sideToOrientation(side),
        }
        elements.push(node)
        addBv(nets, port.bits, uport, side)
    }

    for (let cellName in mod.cells) {
        const cell = mod.cells[cellName]
        const ucell = urn.Cell(uschem, cellName)
        const scell = <CellNodeSchema> {
            id: urn.toString(ucell),
            type: 'node:cell',
            urn: ucell,
            orient: 0,
        }
        if (!cell.sym) continue
        const ssym = JSON.parse(JSON.stringify(cell.sym))
        scell.children = ssym.children
        for (let group of ssym.children) {
            const ugroup = urn.CellGroup(ucell, group.urn.groupName)
            group.id = urn.toString(ugroup)
            for (let pin of group.children || []) {
                const portName = pin.urn.portName
                const uport = urn.CellPort(ucell, portName)
                pin.id = urn.toString(uport)

                if (group.urn.portName in cell.connections) {
                    const bv = cell.connections[portName]
                    addBv(nets, bv, urn.CellPort(ucell, portName), pin.side)
                }
            }
        }
        elements.push(scell)
    }

    for (let netName in mod.netnames) {
        const net = mod.netnames[netName]
        addBv(nets, net.bits, netName, null)
    }

    const edges = createEdges(nets)

    return elements.concat(edges)
}

function addBv(nets: Nets, bv: cl.Vector, u: urn.URN | string, side: Side | null) {
    for (let bit of bv) {
        if (typeof bit === 'number') {
            console.log(bit, JSON.stringify(nets[bit.toString()]))
            const conns: Net = nets[bit.toString()]
                || {drivers: [], riders: [], laterals: []}
            if (typeof u === 'string') {
                conns.netname = u
            } else {
                if (side === 'left') {
                    conns.drivers.push(urn.toString(u))
                } else if (side === 'right') {
                    conns.riders.push(urn.toString(u))
                } else {
                    conns.laterals.push(urn.toString(u))
                }
            }
            nets[bit] = conns
            console.log(bit, JSON.stringify(nets[bit.toString()]))
        }
    }
}

function createEdges(nets: Nets): NetEdgeSchema[] {
    let edges: NetEdgeSchema[] = []
    for (let netid in nets) {
        const net = nets[netid]
        // at least one driver and at least one rider and no laterals
        if (net.drivers.length > 0 && net.laterals.length > 0 && net.laterals.length === 0) {
            edges = edges
                .concat(route(net.drivers, net.riders))
        // at least one driver or rider and at least one lateral
        } else if (net.drivers.length + net.riders.length > 0 && net.laterals.length > 0) {
            edges = edges
                .concat(route(net.drivers, net.laterals))
                .concat(route(net.laterals, net.riders))
        // at least two drivers and no riders
        } else if (net.drivers.length > 1 && net.riders.length === 0) {
            // TODO
            edges = edges.concat(route([net.laterals[0]], net.laterals.slice(1)))
        // at least two riders and no drivers
        } else if (net.drivers.length === 0 && net.riders.length > 1) {
            // TODO
            edges = edges.concat(route([net.laterals[0]], net.laterals.slice(1)))
        // at least two laterals and no driver or riders
        } else if (net.laterals.length > 1) {
            // TODO
            edges = edges.concat(route([net.laterals[0]], net.laterals.slice(1)))
        }
    }
    return edges
}

function route(us1: string[], us2: string[]): NetEdgeSchema[] {
    const edges: NetEdgeSchema[] = []
    for (let u1 of us1) {
        for (let u2 of us2) {
            edges.push(<NetEdgeSchema> {
                id: u1 + '-' + u2,
                type: 'edge:net',
                sourceId: u1,
                targetId: u2,
            })
        }
    }
    return edges
}
