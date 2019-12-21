function coop (...bases) {
  // TODO: Throw "TypeError: duplicate base class ${}".
  const protoChains = bases.map(prototypeChain);
  protoChains.push(bases.map(cls => cls.prototype));
  const mro = linearize(protoChains);
  const ctors = mro.map(cls => cls.constructor);
  return ctors.reduceRight((superClass, subClass) => {
    return overridePrototype(subClass, superClass);
  });
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
      if (!baseMROs.some((b) => b.indexOf(h) > 0)) {
        head = h;
        break;
      }
    }
    if (typeof head === 'undefined') {
      throw new TypeError('Cannot create a consistent method resolution order(MRO) for bases');
    }
    if (head != null) {
      result.push(head);
    }
    baseMROs = baseMROs.map((b) => b.filter((c) => c !== head));
    baseMROs = baseMROs.filter((b) => b.length);
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
      constructor: { value: cls, writable: true, configurable: true }
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
    if (originalClass(subClass) === originalClass(cls)) {
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

function originalClass (cls) {
  if (Object.prototype.hasOwnProperty.call(cls, '__original__')) {
    return cls.__original__;
  }
  return cls;
}

module.exports = {
  coop,
  nextInLine
};
