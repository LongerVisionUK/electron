import { SModelElementSchema, SModelIndex } from 'sprotty/lib'
import * as cl from '@electron-lang/celllib'
import { URN } from './urn'

export interface IGraphGenerator {
    readonly elements: SModelElementSchema[]
    readonly index: SModelIndex<SModelElementSchema>

    addNetlist(uri: string, netlist: cl.INetlist): void

    open(urn: URN): void
    close(): void
}

export const IGraphGenerator = Symbol('IGraphGenerator')
