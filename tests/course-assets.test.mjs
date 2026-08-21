import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const absolute = (relativePath) => path.join(root, relativePath);
const read = (relativePath) => readFile(absolute(relativePath), "utf8");
const json = async (relativePath) => JSON.parse(await read(relativePath));

test("all seven labelled PNGs decode to their exact permanent Evia payloads", async () => {
  const manifest = await json("course-delivery/qr/manifest-v1.json");
  assert.equal(manifest.eviaQrManifest, 1);
  assert.equal(manifest.labelled, true);
  assert.equal(manifest.courses.length, 7);

  const qrContext = { module: { exports: {} }, exports: {} };
  vm.createContext(qrContext);
  vm.runInContext(await read("assets/jsQR-1.4.0.js"), qrContext, { filename: "assets/jsQR-1.4.0.js" });
  const jsQR = qrContext.module.exports;
  const payloads = new Set();

  for (const course of manifest.courses) {
    const { data, info } = await sharp(absolute(`course-delivery/qr/${course.file}`))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height, {
      inversionAttempts: "attemptBoth",
    });
    assert.equal(decoded?.data, course.payload, `${course.file} should decode exactly`);
    assert.equal(info.width, course.width);
    assert.equal(info.height, course.height);
    assert.ok(info.height > info.width, `${course.file} should include a caption area`);
    assert.equal(course.payload, `EVIA1:${course.code}`);
    assert.ok(course.name.length > 2);
    payloads.add(course.payload);
  }
  assert.equal(payloads.size, 7);

  const page = await read("course-delivery/qr/all-courses.html");
  for (const course of manifest.courses) {
    assert.match(page, new RegExp(course.file.replaceAll(".", "\\.")));
    assert.ok(page.includes(course.name.replace("&", "&amp;")));
    assert.ok(page.includes(course.code));
  }
  assert.equal((page.match(/Download PNG/g) ?? []).length, 7);
});

test("all seven registry entries point to verified install packs and mapped 24-question banks", async () => {
  const registry = await json("course-delivery/registry-v1.json");
  const index = await json("course-delivery/question-banks/index-v1.json");
  assert.equal(registry.courses.length, 7);
  assert.equal(index.banks.length, 7);
  assert.equal(index.totalQuestions, 168);
  assert.equal(index.totalDiscussionScenarios, 168);

  const packCache = new Map();
  const questionIds = new Set();
  for (const entry of registry.courses) {
    assert.equal(entry.publishable, true);
    assert.equal(entry.qrPayload, `EVIA1:${entry.enrolmentId}`);
    assert.equal(entry.content.discussion, "available-24-scenario-coach");
    const packRelative = path.posix.normalize(path.posix.join("course-delivery", entry.packagePath));
    const bankRelative = path.posix.join("course-delivery", entry.questionBankPath);
    await access(absolute(packRelative));
    await access(absolute(bankRelative));

    let pack = packCache.get(packRelative);
    if (!pack) {
      pack = await json(packRelative);
      packCache.set(packRelative, pack);
    }
    assert.equal(String(pack.id), entry.packageId);
    assert.equal(String(pack.version), entry.currentPackageVersion);
    assert.equal(String(pack.familyId ?? pack.standardId ?? pack.id), entry.packageFamilyId);
    const allowed = new Set(
      (entry.pathwayId
        ? pack.pathways.find((pathway) => pathway.id === entry.pathwayId)?.codes
        : pack.codes
      ).map(String),
    );
    assert.ok(allowed.size > 0, `${entry.enrolmentId} should expose mapped course criteria`);

    const bank = await json(bankRelative);
    assert.equal(bank.eviaQuestionBank, 1);
    assert.equal(bank.bankVersion, "1.1");
    assert.equal(bank.enrolmentId, entry.enrolmentId);
    assert.equal(bank.qualificationId, entry.qualificationId);
    assert.equal(bank.pathwayId, entry.pathwayId);
    assert.equal(bank.questions.length, 24);
    assert.equal(bank.questionsPerMock, 10);
    assert.equal(bank.discussionScenarioVersion, 1);
    assert.equal(bank.discussionScenariosPerPractice, 5);
    assert.equal(bank.discussionStrengthLevels, 4);
    assert.match(bank.sourceNote, /not official/i);
    for (const question of bank.questions) {
      assert.equal(question.options.length, 4);
      assert.ok(Number.isInteger(question.correctIndex));
      assert.ok(question.correctIndex >= 0 && question.correctIndex < 4);
      assert.ok(question.mapsTo.length > 0);
      assert.ok(question.mapsTo.every((code) => allowed.has(String(code))), `${question.id} should map inside its route`);
      assert.equal(questionIds.has(question.id), false, `${question.id} should be globally unique`);
      questionIds.add(question.id);
    }

    const indexed = index.banks.find((item) => item.enrolmentId === entry.enrolmentId);
    assert.equal(indexed?.path, path.posix.basename(entry.questionBankPath));
    assert.equal(indexed?.questionCount, 24);
    assert.equal(indexed?.discussionScenarioCount, 24);
    assert.equal(indexed?.discussionScenariosPerPractice, 5);
  }
  assert.equal(questionIds.size, 168);
});

test("TOC exposes all seven labelled QR downloads and keeps pack management available", async () => {
  const toc = await read("assets/evia-toc.js");
  const css = await read("assets/evia-toc.css");
  const html = await read("index.html");
  const manifest = await json("course-delivery/qr/manifest-v1.json");

  assert.match(toc, /data-course-qr-codes>Course QR Codes</);
  assert.match(toc, /<h2>Course QR Codes<\/h2>/);
  assert.match(toc, /data-qr-manage-packs>Manage installed packs</);
  assert.doesNotMatch(toc, />Manage course packs</);
  assert.match(toc, /data-copy-course-code/);
  assert.match(css, /\.evia-course-qr-grid/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(html, /assets\/evia-toc\.js\?v=81/);
  assert.match(html, /assets\/evia-toc\.css\?v=81/);
  for (const course of manifest.courses) {
    assert.ok(toc.includes(`code:"${course.code}"`));
    assert.ok(toc.includes(`file:"${course.file}"`));
  }
});

test("ARP selects all seven banks and builds 24 graded discussion scenarios for each pathway", async () => {
  const registry = await json("course-delivery/registry-v1.json");
  let current = null;
  const requested = [];
  const fetchMock = async (input) => {
    const url = new URL(String(input));
    requested.push(url.pathname);
    const marker = "/Evia_beta/course-delivery/";
    const offset = url.pathname.indexOf(marker);
    if (offset < 0) return new Response("Not found", { status: 404 });
    const relative = `course-delivery/${url.pathname.slice(offset + marker.length)}`;
    try {
      return Response.json(await json(relative));
    } catch {
      return new Response("Not found", { status: 404 });
    }
  };
  const document = {
    baseURI: "https://example.test/Evia_beta/",
    readyState: "loading",
    addEventListener() {},
    querySelector() { return null; },
  };
  const window = {
    addEventListener() {},
    document,
    EviaCourseContext: { current: () => current },
    EviaCourseRegistry: { registry: async () => registry },
    fetch: fetchMock,
  };
  window.window = window;
  const context = vm.createContext({
    Array,
    Date,
    Error,
    JSON,
    Math,
    Number,
    Object,
    Promise,
    RegExp,
    Response,
    Set,
    String,
    URL,
    document,
    fetch: fetchMock,
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout() {},
    window,
  });
  vm.runInContext(await read("assets/evia-arp-v80.js"), context, { filename: "assets/evia-arp-v80.js" });
  vm.runInContext(await read("assets/evia-arp-discussion-v82.js"), context, { filename: "assets/evia-arp-discussion-v82.js" });

  const profiles = [
    ["ST0095", { courseId: "st0095-v1-2", packFamilyId: "ST0095", pathway: "" }],
    ["ST0264-SITE", { courseId: "st0264-v1-4", packFamilyId: "ST0264", pathway: "site-carpenter" }],
    ["ST0264-AJ", { courseId: "st0264-v1-4", packFamilyId: "ST0264", pathway: "architectural-joiner" }],
    ["6570-05-THIN", { courseId: "6570-05", packFamilyId: "6570-05", pathway: "thin" }],
    ["6570-05-REPAIR", { courseId: "6570-05", packFamilyId: "6570-05", pathway: "repair" }],
    ["6570-05-SPECIALIST", { courseId: "6570-05", packFamilyId: "6570-05", pathway: "specialist" }],
    ["6570-05-DRAINAGE", { courseId: "6570-05", packFamilyId: "6570-05", pathway: "drainage" }],
  ];
  for (const [enrolmentId, profile] of profiles) {
    current = profile;
    const bank = await window.EviaArp.currentBank(true);
    assert.equal(bank.enrolmentId, enrolmentId);
    assert.equal(bank.questions.length, 24);
    const scenarios = window.EviaArpDiscussion.discussionItems(bank);
    assert.equal(scenarios.length, 24);
    assert.equal(new Set(Array.from(scenarios, (scenario) => scenario.id)).size, 24);
    for (const [index, scenario] of scenarios.entries()) {
      const source = bank.questions[index];
      const correct = source.options[source.correctIndex];
      assert.equal(scenario.sourceQuestionId, source.id);
      assert.deepEqual([...scenario.mapsTo], [...source.mapsTo]);
      assert.equal(scenario.responses.length, 4);
      assert.deepEqual(Array.from(scenario.responses, (response) => response.strength), [1, 2, 3, 4]);
      assert.ok(Array.from(scenario.responses).every((response) => response.text.includes(correct)));
      assert.ok(Array.from(scenario.responses).every((response) => response.feedback.length > 40));
      assert.ok(scenario.followUp.endsWith("?"));
    }
  }
  assert.equal(requested.length, 7);
});

test("Discussion Coach includes graded choice, voice, transcript and mock flows", async () => {
  const script = await read("assets/evia-arp-discussion-v82.js");
  const css = await read("assets/evia-arp-v82.css");
  const html = await read("index.html");

  assert.match(script, /data-discussion-mode="learn"/);
  assert.match(script, /data-discussion-mode="practice"/);
  assert.match(script, /data-discussion-mode="mock"/);
  assert.match(script, /Speak for about 60–90 seconds/);
  assert.match(script, /window\.MediaRecorder/);
  assert.match(script, /window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/);
  assert.match(script, /Evia follow-up/);
  assert.match(script, /Every response is factually correct/);
  assert.match(css, /\.evia-arp-voice-card/);
  assert.match(css, /\.evia-arp-strength-key/);
  assert.match(html, /assets\/evia-arp-v82\.css\?v=82/);
  assert.match(html, /assets\/evia-arp-discussion-v82\.js\?v=82/);
});
