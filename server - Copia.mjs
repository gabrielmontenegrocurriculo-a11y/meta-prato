import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { createHash } from "node:crypto";

const root = join(process.cwd(), "dist");
const port = Number(process.env.PORT ?? 5173);
const host = process.env.HOST;
const dataDir = process.env.DATA_DIR ?? join(process.cwd(), "work");
const dbPath = join(dataDir, "patients-db.json");
const appDataPath = join(dataDir, "app-data-db.json");

const patients = [
  { id: "paciente-gabriel", name: "Gabriel Santos", nickname: "Guerreiro", email: "gabriel@metaprato.app", cpf: "11122233344", passwordHash: "a2ca37fe6fdc490b8f7ce841e1701a169d2b1697c6b5b5c63f94abb8f9b6d6dd", birthDate: "1994-03-18", sex: "Masculino", age: 32, heightCm: 178, initialWeight: 160, currentWeight: 160, targetWeight: 100, goal30: 145, goal60: 130, goal90: 115, doctor: "Equipe Meta Prato", plan: "Controle de gramas, agua e rotina", notes: "Foco em constancia.", acceptedTerms: true, acceptedPrivacy: true, emailVerified: true, firstAccessComplete: true },
  { id: "paciente-mariana", name: "Mariana Costa", nickname: "Mari", email: "mariana@metaprato.app", cpf: "22233344455", passwordHash: "a2ca37fe6fdc490b8f7ce841e1701a169d2b1697c6b5b5c63f94abb8f9b6d6dd", birthDate: "1985-07-10", sex: "Feminino", age: 41, heightCm: 165, initialWeight: 112, currentWeight: 112, targetWeight: 82, goal30: 105, goal60: 96, goal90: 88, doctor: "Dra. Helena Rocha", plan: "Rotina alimentar", notes: "Priorizar agua.", acceptedTerms: true, acceptedPrivacy: true, emailVerified: true, firstAccessComplete: true },
  { id: "paciente-roberto", name: "Roberto Lima", nickname: "Beto", email: "roberto@metaprato.app", cpf: "33344455566", passwordHash: "a2ca37fe6fdc490b8f7ce841e1701a169d2b1697c6b5b5c63f94abb8f9b6d6dd", birthDate: "1973-11-22", sex: "Masculino", age: 53, heightCm: 172, initialWeight: 138, currentWeight: 138, targetWeight: 95, goal30: 130, goal60: 119, goal90: 108, doctor: "Dr. Paulo Mendes", plan: "Monitoramento diario", notes: "Sem punicoes.", acceptedTerms: true, acceptedPrivacy: true, emailVerified: true, firstAccessComplete: true }
];

const loadDbPatients = () => {
  try {
    return existsSync(dbPath) ? JSON.parse(readFileSync(dbPath, "utf8")) : [];
  } catch {
    return [];
  }
};

const ensureWorkDir = () => mkdirSync(dataDir, { recursive: true });
const saveDbPatients = (items) => {
  ensureWorkDir();
  writeFileSync(dbPath, JSON.stringify(items, null, 2));
};
const allPatients = () => [...patients, ...loadDbPatients()];
const loadAppDataDb = () => {
  try {
    return existsSync(appDataPath) ? JSON.parse(readFileSync(appDataPath, "utf8")) : {};
  } catch {
    return {};
  }
};
const saveAppDataDb = (items) => {
  ensureWorkDir();
  writeFileSync(appDataPath, JSON.stringify(items, null, 2));
};
const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();
const onlyDigits = (value) => String(value ?? "").replace(/\D/g, "");
const hashPassword = (password) => createHash("sha256").update(String(password ?? "")).digest("hex");
const passwordIsStrong = (password) =>
  String(password ?? "").length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json; charset=utf-8"
};

const sendJson = (response, status, payload) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
};

const readBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 30_000_000) request.destroy();
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });

const publicPatient = (patient) => {
  const { password, passwordHash, ...safePatient } = patient;
  return safePatient;
};

const findPatientById = (patientId) => allPatients().find((patient) => patient.id === patientId);

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (url.pathname === "/api/patients" && request.method === "GET") {
    sendJson(response, 200, allPatients().map(publicPatient));
    return;
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    sendJson(response, 200, {
      ok: true,
      app: "Meta Prato",
      storage: dataDir,
      patients: allPatients().length,
      time: new Date().toISOString()
    });
    return;
  }

  if (url.pathname === "/api/login" && request.method === "POST") {
    try {
      const body = JSON.parse(await readBody(request));
      const email = normalizeEmail(body.email);
      const passwordHash = hashPassword(body.password);
      const patient = allPatients().find((item) => normalizeEmail(item.email) === email && item.passwordHash === passwordHash);
      if (!patient) {
        sendJson(response, 401, { ok: false, message: "Email ou senha incorretos." });
        return;
      }
      sendJson(response, 200, { ok: true, patient: publicPatient(patient) });
    } catch {
      sendJson(response, 400, { ok: false, message: "JSON invalido." });
    }
    return;
  }

  if (url.pathname === "/api/register" && request.method === "POST") {
    try {
      const body = JSON.parse(await readBody(request));
      const email = normalizeEmail(body.email);
      const confirmEmail = normalizeEmail(body.confirmEmail);
      const cpf = onlyDigits(body.cpf);
      const existing = allPatients();
      if (!String(body.name ?? "").trim() || !email.includes("@") || email !== confirmEmail) {
        sendJson(response, 400, { ok: false, message: "Informe nome e emails iguais." });
        return;
      }
      if (!passwordIsStrong(body.password) || body.password !== body.confirmPassword) {
        sendJson(response, 400, { ok: false, message: "Senha fraca ou confirmacao diferente." });
        return;
      }
      if (!body.acceptedTerms || !body.acceptedPrivacy) {
        sendJson(response, 400, { ok: false, message: "Aceite os termos e a privacidade." });
        return;
      }
      if (existing.some((item) => normalizeEmail(item.email) === email)) {
        sendJson(response, 409, { ok: false, message: "Email ja cadastrado." });
        return;
      }
      const initialWeight = Number(body.initialWeight) || 160;
      const targetWeight = Number(body.targetWeight) || 100;
      const distance = Math.max(1, initialWeight - targetWeight);
      const patient = {
        id: `paciente-${Date.now()}`,
        name: String(body.name).trim(),
        nickname: String(body.nickname ?? "").trim(),
        email,
        cpf,
        passwordHash: hashPassword(body.password),
        birthDate: String(body.birthDate ?? ""),
        sex: String(body.sex ?? ""),
        age: Number(body.age) || 18,
        heightCm: Number(body.heightCm) || 170,
        initialWeight,
        currentWeight: initialWeight,
        targetWeight,
        goal30: Math.max(targetWeight, Math.round((initialWeight - distance * 0.25) * 10) / 10),
        goal60: Math.max(targetWeight, Math.round((initialWeight - distance * 0.5) * 10) / 10),
        goal90: Math.max(targetWeight, Math.round((initialWeight - distance * 0.75) * 10) / 10),
        doctor: String(body.doctor ?? "Equipe Meta Prato"),
        plan: String(body.plan ?? "Controle de rotina, agua e refeicoes"),
        notes: String(body.notes ?? "Foco em constancia."),
        acceptedTerms: true,
        acceptedPrivacy: true,
        emailVerified: false,
        firstAccessComplete: false
      };
      const custom = [...loadDbPatients(), patient];
      ensureWorkDir();
      saveDbPatients(custom);
      sendJson(response, 201, { ok: true, patient: publicPatient(patient) });
    } catch {
      sendJson(response, 400, { ok: false, message: "JSON invalido." });
    }
    return;
  }

  if (url.pathname.startsWith("/api/data/") && request.method === "GET") {
    const patientId = decodeURIComponent(url.pathname.replace("/api/data/", ""));
    if (!findPatientById(patientId)) {
      sendJson(response, 404, { ok: false, message: "Paciente nao encontrado." });
      return;
    }
    const db = loadAppDataDb();
    sendJson(response, 200, { ok: true, data: db[patientId] ?? null });
    return;
  }

  if (url.pathname.startsWith("/api/data/") && request.method === "PUT") {
    try {
      const patientId = decodeURIComponent(url.pathname.replace("/api/data/", ""));
      if (!findPatientById(patientId)) {
        sendJson(response, 404, { ok: false, message: "Paciente nao encontrado." });
        return;
      }
      const body = JSON.parse(await readBody(request));
      const db = loadAppDataDb();
      db[patientId] = {
        ...(body.data ?? body),
        patientId,
        serverUpdatedAt: new Date().toISOString()
      };
      saveAppDataDb(db);
      sendJson(response, 200, { ok: true, data: db[patientId] });
    } catch {
      sendJson(response, 400, { ok: false, message: "JSON invalido." });
    }
    return;
  }

  if (url.pathname.startsWith("/api/patients/") && request.method === "PUT") {
    try {
      const patientId = decodeURIComponent(url.pathname.replace("/api/patients/", ""));
      const body = JSON.parse(await readBody(request));
      const custom = loadDbPatients();
      const builtIn = patients.find((patient) => patient.id === patientId);
      const existing = custom.find((patient) => patient.id === patientId) ?? builtIn;
      if (!existing) {
        sendJson(response, 404, { ok: false, message: "Paciente nao encontrado." });
        return;
      }
      const safeUpdate = { ...body };
      delete safeUpdate.password;
      delete safeUpdate.passwordHash;
      const updated = { ...existing, ...safeUpdate, id: patientId, email: normalizeEmail(existing.email) };
      const nextCustom = custom.some((patient) => patient.id === patientId)
        ? custom.map((patient) => (patient.id === patientId ? { ...patient, ...updated } : patient))
        : [...custom, { ...updated, passwordHash: existing.passwordHash }];
      ensureWorkDir();
      saveDbPatients(nextCustom);
      sendJson(response, 200, { ok: true, patient: publicPatient({ ...updated, passwordHash: existing.passwordHash }) });
    } catch {
      sendJson(response, 400, { ok: false, message: "JSON invalido." });
    }
    return;
  }

  const cleanPath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(root, cleanPath === "/" ? "index.html" : cleanPath);

  if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(root, "index.html");
  }

  if (!existsSync(filePath)) {
    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Rode npm run build antes de iniciar o servidor.");
    return;
  }

  response.setHeader("Content-Type", types[extname(filePath)] ?? "application/octet-stream");
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  const visibleHost = host ?? "localhost";
  console.log(`Meta Prato servidor ativo em http://${visibleHost}:${port}/`);
  console.log(`Tambem pode abrir http://127.0.0.1:${port}/`);
  console.log(`API pacientes em http://${visibleHost}:${port}/api/patients`);
});
