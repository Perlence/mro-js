function mro (...classes) {
  return classes.reduceRight((superClass, subClass) => {
    return overridePrototype(subClass, superClass);
  });
}

function overridePrototype (subClass, superClass) {
  if (Object.getPrototypeOf(subClass) === superClass) {
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
  mro,
  overridePrototype,
  nextInLine
};
