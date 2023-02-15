const forge = require('node-forge');
const packageJson = require('../package.json');

var formats = (module.exports.validFormats = {
  der: 0,
  pem: 1,
  txt: 2,
  asn1: 3,
});

function myASN(pem) {
  const der = forge.pki.pemToDer(pem);
  const asn1 = forge.asn1;
  const crt = asn1.fromDer(der.data.toString('binary')).value[0].value;
  const serial = crt[0];
  const hasSerial =
    serial.tagClass === asn1.Class.CONTEXT_SPECIFIC &&
    serial.type === 0 &&
    serial.constructed;
  const slicedCrt = crt.slice(hasSerial);

  return {
    serial: slicedCrt[0],
    issuer: slicedCrt[2],
    valid: slicedCrt[3],
    subject: slicedCrt[4],
  };
}

function txtFormat(pem) {
  const crt = myASN(pem);
  const d = new Date();
  const subject = crt.subject.value
    .map((rdn) => rdn.value[0].value[1].value)
    .join('/');
  const valid = crt.valid.value
    .map((date) => date.value)
    .join(' - ');
  const savedTime = d
    .toTimeString()
    .replace(/\s*\(.*\)\s*/, '');

  return [
    `Subject\t${subject}`,
    `Valid\t${valid}`,
    `Saved\t${d.toLocaleDateString()} ${savedTime} by ${packageJson.name}@${packageJson.version}`,
    String(pem),
  ].join('\n');
}

module.exports.transform = function (format) {
  return function (pem) {
    try {
      switch (format) {
        case formats.der:
          return forge.pki.pemToDer(pem);
        case formats.pem:
          return pem;
        case formats.txt:
          return txtFormat(pem);
        case formats.asn1:
          return myASN(pem);
        default:
          return forge.pki.certificateFromPem(pem);
      }
    } catch (er) {
      return;
    }
  };
};
