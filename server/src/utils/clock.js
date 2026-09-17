let virtualNow = null;

function now() {
  return virtualNow ? new Date(virtualNow.getTime()) : new Date();
}

function setNow(value) {
  virtualNow = value ? new Date(value) : null;
  return now();
}

function isVirtual() {
  return virtualNow !== null;
}

module.exports = { now, setNow, isVirtual };
