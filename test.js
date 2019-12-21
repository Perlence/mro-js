/* eslint-disable lines-between-class-members */
const assert = require('chai').assert;
const { coop, nextInLine } = require('./mro');

suite('coop', function () {
  class Fetcher {
    constructor () {
      this.className = 'Fetcher';
      this.parent = this.className;
    }
    static staticName () {
      return 'Fetcher';
    }
    get url () {
      return 'http://example.com';
    }
    fetch () {
      return `${this.url}/Fetcher`;
    }
    process () {
      return 'genuine';
    }
  }

  class StubFetcher extends Fetcher {
    constructor () {
      const _this = nextInLine(StubFetcher, new.target)();
      _this.className = 'StubFetcher';
      _this.parent = _this.className;
      return _this;
    }
    static staticName () {
      return 'StubFetcher';
    }
    get url () {
      return 'http://localhost';
    }
    fetch () {
      return `${this.url}/StubFetcher`;
    }
    process () {
      return 'fake';
    }
  }

  class MicroFetcher extends Fetcher {
    constructor () {
      const _this = nextInLine(MicroFetcher, new.target)();
      _this.className = 'MicroFetcher';
      return _this;
    }
    static staticName () {
      return 'Micro' + nextInLine(MicroFetcher, this).staticName();
    }
    get url () {
      return nextInLine(MicroFetcher, this).url + '/micro';
    }
    fetch () {
      return nextInLine(MicroFetcher, this).fetch() + 'Micro';
    }
  }

  class NanoFetcher extends MicroFetcher {}

  let MicroStubFetcher;
  suiteSetup(function () {
    MicroStubFetcher = (class extends coop(MicroFetcher, StubFetcher) {});
  });

  test('must not override the prototype unless necessary', function () {
    const MF = coop(MicroFetcher, Fetcher);
    assert.strictEqual(MF, MicroFetcher);
  });

  test('must throw unconsistent MRO error', function () {
    class A {}
    class B extends A {}
    class C {}
    const errorMsg = 'consistent method resolution order';
    assert.throws(() => {
      coop(A, B);
    }, TypeError, errorMsg);
    assert.throws(() => {
      coop(A, C, B);
    }, TypeError, errorMsg);
    class D extends coop(A, C) {}
    class E extends coop(C, A) {}
    assert.throws(() => {
      coop(D, E);
    }, TypeError, errorMsg);
  });

  test('must be a correct instance', function () {
    const microStubFetcher = new MicroStubFetcher();
    assert.isTrue(microStubFetcher instanceof MicroStubFetcher);
    assert.isFalse(microStubFetcher instanceof MicroFetcher);
    assert.isTrue(microStubFetcher instanceof StubFetcher);
    assert.isTrue(microStubFetcher instanceof Fetcher);
    assert.equal(microStubFetcher.constructor, MicroStubFetcher);
  });

  test('must call the next in line methods', function () {
    const microFetcher = new MicroFetcher();
    assert.equal(microFetcher.fetch(), 'http://example.com/micro/FetcherMicro');
    assert.equal(microFetcher.process(), 'genuine');

    const microStubFetcher = new MicroStubFetcher();
    assert.equal(microStubFetcher.fetch(), 'http://localhost/micro/StubFetcherMicro');
    assert.equal(microStubFetcher.process(), 'fake');

    const nanoFetcher = new NanoFetcher();
    assert.isTrue(nanoFetcher instanceof NanoFetcher);
    assert.equal(nanoFetcher.fetch(), microFetcher.fetch());
    assert.equal(nanoFetcher.process(), microFetcher.process());
  });

  test('must call next in line getter', function () {
    assert.equal(new MicroFetcher().url, 'http://example.com/micro');
    assert.equal(new MicroStubFetcher().url, 'http://localhost/micro');
    assert.equal(new NanoFetcher().url, new MicroFetcher().url);
  });

  test('must call next in line static method', function () {
    assert.equal(MicroFetcher.staticName(), 'MicroFetcher');
    assert.equal(MicroStubFetcher.staticName(), 'MicroStubFetcher');
    assert.equal(NanoFetcher.staticName(), MicroFetcher.staticName());
  });

  test('must call the constructor', function () {
    const microStubFetcher = new MicroStubFetcher();
    assert.equal(microStubFetcher.className, 'MicroFetcher');
  });

  test('must call the new parent constructor', function () {
    const microStubFetcher = new MicroStubFetcher();
    assert.equal(microStubFetcher.parent, 'StubFetcher');
  });

  test('original MicroFetcher must stay the same', function () {
    const microFetcher = new MicroFetcher();
    assert.equal(microFetcher.className, 'MicroFetcher');
    assert.equal(microFetcher.parent, 'Fetcher');
    assert.equal(microFetcher.fetch(), 'http://example.com/micro/FetcherMicro');
    assert.equal(microFetcher.process(), 'genuine');
  });

  test('changing the prototype of MicroFetcher must not affect the overriden class', function () {
    const microFetcher = new MicroFetcher();
    const microStubFetcher = new MicroStubFetcher();
    MicroFetcher.prototype.fetch = function () {
      return nextInLine(MicroFetcher, this).fetch() + 'MicroPatched';
    };
    assert.equal(microFetcher.fetch(), 'http://example.com/micro/FetcherMicroPatched');
    assert.notEqual(microStubFetcher.fetch(), 'http://localhost/StubFetcherMicroPathced');
  });

  test("calling nextInLine with an object that isn't an instance of the class must throw an error", function () {
    class BrokenConstructorFetcher extends Fetcher {
      constructor () {
        return nextInLine(MicroFetcher, new.target)();
      }
    }
    assert.throws(
      () => new BrokenConstructorFetcher().fetch(),
      TypeError,
      'obj must be an instance'
    );

    class BrokenFetcher extends Fetcher {
      fetch () {
        return nextInLine(MicroFetcher, this).fetch() + 'Broken';
      }
    }
    assert.throws(
      () => new BrokenFetcher().fetch(),
      TypeError,
      'obj must be an instance'
    );
  });
});
