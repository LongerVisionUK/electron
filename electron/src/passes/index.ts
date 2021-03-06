import * as ir from '../backend/ir'

export interface IPass {
    transform(mod: ir.IModule[]): ir.IModule[]
}

export { HierarchyPass } from './hierarchy'
export { RenameCellPass } from './renamecell'
