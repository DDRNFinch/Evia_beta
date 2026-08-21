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
  const packs = {
    "Bricklayer_ST0095_v1.2.nisi": JSON.parse(await read("course-packs/Bricklayer_ST0095_v1.2.nisi")),
    "Carpentry_Joinery_ST0264_v1.4.nisi": JSON.parse(await read("course-packs/Carpentry_Joinery_ST0264_v1.4.nisi")),
    "Trowel_Occupations_6570-05_v1.nisi": JSON.parse(await read("course-packs/Trowel_Occupations_6570-05_v1.nisi")),
  };
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
    const filename = Object.keys(packs).find((name) => url.includes(`course-packs/${name}`));
    if (filename) {
      return Response.json(packs[filename]);
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
    loggedErrors,
    packs,
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

test("all seven permanent manual and QR values resolve to publishable course packages", async () => {
  const harness = await makeInstallerHarness();

  assert.equal(harness.registry.courses.length, 7);
  for (const course of harness.registry.courses) {
    for (const value of [course.enrolmentId, course.qrPayload.toLowerCase()]) {
      const resolved = await harness.window.EviaCourseRegistry.resolve(value);
      assert.equal(resolved.ok, true, `${value} should resolve`);
      assert.equal(resolved.enrolmentId, course.enrolmentId);
      assert.equal(resolved.course.packageId, course.packageId);
      assert.equal(resolved.course.packagePath, course.packagePath);
      assert.match(resolved.course.questionBankPath, /question-banks\/.+-v1\.json$/);
      assert.match(resolved.course.practicalBankPath, /practical-banks\/.+-v1\.json$/);
      assert.equal(resolved.course.content.practical, "available-12-task-coach");
    }
  }
});

test("all seven QR routes install, activate, persist and reload through the real installer", async () => {
  const expected = {
    ST0095: { packageId: "st0095-v1-2", pathway: "", total: 59 },
    "ST0264-SITE": { packageId: "st0264-v1-4", pathway: "site-carpenter", total: 57 },
    "ST0264-AJ": { packageId: "st0264-v1-4", pathway: "architectural-joiner", total: 57 },
    "6570-05-THIN": { packageId: "6570-05", pathway: "thin", total: 238 },
    "6570-05-REPAIR": { packageId: "6570-05", pathway: "repair", total: 239 },
    "6570-05-SPECIALIST": { packageId: "6570-05", pathway: "specialist", total: 239 },
    "6570-05-DRAINAGE": { packageId: "6570-05", pathway: "drainage", total: 240 },
  };

  for (const [enrolmentId, wanted] of Object.entries(expected)) {
    const harness = await makeInstallerHarness();
    assert.equal(harness.window.EviaCourseContext.current().noCourse, true);
    await harness.window.EviaCourseEnrolment.installFromInput(`EVIA1:${enrolmentId}`);

    const installed = JSON.parse(harness.storage.getItem("nisi-installed-course-packs-v1"));
    const timeline = JSON.parse(harness.storage.getItem("evia-course-timeline"));
    const receipt = JSON.parse(harness.storage.getItem("evia-course-enrolment-v1"));
    const active = harness.window.EviaCourseContext.current();

    assert.ok(installed[wanted.packageId], `${enrolmentId} pack should be installed`);
    assert.equal(timeline.courseId, wanted.packageId);
    assert.equal(timeline.pathway ?? "", wanted.pathway);
    assert.equal(receipt.enrolmentId, enrolmentId);
    assert.equal(active.courseId, wanted.packageId);
    assert.equal(active.pathway ?? "", wanted.pathway);
    assert.equal(active.totalKsb, wanted.total);
    assert.equal(active.dataPrefix, "nisi-pack-active");
    assert.equal(harness.reloadCount, 1);
    assert.equal(harness.loggedErrors.length, 0);
    assert.match(harness.statusNode.textContent, /installed\. Opening Evia/i);
  }
});

test("all seven manual codes remain bundled when the remote registry is unavailable", async () => {
  const expected = ["ST0095", "ST0264-SITE", "ST0264-AJ", "6570-05-THIN", "6570-05-REPAIR", "6570-05-SPECIALIST", "6570-05-DRAINAGE"];
  for (const enrolmentId of expected) {
    const harness = await makeInstallerHarness({ registryOnline: false });
    const resolved = await harness.window.EviaCourseRegistry.resolve(enrolmentId);
    assert.equal(resolved.ok, true, `${enrolmentId} should use the bundled registry`);
    assert.match(resolved.course.practicalBankPath, /practical-banks\/.+-v1\.json$/);
    await harness.window.EviaCourseEnrolment.installFromInput(enrolmentId);
    assert.equal(harness.reloadCount, 1);
    assert.equal(harness.loggedErrors.length, 0);
  }
});

test("the cross-browser QR decoder loads before the enrolment controller", async () => {
  const html = await read("index.html");
  const decoder = html.indexOf("assets/jsQR-1.4.0.js?v=80");
  const enrolment = html.indexOf("assets/evia-course-enrolment.js?v=80");

  assert.ok(decoder > 0, "the QR decoder should be included");
  assert.ok(enrolment > decoder, "the QR decoder should load first");
  assert.ok((await read("assets/jsQR-1.4.0.js")).includes('root["jsQR"] = factory()'));
});

test("unknown course codes are refused without changing the learner device", async () => {
  const harness = await makeInstallerHarness();

  await harness.window.EviaCourseEnrolment.installFromInput("NOT-A-COURSE");

  assert.equal(harness.storage.getItem("nisi-installed-course-packs-v1"), null);
  assert.equal(harness.storage.getItem("evia-course-timeline"), null);
  assert.equal(harness.reloadCount, 0);
  assert.equal(harness.loggedErrors.length, 1);
  assert.equal(harness.statusNode.classList.error, true);
  assert.match(harness.statusNode.textContent, /not recognised/i);
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

test("v84 replaces the legacy shell and serves Mini Milos, Discussion and Practical Coaches offline", async () => {
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
  assert.equal(await caches.has("evia-beta-shell-v84"), true);

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
  assert.match(offlineHtml, /evia-app-version" content="84"/);
  assert.match(offlineHtml, /course-registry\.js\?v=83/);
  assert.match(offlineHtml, /evia-course-enrolment\.js\?v=80/);
  assert.match(offlineHtml, /evia-arp-v80\.js\?v=80/);
  assert.match(offlineHtml, /evia-arp-discussion-v82\.js\?v=82/);
  assert.match(offlineHtml, /evia-arp-v82\.css\?v=82/);
  assert.match(offlineHtml, /evia-arp-practical-v83\.js\?v=83/);
  assert.match(offlineHtml, /evia-arp-practical-v83\.css\?v=83/);
  assert.match(offlineHtml, /evia-toc\.js\?v=81/);

  for (const resource of [
    "assets/evia-beta-isolation.js?v=80",
    "course-delivery/registry-v1.json?v=83",
    "assets/jsQR-1.4.0.js?v=80",
    "assets/evia-arp-v80.js?v=80",
    "assets/evia-arp-discussion-v82.js?v=82",
    "assets/evia-arp-v82.css?v=82",
    "assets/evia-arp-practical-v83.js?v=83",
    "assets/evia-arp-practical-v83.css?v=83",
    "assets/evia-toc.js?v=81",
    "assets/evia-toc.css?v=81",
    "course-packs/Bricklayer_ST0095_v1.2.nisi",
    "course-packs/Carpentry_Joinery_ST0264_v1.4.nisi",
    "course-packs/Trowel_Occupations_6570-05_v1.nisi",
    "course-delivery/question-banks/ST0264-AJ-v1.json",
    "course-delivery/question-banks/6570-05-DRAINAGE-v1.json",
    "course-delivery/practical-banks/ST0095-v1.json",
    "course-delivery/practical-banks/ST0264-AJ-v1.json",
    "course-delivery/practical-banks/6570-05-DRAINAGE-v1.json",
    "course-delivery/qr/ST0264-SITE.png",
    "course-delivery/qr/6570-05-SPECIALIST.png",
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

  const qrRequest = {
    method: "GET",
    mode: "navigate",
    url: "https://example.test/Evia_beta/course-delivery/qr/ST0095.png",
  };
  let qrResponsePromise;
  handlers.get("fetch")({ request: qrRequest, respondWith(value) { qrResponsePromise = value; } });
  const qrBody = await (await qrResponsePromise).text();
  assert.doesNotMatch(qrBody, /evia-app-version/);
  assert.ok(qrBody.length > 1000, "the QR PNG should be served instead of the app shell");

  const downloadsRequest = {
    method: "GET",
    mode: "navigate",
    url: "https://example.test/Evia_beta/course-delivery/qr/all-courses.html",
  };
  let downloadsResponsePromise;
  handlers.get("fetch")({ request: downloadsRequest, respondWith(value) { downloadsResponsePromise = value; } });
  const downloadsBody = await (await downloadsResponsePromise).text();
  assert.match(downloadsBody, /Evia course QR codes/);
  assert.doesNotMatch(downloadsBody, /evia-app-version/);
});
