const assert = require("node:assert/strict");
const { once } = require("node:events");
const http = require("node:http");
const test = require("node:test");
const proxyaddr = require("proxy-addr");
const { createApp } = require("../src/app");

function parseVersion(value) {
  return String(value)
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
}

function isAtLeast(actual, minimum) {
  const actualParts = parseVersion(actual);
  const minimumParts = parseVersion(minimum);
  const length = Math.max(actualParts.length, minimumParts.length);

  for (let index = 0; index < length; index += 1) {
    const actualPart = actualParts[index] || 0;
    const minimumPart = minimumParts[index] || 0;

    if (actualPart !== minimumPart) {
      return actualPart > minimumPart;
    }
  }

  return true;
}

test("proxy-addr does not trust an IPv4 client for a malformed IPv4-mapped IPv6 subnet", () => {
  const isTrusted = proxyaddr.compile("::ffff:10.0.0.0/8");

  assert.equal(
    isTrusted("203.0.113.7"),
    false,
    "a public IPv4 client must not match an IPv4-mapped IPv6 trust subnet"
  );
});

test("body-parser is at a version that rejects trailing bytes after compressed bodies", () => {
  const installedVersion = require("body-parser/package.json").version;

  assert.equal(
    isAtLeast(installedVersion, "2.4.0"),
    true,
    `body-parser ${installedVersion} is vulnerable to GHSA-27r3-jxmh-p828`
  );
});

test("GET /route still responds when the request has no body", async (t) => {
  const server = createApp().listen(0);
  await once(server, "listening");

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  const response = await new Promise((resolve, reject) => {
    const request = http.get(
      {
        host: "127.0.0.1",
        port,
        path: "/route?ip=203.0.113.7"
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve({ statusCode: res.statusCode }));
      }
    );

    request.on("error", reject);
  });

  assert.equal(response.statusCode, 200);
});
