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

function nextInLine (self) {
  const proto = Object.getPrototypeOf(self);
  const superProto = Object.getPrototypeOf(proto);
  return new Proxy(self, {
    get (target, prop) {
      const value = Reflect.get(superProto, prop, self);
      if (value instanceof Function && value.bind instanceof Function) {
        return value.bind(self);
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
