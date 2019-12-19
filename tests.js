const assert = chai.assert;

suite('overridePrototype', function () {
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

  class StubFetcher {
    constructor () {
      this.className = 'StubFetcher';
      this.parent = this.className;
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

  let MicroStubFetcher;
  suiteSetup(function () {
    MicroStubFetcher = overridePrototype(MicroFetcher, StubFetcher);
  });

  test('must not override the prototype unless necessary', function () {
    const MF = overridePrototype(MicroFetcher, Fetcher);
    assert.strictEqual(MF, MicroFetcher);
  });

  test('must be a correct instance', function () {
    const microStubFetcher = new MicroStubFetcher();
    assert.isTrue(microStubFetcher instanceof MicroStubFetcher);
    assert.isFalse(microStubFetcher instanceof MicroFetcher);
    assert.isTrue(microStubFetcher instanceof StubFetcher);
    assert.isFalse(microStubFetcher instanceof Fetcher);
    assert.equal(microStubFetcher.constructor, MicroStubFetcher);
  });

  test('must call the next in line methods', function () {
    const microFetcher = new MicroFetcher();
    assert.equal(microFetcher.fetch(), 'http://example.com/micro/FetcherMicro');
    assert.equal(microFetcher.process(), 'genuine');

    const microStubFetcher = new MicroStubFetcher();
    assert.equal(microStubFetcher.fetch(), 'http://localhost/micro/StubFetcherMicro');
    assert.equal(microStubFetcher.process(), 'fake');
  });

  test('must call next in line getter', function () {
    assert.equal(new MicroFetcher().url, 'http://example.com/micro');
    assert.equal(new MicroStubFetcher().url, 'http://localhost/micro');
  });

  test('must call next in line static method', function () {
    assert.equal(MicroFetcher.staticName(), 'MicroFetcher');
    assert.equal(MicroStubFetcher.staticName(), 'MicroStubFetcher');
  });

  test('must call the constructor', function () {
    const microStubFetcher = new MicroStubFetcher();
    assert.equal(microStubFetcher.className, 'MicroFetcher');
  });

  test('must call the new parent constructor', function () {
    const microStubFetcher = new MicroStubFetcher();
    assert.equal(microStubFetcher.parent, 'StubFetcher');
  });

  test('must not enter an infinite recursion', function () {
    class NanoFetcher extends MicroFetcher { }
    const nf = new NanoFetcher();
    assert.isTrue(nf instanceof NanoFetcher);
    assert.equal(nf.fetch(), 'http://example.com/micro/FetcherMicro');
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
