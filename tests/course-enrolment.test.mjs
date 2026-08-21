import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  get length() {
    return this.values.size;
  }

  key(index) {
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key) {
    const value = this.values.get(String(key));
    return value === undefined ? null : value;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }

  clear() {
    this.values.clear();
  }
}

async function makeInstallerHarness({ registryOnline = true } = {}) {
  const registry = JSON.parse(await read("course-delivery/registry-v1.json"));
  const bricklayerPack = JSON.parse(await read("course-packs/Bricklayer_ST0095_v1.2.nisi"));
  class HarnessStorage extends MemoryStorage {}
  const storage = new HarnessStorage();
  const requestedUrls = [];
  const loggedErrors = [];
  const statusNode = {
    textContent: "",
    classList: {
      error: false,
      toggle(_name, enabled) {
        this.error = Boolean(enabled);
      },
    },
  };
  let reloadCount = 0;

  const fetchMock = async (input) => {
    const url = String(input?.url ?? input);
    requestedUrls.push(url);
    if (url.includes("course-delivery/registry-v1.json")) {
      if (!registryOnline) throw new TypeError("offline");
      return Response.json(registry);
    }
    if (url.includes("course-packs/Bricklayer_ST0095_v1.2.nisi")) {
      return Response.json(bricklayerPack);
    }
    return new Response("Not found", { status: 404 });
  };

  const document = {
    baseURI: "https://example.test/Evia_beta/",
    readyState: "loading",
    documentElement: {
      classList: {
        add() {},
        remove() {},
      },
    },
    addEventListener() {},
    getElementById() {
      return null;
    },
    querySelector(selector) {
      return selector === "[data-enrol-status]" ? statusNode : null;
    },
  };
  const location = {
    reload() {
      reloadCount += 1;
    },
  };
  const window = {
    addEventListener() {},
    document,
    fetch: fetchMock,
    localStorage: storage,
    location,
  };
  window.window = window;
  const harnessConsole = {
    debug() {},
    error(...args) {
      loggedErrors.push(args);
    },
    info() {},
    log() {},
    warn() {},
  };

  const context = vm.createContext({
    Array,
    Blob,
    Date,
    Error,
    JSON,
    Map,
    Math,
    Number,
    Object,
    Promise,
    RegExp,
    Response,
    Set,
    Storage: HarnessStorage,
    String,
    Symbol,
    URL,
    clearTimeout() {},
    console: harnessConsole,
    document,
    fetch: fetchMock,
    localStorage: storage,
    location,
    navigator: {},
    setTimeout(callback) {
      callback();
      return 1;
    },
    window,
  });

  for (const script of [
    "assets/evia-course-packs.js",
    "assets/evia-course-context.js",
    "course-delivery/course-registry.js",
    "assets/evia-course-enrolment.js",
  ]) {
    vm.runInContext(await read(script), context, { filename: script });
  }

  return {
    bricklayerPack,
    loggedErrors,
    registry,
    requestedUrls,
    statusNode,
    storage,
    window,
    get reloadCount() {
      return reloadCount;
    },
  };
}

test("permanent manual and QR values resolve to the publishable Bricklayer package", async () => {
  const harness = await makeInstallerHarness();

  for (const value of ["ST0095", "evia1:st0095"]) {
    const resolved = await harness.window.EviaCourseRegistry.resolve(value);
    assert.equal(resolved.ok, true);
    assert.equal(resolved.enrolmentId, "ST0095");
    assert.equal(resolved.course.packageId, "st0095-v1-2");
    assert.equal(resolved.course.packagePath, "../course-packs/Bricklayer_ST0095_v1.2.nisi");
  }

  const unavailable = await harness.window.EviaCourseRegistry.resolve("ST0264-SITE");
  assert.deepEqual(
    { ok: unavailable.ok, reason: unavailable.reason },
    { ok: false, reason: "course-not-ready" },
  );
});

test("ST0095 installs, activates, persists and reloads through the real installer", async () => {
  const harness = await makeInstallerHarness();

  assert.equal(harness.window.EviaCourseContext.current().noCourse, true);
  await harness.window.EviaCourseEnrolment.installFromInput("EVIA1:ST0095");

  const installed = JSON.parse(harness.storage.getItem("nisi-installed-course-packs-v1"));
  const timeline = JSON.parse(harness.storage.getItem("evia-course-timeline"));
  const receipt = JSON.parse(harness.storage.getItem("evia-course-enrolment-v1"));
  const active = harness.window.EviaCourseContext.current();

  assert.equal(installed["st0095-v1-2"].standardId, "ST0095");
  assert.equal(timeline.courseId, "st0095-v1-2");
  assert.equal(receipt.enrolmentId, "ST0095");
  assert.equal(receipt.packageVersion, "1.2");
  assert.equal(active.noCourse, undefined);
  assert.equal(active.courseId, "st0095-v1-2");
  assert.equal(active.totalKsb, 59);
  assert.equal(active.dataPrefix, "nisi-pack-active");
  assert.equal(harness.reloadCount, 1);
  assert.equal(harness.loggedErrors.length, 0);
  assert.match(harness.statusNode.textContent, /installed\. Opening Evia/i);
  assert.ok(
    harness.requestedUrls.some((url) =>
      url.endsWith("/Evia_beta/course-packs/Bricklayer_ST0095_v1.2.nisi"),
    ),
  );
});

test("manual ST0095 enrolment still installs when the remote registry is unavailable", async () => {
  const harness = await makeInstallerHarness({ registryOnline: false });

  const resolved = await harness.window.EviaCourseRegistry.resolve("ST0095");
  assert.equal(resolved.ok, true);
  assert.equal(resolved.course.packageId, "st0095-v1-2");

  await harness.window.EviaCourseEnrolment.installFromInput("ST0095");
  assert.equal(harness.window.EviaCourseContext.current().courseId, "st0095-v1-2");
  assert.equal(harness.reloadCount, 1);
  assert.equal(harness.loggedErrors.length, 0);
});

test("the cross-browser QR decoder loads before the enrolment controller", async () => {
  const html = await read("index.html");
  const decoder = html.indexOf("assets/jsQR-1.4.0.js?v=78");
  const enrolment = html.indexOf("assets/evia-course-enrolment.js?v=78");

  assert.ok(decoder > 0, "the QR decoder should be included");
  assert.ok(enrolment > decoder, "the QR decoder should load first");
  assert.ok((await read("assets/jsQR-1.4.0.js")).includes('root["jsQR"] = factory()'));
});

test("unpublished courses are refused without changing the learner device", async () => {
  const harness = await makeInstallerHarness();

  await harness.window.EviaCourseEnrolment.installFromInput("ST0264-SITE");

  assert.equal(harness.storage.getItem("nisi-installed-course-packs-v1"), null);
  assert.equal(harness.storage.getItem("evia-course-timeline"), null);
  assert.equal(harness.reloadCount, 0);
  assert.equal(harness.loggedErrors.length, 1);
  assert.equal(harness.statusNode.classList.error, true);
  assert.match(harness.statusNode.textContent, /not ready to install/i);
});

function relativeUrl(value) {
  const raw = typeof value === "string" ? value : value.url;
  return new URL(raw, "https://example.test/Evia_beta/sw.js").href;
}

class MemoryCache {
  constructor() {
    this.values = new Map();
  }

  async put(request, response) {
    this.values.set(relativeUrl(request), response.clone());
  }

  async match(request, options = {}) {
    const wanted = new URL(relativeUrl(request));
    for (const [key, response] of this.values) {
      const candidate = new URL(key);
      if (options.ignoreSearch) {
        wanted.search = "";
        candidate.search = "";
      }
      if (candidate.href === wanted.href) return response.clone();
    }
    return undefined;
  }
}

test("v78 replaces the legacy shell and serves the complete installed app offline", async () => {
  const handlers = new Map();
  const stores = new Map([["evia-shell-v75", new MemoryCache()]]);
  const legacy = stores.get("evia-shell-v75");
  await legacy.put("./index.html", new Response('<meta name="evia-app-version" content="75">'));
  let online = true;
  let claimed = false;

  const caches = {
    async delete(name) {
      return stores.delete(name);
    },
    async has(name) {
      return stores.has(name);
    },
    async keys() {
      return [...stores.keys()];
    },
    async match(request, options) {
      for (const cache of stores.values()) {
        const match = await cache.match(request, options);
        if (match) return match;
      }
      return undefined;
    },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new MemoryCache());
      return stores.get(name);
    },
  };
  const fetchMock = async (input) => {
    if (!online) throw new TypeError("offline");
    const url = new URL(relativeUrl(input));
    let localPath = url.pathname.replace(/^\/Evia_beta\/?/, "");
    if (!localPath || localPath.endsWith("/")) localPath += "index.html";
    try {
      return new Response(await read(localPath), { status: 200 });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  };
  const self = {
    addEventListener(type, handler) {
      handlers.set(type, handler);
    },
    clients: {
      async claim() {
        claimed = true;
      },
    },
    location: {
      href: "https://example.test/Evia_beta/sw.js",
      origin: "https://example.test",
    },
    async skipWaiting() {},
  };
  vm.runInContext(await read("sw.js"), vm.createContext({
    Response,
    URL,
    caches,
    fetch: fetchMock,
    self,
  }), { filename: "sw.js" });

  let installWork;
  handlers.get("install")({ waitUntil(value) { installWork = value; } });
  await installWork;
  assert.equal(await caches.has("evia-beta-shell-v78"), true);

  let activateWork;
  handlers.get("activate")({ waitUntil(value) { activateWork = value; } });
  await activateWork;
  assert.equal(claimed, true);
  assert.equal(await caches.has("evia-shell-v75"), false);

  online = false;
  const offlineNavigate = {
    method: "GET",
    mode: "navigate",
    url: "https://example.test/Evia_beta/",
  };
  let navigationResponse;
  handlers.get("fetch")({
    request: offlineNavigate,
    respondWith(value) {
      navigationResponse = value;
    },
  });
  const offlineHtml = await (await navigationResponse).text();
  assert.match(offlineHtml, /evia-app-version" content="78"/);
  assert.match(offlineHtml, /evia-course-enrolment\.js\?v=78/);

  for (const resource of [
    "assets/evia-beta-isolation.js?v=78",
    "course-delivery/registry-v1.json?v=78",
    "assets/jsQR-1.4.0.js?v=78",
    "course-packs/Bricklayer_ST0095_v1.2.nisi",
  ]) {
    const request = {
      method: "GET",
      mode: "same-origin",
      url: `https://example.test/Evia_beta/${resource}`,
    };
    let responsePromise;
    handlers.get("fetch")({ request, respondWith(value) { responsePromise = value; } });
    const response = await responsePromise;
    assert.equal(response.ok, true, `${resource} should be available offline`);
  }
});
