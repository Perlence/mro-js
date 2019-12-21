function coop (...bases) {
  const duplicateBase = findDuplicate(bases);
  if (duplicateBase) {
    throw new TypeError(`duplicate base class ${original(duplicateBase).name}`);
  }

  const protoChains = bases.map(prototypeChain);
  protoChains.push(bases.map(cls => cls.prototype));
  const mro = linearize(protoChains);
  const ctors = mro.map(cls => cls.constructor);
  return ctors.reduceRight((superClass, subClass) => {
    return overridePrototype(subClass, superClass);
  });
}

function findDuplicate (array) {
  const set = new Set();
  for (const item of array) {
    if (set.has(item)) {
      return item;
    }
    set.add(item);
  }
}

function prototypeChain (ctor) {
  let proto = ctor.prototype;
  let parent;
  const result = [proto];
  do {
    parent = Object.getPrototypeOf(proto);
    result.push(parent);
    proto = parent;
  } while (parent != null);
  return result;
}

function linearize (baseMROs) {
  const result = [];
  while (baseMROs.length) {
    let head;
    for (const baseMRO of baseMROs) {
      const h = baseMRO[0];
      const hasNoSubclasses = baseMROs.every(bases => {
        return bases.findIndex(b => original(b) === original(h)) < 1;
      });
      if (hasNoSubclasses) {
        head = h;
        break;
      }
    }
    if (typeof head === 'undefined') {
      const leafClassNames = baseMROs.map(bs => original(bs[0]).constructor.name);
      const uniqueClassNames = Array.from(new Set(leafClassNames));
      const bases = uniqueClassNames.join(', ');
      throw new TypeError(
        `Cannot create a consistent method resolution order (MRO) for bases ${bases}`);
    }
    if (head != null) {
      result.push(head);
    }
    baseMROs = baseMROs.map(bases => bases.filter(b => original(b) !== original(head)));
    baseMROs = baseMROs.filter(bases => bases.length);
  }
  return result;
}

function overridePrototype (subClass, superClass) {
  if (Object.getPrototypeOf(subClass.prototype) === superClass.prototype) {
    return subClass;
  }

  const cls = new Proxy(function () {}, {
    construct: function (target, args, newTarget) {
      return Reflect.construct(subClass, args, newTarget);
    }
  });

  // Copy the subClass prototype properties to the new class.
  const prototype = Object.create(
    superClass.prototype,
    {
      ...Object.getOwnPropertyDescriptors(subClass.prototype),
      constructor: { value: cls, writable: true, configurable: true },
      __original__: { value: subClass.prototype }
    }
  );
  // Copy the subClass static properties to the new class.
  Object.defineProperties(
    cls,
    {
      ...Object.getOwnPropertyDescriptors(subClass),
      prototype: { value: prototype },
      __original__: { value: subClass }
    }
  );

  Object.setPrototypeOf(cls, superClass);
  return cls;
}

function nextInLine (cls, instanceOrSubclass) {
  let instance, subClass;
  if (instanceOrSubclass instanceof Function && instanceOrSubclass.prototype) {
    subClass = instanceOrSubclass;
  } else {
    instance = instanceOrSubclass;
    subClass = instanceOrSubclass.constructor;
  }
  let superClass;
  // Walk up the prototype chain of `subClass` and find the super class of `cls`.
  while (true) {
    superClass = Object.getPrototypeOf(subClass);
    if (original(subClass) === original(cls)) {
      // Found it.
      break;
    }
    if (superClass == null) {
      throw new TypeError('nextInLine(cls, obj): obj must be an instance or subtype of type');
    }
    subClass = superClass;
  }

  const constructor = function (...args) {
    return Reflect.construct(superClass, args, instanceOrSubclass);
  };
  return new Proxy(constructor, {
    get (__, prop) {
      const target = (instance != null) ? superClass.prototype : superClass;
      const value = Reflect.get(target, prop, instanceOrSubclass);
      if (value instanceof Function) {
        return value.bind(instanceOrSubclass);
      }
      return value;
    }
  });
}

function original (obj) {
  if (!obj) {
    return obj;
  }
  if (Object.prototype.hasOwnProperty.call(obj, '__original__')) {
    return obj.__original__;
  }
  return obj;
}

module.exports = {
  coop,
  nextInLine
};
