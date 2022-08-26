export async function apply(dom, html) {
  return import('morphdom')
    .then(({default: MorphDom}) => {
      MorphDom(dom, html, {
        childrenOnly: true,
        getNodeKey(node) {
          if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
          return node.getAttributeNS(null, '_:key') || node.key;
        },
        onBeforeElUpdated(existingNode, updatedNode) {
          // TODO: replace this
          const descriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(updatedNode))
          for (let prop in descriptors) {
            if (['innerText', 'style', 'outerText', 'formAction'].includes(prop)) continue;
            const desc = descriptors[prop];
            if (desc.configurable && typeof desc.set === 'function' && existingNode[prop] && updatedNode[prop] !== existingNode[prop]) {
              updatedNode[prop] = existingNode[prop];
            }
          }
          // spec - https://dom.spec.whatwg.org/#concept-node-equals
          return existingNode.isEqualNode(updatedNode)
        }
      });
    }).catch(err => {
      dom.innerHTML = html;
    })
}



const activeListeners = {};
export function findEvents(root, globalHandlerRegistry = window) {

  if (!root || typeof root.querySelectorAll !== 'function') {
    return;
  }

  const nodes = [root, ...root.querySelectorAll('[_\\:on="true"]')];
  for (let node of nodes) {
    for (let attr of node.attributes) {
      let handler;
      if (attr.name.startsWith('_:on') && attr.name !== '_:on' && (handler = globalHandlerRegistry[attr.value])) {
        const id = [attr.name, attr.value].join(':');
        const [prefix, action, event, handlerRefId] = id.split(':');
        // activeListeners[id] = node;
        // TODO: do we need to account for dupes?
        node.addEventListener(event, (...args) => {
          return handler.call(this, ...args)
        }, false);

        // the above is a per-element listener approach, below uses bubbling so we can register only a few listeners and delegate
        // TODO: update this to be like Action listener... onClick, find closest() $:onClick and call function, and continue traversing
        // if (!activeListeners[event]) {
        //   activeListeners[event] = activeListeners[event] || [ handlerRefId ];
        //   root.addEventListener(event, (e, ...args) => {
        //     let node = e.target;
        //     do {
        //       const nodeHandlerRefId = node.getAttribute(`_:on:${event}`);
        //       const handler = globalHandlerRegistry[nodeHandlerRefId];
        //       if (typeof handler === 'function') {
        //         // TODO: do anything with return value? e.g., `if (return === false) break;` ?
        //         handler(e, ...args);
        //       }
        //
        //       node = node.parentElement.closest(`[_\\:on="true"][_\\:on\\:${event}]`); // TODO: we may need to normalize the event name here a littler more
        //     }while(node && root.contains(node)) // TODO: checking that this event is within this particular root is probably not correct...?
        //
        //   }, false)
        // }else {
        //   activeListeners[event].push(handlerRefId)
        // }
      }
    }
  }
}


const getObserver = () => new MutationObserver((mutationList, observer) => {
  for (let mutation of mutationList) {
    for (let node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        findEvents(node)
      }
    }
    for (let node of mutation.removedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // TODO: remove handler from globalRegistry
      }
    }
  }
});

let observer;
export function register(root = document.documentElement) {
  observer = observer || getObserver();
  // NOTE: if observe is called for a node that's already being watched then all previous observers will be removed and the new one will be added
  observer.observe(root, {childList: true, subtree: true});
  findEvents(root);
}