import mongoose from "mongoose";
import dns from "node:dns/promises";
import net from "node:net";

mongoose.set("bufferCommands", false);

const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const redactMongoUri = (uri) => uri.replace(/\/\/([^:@]+):([^@]+)@/, "//$1:<password>@");

const parseMongoUri = (mongoUri) => {
  const parsed = new URL(mongoUri);
  const databaseName = parsed.pathname.replace(/^\//, "");

  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    username: decodeURIComponent(parsed.username || ""),
    hasPassword: Boolean(parsed.password),
    databaseName,
    searchParams: Object.fromEntries(parsed.searchParams.entries()),
  };
};

const isLikelyAtlasHostname = (hostname) =>
  hostname.endsWith(".mongodb.net") || hostname.includes(".mongodb.net");

const checkTcpConnectivity = (host, port, timeoutMS) =>
  new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    socket.setTimeout(timeoutMS);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error(`TCP connection to ${host}:${port} timed out after ${timeoutMS}ms`));
    });
    socket.once("error", reject);
  });

const logStepSuccess = (step, details = {}) => {
  console.log(`[database:diagnostic] ${step}: ok`, details);
};

const logStepFailure = (step, error, details = {}) => {
  console.error(`[database:diagnostic] ${step}: failed`, {
    name: error.name,
    message: error.message,
    ...details,
  });
};

const getMongoOptions = () => ({
  autoCreate: false,
  autoIndex: false,
  maxPoolSize: numberFromEnv("MONGODB_MAX_POOL_SIZE", 20),
  minPoolSize: numberFromEnv("MONGODB_MIN_POOL_SIZE", 1),
  maxIdleTimeMS: numberFromEnv("MONGODB_MAX_IDLE_TIME_MS", 60000),
  connectTimeoutMS: numberFromEnv("MONGODB_CONNECT_TIMEOUT_MS", 15000),
  serverSelectionTimeoutMS: numberFromEnv("MONGODB_SERVER_SELECTION_TIMEOUT_MS", 15000),
  socketTimeoutMS: numberFromEnv("MONGODB_SOCKET_TIMEOUT_MS", 45000),
  heartbeatFrequencyMS: numberFromEnv("MONGODB_HEARTBEAT_FREQUENCY_MS", 10000),
  retryReads: true,
  retryWrites: true,
});

export const validateMongoAtlasFlow = async () => {
  const mongoUri = process.env.MONGODB_URI;
  const diagnostics = [];

  const record = async (step, action) => {
    const startedAt = Date.now();

    try {
      const details = await action();
      const result = {
        step,
        ok: true,
        durationMS: Date.now() - startedAt,
        details,
      };

      diagnostics.push(result);
      logStepSuccess(step, details);
      return result;
    } catch (error) {
      const result = {
        step,
        ok: false,
        durationMS: Date.now() - startedAt,
        error: {
          name: error.name,
          message: error.message,
        },
      };

      diagnostics.push(result);
      logStepFailure(step, error);
      return result;
    }
  };

  let parsedUri = null;
  let srvRecords = [];

  await record("Validate MongoDB Atlas URI", async () => {
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not set");
    }

    if (!mongoUri.startsWith("mongodb+srv://")) {
      throw new Error("MONGODB_URI must use mongodb+srv:// for MongoDB Atlas");
    }

    parsedUri = parseMongoUri(mongoUri);

    if (!parsedUri.username || !parsedUri.hasPassword) {
      throw new Error("MONGODB_URI must include a database username and password");
    }

    if (!parsedUri.databaseName) {
      throw new Error("MONGODB_URI must include a database name after the hostname");
    }

    if (!isLikelyAtlasHostname(parsedUri.hostname)) {
      throw new Error(`MONGODB_URI hostname does not look like MongoDB Atlas: ${parsedUri.hostname}`);
    }

    return {
      uri: redactMongoUri(mongoUri),
      hostname: parsedUri.hostname,
      databaseName: parsedUri.databaseName,
      username: parsedUri.username,
      options: parsedUri.searchParams,
    };
  });

  await record("Validate driver timeout options", async () => {
    const options = getMongoOptions();

    if (options.connectTimeoutMS < 5000) {
      throw new Error("connectTimeoutMS is too low for Atlas; use at least 5000ms");
    }

    if (options.serverSelectionTimeoutMS < 5000) {
      throw new Error("serverSelectionTimeoutMS is too low for Atlas; use at least 5000ms");
    }

    return options;
  });

  await record("Validate DNS SRV resolution", async () => {
    if (!parsedUri?.hostname) {
      throw new Error("Cannot resolve DNS because MongoDB URI validation failed");
    }

    srvRecords = await dns.resolveSrv(`_mongodb._tcp.${parsedUri.hostname}`);

    if (!srvRecords.length) {
      throw new Error(`No MongoDB SRV records found for ${parsedUri.hostname}`);
    }

    return {
      srvRecordCount: srvRecords.length,
      records: srvRecords.map((record) => ({
        name: record.name,
        port: record.port,
        priority: record.priority,
        weight: record.weight,
      })),
    };
  });

  await record("Validate DNS TXT options", async () => {
    if (!parsedUri?.hostname) {
      throw new Error("Cannot resolve TXT records because MongoDB URI validation failed");
    }

    const txtRecords = await dns.resolveTxt(parsedUri.hostname);

    return {
      records: txtRecords.map((record) => record.join("")),
    };
  });

  await record("Validate network TCP connectivity", async () => {
    if (!srvRecords.length) {
      throw new Error("Cannot test TCP connectivity because SRV resolution failed");
    }

    const timeoutMS = numberFromEnv("MONGODB_TCP_CHECK_TIMEOUT_MS", 8000);

    await Promise.all(
      srvRecords.map((record) => checkTcpConnectivity(record.name, record.port, timeoutMS))
    );

    return {
      checkedHosts: srvRecords.map((record) => `${record.name}:${record.port}`),
      timeoutMS,
    };
  });

  await record("Validate Atlas IP whitelist and database authentication", async () => {
    if (!mongoUri) {
      throw new Error("Cannot authenticate because MONGODB_URI is not set");
    }

    const tempConnection = await mongoose.createConnection(mongoUri, getMongoOptions()).asPromise();

    try {
      const ping = await tempConnection.db.admin().ping();
      return {
        ping,
        host: tempConnection.host,
        databaseName: tempConnection.name,
        readyState: tempConnection.readyState,
      };
    } finally {
      await tempConnection.close();
    }
  });

  await record("Validate test query", async () => {
    const activeDb = mongoose.connection.readyState === 1
      ? mongoose.connection.db
      : (await mongoose.createConnection(mongoUri, getMongoOptions()).asPromise()).db;

    try {
      const collections = await activeDb
        .listCollections({}, { nameOnly: true })
        .maxTimeMS(numberFromEnv("MONGODB_TEST_QUERY_TIMEOUT_MS", 8000))
        .toArray();

      return {
        databaseName: activeDb.databaseName,
        collectionCount: collections.length,
        collections: collections.map((collection) => collection.name).slice(0, 20),
      };
    } finally {
      if (mongoose.connection.readyState !== 1 && activeDb.client) {
        await activeDb.client.close();
      }
    }
  });

  const ok = diagnostics.every((diagnostic) => diagnostic.ok);

  if (!ok) {
    console.error("[database:diagnostic] MongoDB Atlas validation failed", diagnostics);
  } else {
    console.log("[database:diagnostic] MongoDB Atlas validation completed successfully");
  }

  return { ok, diagnostics };
};

export const dbConnect = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set");
  }

  if (!mongoUri.startsWith("mongodb+srv://")) {
    throw new Error("MONGODB_URI must use the MongoDB Atlas mongodb+srv:// URI format");
  }

  const maxRetries = numberFromEnv("MONGODB_CONNECT_RETRIES", 5);
  const retryDelayMS = numberFromEnv("MONGODB_RETRY_DELAY_MS", 3000);
  const options = getMongoOptions();

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      console.log(`[database] Connecting to MongoDB Atlas... attempt ${attempt}/${maxRetries}`);
      const conn = await mongoose.connect(mongoUri, options);
      console.log(`[database] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

      return conn;
    } catch (error) {
      console.error(`[database] Connection attempt ${attempt}/${maxRetries} failed:`, {
        name: error.name,
        message: error.message,
      });

      if (attempt === maxRetries) {
        console.error("[database] All MongoDB connection attempts failed");
        throw error;
      }

      await wait(retryDelayMS * attempt);
    }
  }
};

export const isDbConnected = () => mongoose.connection.readyState === 1;

mongoose.connection.on("disconnected", () => {
  console.warn("[database] MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("[database] MongoDB reconnected");
});

mongoose.connection.on("error", (error) => {
  console.error("[database] MongoDB runtime error:", error);
});
