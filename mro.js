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

  // Copy the properties to the new class.
  cls.prototype = Object.create(
    superClass.prototype,
    {
      ...Object.getOwnPropertyDescriptors(subClass.prototype),
      constructor: { value: cls, writable: true, configurable: true }
    }
  );
  Object.defineProperty(cls, '__original__', { value: subClass });

  Object.setPrototypeOf(cls, superClass);
  return cls;
}

function nextInLine (cls, instanceOrSubclass) {
  let subClass;
  if (instanceOrSubclass instanceof Function && instanceOrSubclass.prototype) {
    subClass = instanceOrSubclass;
  } else {
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
    get (target, prop) {
      const value = Reflect.get(superClass.prototype, prop, instanceOrSubclass);
      if (value instanceof Function) {
        return value.bind(instanceOrSubclass);
      }
      // TODO: Check getters.
      // TODO: Check static methods.
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
