const assert = chai.assert;

describe('overridePrototype', () => {
  class Fetcher {
    constructor () {
      this.className = 'Fetcher';
      this.parent = this.className;
    }

    url () {
      return 'http://example.com';
    }

    fetch () {
      return `${this.url()}/Fetcher`;
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

    url () {
      return 'http://localhost';
    }

    fetch () {
      return `${this.url()}/StubFetcher`;
    }

    process () {
      return 'fake';
    }
  }

  class MicroFetcher extends Fetcher {
    constructor () {
      const _this = nextInLine(new.target)();
      _this.className = 'MicroFetcher';
      return _this;
    }

    url () {
      return 'http://micro';
    }

    fetch () {
      return nextInLine(this).fetch() + 'Micro';
    }
  }

  const MicroStubFetcher = overridePrototype(MicroFetcher, StubFetcher);
  const microStubFetcher = new MicroStubFetcher();
  it('must be a correct instance', () => {
    assert.isTrue(microStubFetcher instanceof MicroStubFetcher);
    assert.isFalse(microStubFetcher instanceof MicroFetcher);
    assert.isTrue(microStubFetcher instanceof StubFetcher);
    assert.isFalse(microStubFetcher instanceof Fetcher);
  });

  it('must call next in line methods', () => {
    assert.equal(microStubFetcher.fetch(), 'http://micro/StubFetcherMicro');
    assert.equal(microStubFetcher.process(), 'fake');
  });

  it('must call the constructor', () => {
    assert.equal(microStubFetcher.className, 'MicroFetcher');
  });

  it('must call the new parent constructor', () => {
    assert.equal(microStubFetcher.parent, 'StubFetcher');
  });

  it('must not enter an infinite recursion', () => {
    class NanoFetcher extends MicroFetcher {}
    const nf = new NanoFetcher();
    assert.isTrue(nf instanceof NanoFetcher);
  });

  const microFetcher = new MicroFetcher();
  it('original MicroFetcher must stay the same', () => {
    assert.equal(microFetcher.className, 'MicroFetcher');
    assert.equal(microFetcher.parent, 'Fetcher');
    assert.equal(microFetcher.fetch(), 'http://micro/FetcherMicro');
    assert.equal(microFetcher.process(), 'genuine');
  });

  it('changing the prototype of MicroFetcher must not affect the overriden class', () => {
    MicroFetcher.prototype.fetch = function () {
      return nextInLine(this).fetch() + 'MicroPatched';
    };
    assert.equal(microFetcher.fetch(), 'http://micro/FetcherMicroPatched');
    assert.notEqual(microStubFetcher.fetch(), 'http://localhost/StubFetcherMicroPathced');
  });
});
