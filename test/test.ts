import { rootCertificates } from 'tls';
import * as assert from 'assert';
import { globalAgent } from 'https';
import * as https from 'https';

import * as macca from '../src';

describe('macca', () => {
  before(() => macca.addToGlobalAgent());

  it('should have inserted the cas', () => {
    const cas = https.globalAgent.options.ca?.length;
    assert.ok(cas !== undefined && cas > 0);
  });

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
    assert.ok(certs.every(c => globalAgent.options.ca?.includes(c)));
  });

  it('should be able to call a remote endpoint with fetch', async () => {
    await fetch('https://example.com');
  });

  it('should be able to call using https.get', (done) => {
    https.get('https://example.com', () => done())
      .once('error', done);
  });

  it('should be able to call using https.get with a new agent', (done) => {
    const agent = new https.Agent();

    assert.ok(agent.options.ca?.length! > 0,
      'Agent should have the root certs');

    https.get('https://example.com', { agent: agent }, () => done())
      .once('error', done);
  });
});
