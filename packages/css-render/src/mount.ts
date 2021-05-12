/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import hash from './hash'
import { render } from './render'
import {
  CNode,
  CssRenderInstance,
  CRenderProps,
  MountId,
  SsrAdapter
} from './types'
import {
  createElement, queryElement, removeElement
} from './utils'

if (window) {
  (window as any).__cssrContext = {}
}

type CssrContext = Record<string, boolean>

function getCount (el: HTMLStyleElement): number | null {
  const count = el.getAttribute('mount-count')
  if (count === null) return null
  return Number(count)
}

function setCount (el: HTMLStyleElement, count: number): void {
  el.setAttribute('mount-count', String(count))
}

export {
  getCount, setCount
}

export function unmount (
  intance: CssRenderInstance,
  node: CNode,
  id: MountId,
  count: boolean
): void {
  const { els } = node
  // If target is undefined, unmount all styles
  if (id === undefined) {
    els.forEach(removeElement)
    node.els = []
  } else {
    const target = queryElement(id)
    // eslint-disable-next-line
    if (target && els.includes(target)) {
      const mountCount = getCount(target)
      if (!count) {
        if (mountCount !== null) {
          console.error(`[css-render/unmount]: The style with target='${id}' is mounted in no-count mode.`)
        } else {
          removeElement(target)
          node.els = els.filter(el => el !== target)
        }
      } else {
        if (mountCount === null) {
          console.error(`[css-render/unmount]: The style with target='${id}' is mounted in count mode.`)
        } else {
          if (mountCount <= 1) {
            removeElement(target)
            node.els = els.filter(el => el !== target)
          } else setCount(target, mountCount - 1)
        }
      }
    }
  }
}

function addElementToList (els: HTMLStyleElement[], target: HTMLStyleElement): void {
  els.push(target)
}

function mount<T extends CRenderProps, U extends SsrAdapter | undefined = undefined> (
  instance: CssRenderInstance,
  node: CNode,
  id: MountId,
  props: T,
  head: boolean,
  count: boolean,
  boost: boolean,
  ssrAdapter?: U
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
): U extends undefined ? HTMLStyleElement : void {
  if (boost && !ssrAdapter) {
    if (id === undefined) {
      console.error('[css-render/mount]: `id` is required in `boost` mode.')
      // @ts-expect-error
      return
    }
    const cssrContext: CssrContext = (window as any).__cssrContext
    if (!cssrContext[id]) {
      cssrContext[id] = true
    }
    render(node, instance, props, boost)
    // @ts-expect-error
    return
  }
  let target: HTMLStyleElement
  const { els } = node
  let style: string | undefined
  if (id === undefined) {
    style = node.render(props)
    id = hash(style)
  }
  if (ssrAdapter) {
    ssrAdapter(id, style ?? node.render(props))
    // @ts-expect-error
    return
  }
  const queriedTarget = queryElement(id)
  if (queriedTarget === null) {
    target = createElement(id)
    if (style === undefined) style = node.render(props)
    target.textContent = style
    if (head) {
      const firstStyleEl = document.head.getElementsByTagName('style')[0] || null as (HTMLElement | null)
      document.head.insertBefore(target, firstStyleEl)
    } else {
      document.head.appendChild(target)
    }
    if (count) {
      setCount(target, 1)
    }
    addElementToList(els, target)
  } else {
    const mountCount = getCount(queriedTarget)
    if (count) {
      if (mountCount === null) {
        console.error(`[css-render/mount]: The style with id='${id}' has been mounted in no-count mode.`)
      } else {
        setCount(queriedTarget, mountCount + 1)
      }
    } else {
      if (mountCount !== null) {
        console.error(`[css-render/mount]: The style with id='${id}' has been mounted in count mode.`)
      }
    }
  }
  // @ts-expect-error
  return queriedTarget ?? target
}

export { mount }
