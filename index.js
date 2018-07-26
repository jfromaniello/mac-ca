const https = require('https');
const formater = require('./lib/formater');

if (process.platform !== 'darwin') {
  module.exports.all = [];
  return;
}

const child_process = require('child_process');

const splitPattern = /(?=-----BEGIN\sCERTIFICATE-----)/g;
const systemRootCertsPath = '/System/Library/Keychains/SystemRootCertificates.keychain';
const args = [ 'find-certificate', '-a', '-p' ];

const allTrusted = child_process.spawnSync('/usr/bin/security', args)
  .stdout.toString().split(splitPattern);

const allRoot = child_process.spawnSync('/usr/bin/security', args.concat(systemRootCertsPath))
  .stdout.toString().split(splitPattern);

https.globalAgent.options.ca = https.globalAgent.options.ca || [];

const ca = https.globalAgent.options.ca;

function duplicated(cert, index, arr) {
  return arr.indexOf(cert) === index;
}

const all = allTrusted.concat(allRoot).filter(duplicated);

all.forEach(cert => ca.push(cert));

module.exports.der2 = formater.validFormats;

module.exports.all = function(format){
  return all
    .map(formater.transform(format))
    .filter(c => c);
};
