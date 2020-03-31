import {
  CNode,
  CProperties,
  CSelector,
  CSSRenderInstance
} from './types'
import { p$p } from './parse'

/** kebab regex */
const kr = /[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g

/** kebab case */
function kc (pattern: string): string {
  return pattern.replace(kr, match => '-' + match.toLowerCase())
}

/** create style */
function cs (
  selector: string,
  props: CProperties | null,
  instance: CSSRenderInstance
): string | null {
  if (props === null) {
    return null
  }
  const propertyNames = Object.keys(props)
  if (propertyNames.length === 0) {
    if (instance.config.preserveEmptyBlock) return selector + ' {}'
    return null
  }
  const statements = [
    selector + ' {'
  ]
  propertyNames.forEach(propertyName => {
    const property = props[propertyName]
    const unwrappedProperty: string = String(typeof property === 'function' ? property() : property)
    propertyName = kc(propertyName)
    statements.push(`  ${propertyName}: ${unwrappedProperty};`)
  })
  statements.push('}')
  return statements.join('\n')
}

function traverse (
  node: CNode,
  paths: Array<string | CSelector>,
  styles: string[],
  instance: CSSRenderInstance
): void {
  const pathIsString = typeof node.path === 'string'
  if (pathIsString) paths.push(node.path)
  else {
    if ((node.path as CSelector).before !== undefined) ((node.path as CSelector).before as Function)(instance.context)
    paths.push((node.path as CSelector).selector(instance.context))
  }
  const selector = p$p(paths, instance)
  const style = cs(selector, node.props, instance)
  if (style !== null) styles.push(style)
  if (node.children !== null) {
    node.children.forEach(childNode => {
      traverse(childNode, paths, styles, instance)
    })
  }
  paths.pop()
  if (!pathIsString && (node.path as CSelector).after !== undefined) ((node.path as CSelector).after as Function)(instance.context)
}

export function render (node: CNode, instance: CSSRenderInstance): string {
  const styles: string[] = []
  traverse(node, [], styles, instance)
  return styles.join('\n')
}
