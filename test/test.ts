import { rootCertificates } from 'tls';
import * as assert from 'assert';
import { globalAgent } from 'https';
import * as macca from '../src';

describe('macca', () => {
  it('should properly exclude node.js certs', () => {
    const excludingNodejs = macca.get({ excludeBundled: true, format: macca.Format.fingerprint });
    const nodejs = rootCertificates.map(c => macca.convert(c, macca.Format.fingerprint));
    assert.ok(!excludingNodejs.find(c => nodejs.includes(c)));
  });

  it('should include some of the node.js certs when excludeBundled is false', () => {
    const includingNodejs = macca.get({ excludeBundled: false, format: macca.Format.fingerprint });
    const nodejs = rootCertificates.map(c => macca.convert(c, macca.Format.fingerprint));
    assert.ok(includingNodejs.find(c => nodejs.includes(c)));
  });

  it('should install in the global agent', () => {
    const certs = macca.get();
    macca.addToGlobalAgent();
    assert.ok(certs.every(c => globalAgent.options.ca?.includes(c)));
  });
});
