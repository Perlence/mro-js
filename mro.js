function mro (...classes) {
  return classes.reduceRight((superClass, subClass) => {
    // TODO: Check if subClass already extends superClass.
    return overridePrototype(subClass, superClass);
  });
}

function overridePrototype (subClass, superClass) {
  function cls (...args) {
    // Call the constructor of the subClass.
    return Reflect.construct(subClass, args, cls);
  }

  // Copy the properties to the new class.
  cls.prototype = Object.create(
    superClass.prototype,
    Object.getOwnPropertyDescriptors(subClass.prototype)
  );
  Object.assign(cls.prototype, subClass.prototype);

  Object.setPrototypeOf(cls, superClass);
  return cls;
}

function nextInLine (instance) {
  if (instance instanceof Function && instance.prototype) {
    // Return super.
    const cls = instance;
    const superConstructor = Object.getPrototypeOf(cls);
    return function (...args) {
      return Reflect.construct(superConstructor, args, cls);
    };
  }

  const proto = Object.getPrototypeOf(instance);
  const superProto = Object.getPrototypeOf(proto);
  return new Proxy(instance, {
    get (target, prop) {
      const value = Reflect.get(superProto, prop, instance);
      if (value instanceof Function && value.bind instanceof Function) {
        return value.bind(instance);
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
