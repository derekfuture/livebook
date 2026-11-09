// Older classroom browsers may support modules but lack this Promise helper.
if (!Promise.withResolvers) {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new this((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
  };
}
