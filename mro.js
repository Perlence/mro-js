function mro (...classes) {
  return classes.reduceRight((superClass, subClass) => {
    // TODO: Check if subClass already extends superClass.
    return overridePrototype(subClass, superClass);
  });
}

function overridePrototype (subClass, superClass) {
  if (Object.getPrototypeOf(subClass) === superClass) {
    return subClass;
  }

  function cls (...args) {
    // Call the constructor of the subClass.
    return Reflect.construct(subClass, args, cls);
  }

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
    if ((subClass.__original__ || subClass) === (cls.__original__ || cls)) {
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

function getMRO (cls) {
  const proto = Object.getPrototypeOf(cls);
  if (proto == null) {
    return [cls];
  }
  return [cls, ...getMRO(proto)];
}
