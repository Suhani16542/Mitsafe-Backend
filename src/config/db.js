import mongoose from 'mongoose';
import logger from './logger.js';

/**
 * Safely sanitizes and extracts non-sensitive connection metadata from MongoDB URI.
 * Never exposes passwords, usernames, or secrets.
 */
export const getSanitizedUriInfo = (uri) => {
  if (!uri) return { exists: false };
  try {
    const regex = /^(mongodb(?:\+srv)?:\/\/)(?:([^:]+)(?::([^@]+))?@)?([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/;
    const match = uri.match(regex);
    if (!match) {
      return {
        exists: true,
        validFormat: false,
      };
    }
    const [, protocol, user, pass, host, dbName, queryParams] = match;
    return {
      exists: true,
      validFormat: true,
      protocol: protocol.replace('://', ''),
      host: host,
      dbName: dbName || '(default/test)',
      hasAuth: Boolean(user && pass),
      userLength: user ? user.length : 0,
      passLength: pass ? pass.length : 0,
      queryParams: queryParams ? queryParams.split('&').map(p => p.split('=')[0]).join(', ') : 'none',
    };
  } catch (err) {
    return { exists: true, error: 'Failed to parse URI safely' };
  }
};

/**
 * Categorizes and logs detailed MongoDB connection diagnostics without leaking secrets.
 */
const logConnectionDiagnostics = (error) => {
  const errName = error.name || 'Error';
  const errMsg = error.message || 'Unknown error';
  const errCode = error.code;
  const errCodeName = error.codeName;
  const cause = error.cause;

  logger.error(`--- MongoDB Connection Failure Diagnosis ---`);
  logger.error(`Error Type: ${errName}`);
  logger.error(`Error Message: ${errMsg}`);
  if (errCode) logger.error(`Error Code: ${errCode} (${errCodeName || 'N/A'})`);

  let failureCategory = 'UNKNOWN';
  let serverErrorsCombined = '';
  if (error.reason && error.reason.servers) {
    for (const [, serverDesc] of error.reason.servers.entries()) {
      if (serverDesc?.error?.message) {
        serverErrorsCombined += ` ${serverDesc.error.message}`;
      }
    }
  }

  // Check for TLS / SSL failures
  const fullErrorStr = `${errMsg} ${cause?.message || ''} ${cause?.code || ''} ${serverErrorsCombined}`;
  if (
    fullErrorStr.includes('SSL') ||
    fullErrorStr.includes('TLS') ||
    fullErrorStr.includes('tlsv1 alert') ||
    cause?.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR'
  ) {
    failureCategory = 'TLS/SSL_HANDSHAKE_FAILURE';
    logger.error(`Diagnosis: TLS/SSL handshake failed. (Underlying error: SSL alert 80 / internal error). In MongoDB Atlas, SSL alert 80 during TLS handshake occurs when Atlas's TLS termination proxy rejects the connection or drops access for the client IP.`);
  } else if (
    fullErrorStr.includes('ENOTFOUND') ||
    fullErrorStr.includes('EAI_AGAIN') ||
    fullErrorStr.includes('SERVFAIL') ||
    fullErrorStr.includes('querySrv')
  ) {
    failureCategory = 'DNS_SRV_RESOLUTION_FAILURE';
    logger.error('Diagnosis: DNS / SRV resolution failed. The cluster hostname could not be resolved to IP addresses.');
  } else if (
    errCode === 18 ||
    errCode === 8000 ||
    fullErrorStr.includes('Authentication failed') ||
    fullErrorStr.includes('auth failed')
  ) {
    failureCategory = 'AUTHENTICATION_FAILURE';
    logger.error('Diagnosis: Database authentication failed. Check database username, password, or authSource.');
  } else if (
    fullErrorStr.includes('ETIMEDOUT') ||
    fullErrorStr.includes('timed out') ||
    fullErrorStr.includes('serverSelectionTimeoutMS')
  ) {
    failureCategory = 'CONNECTION_TIMEOUT';
    logger.error('Diagnosis: Connection timed out attempting to reach cluster nodes.');
  }

  logger.error(`Root-Cause Classification: [${failureCategory}]`);

  // Inspect Server Selection Topology if available
  if (error.reason && error.reason.servers) {
    logger.error(`Topology Type: ${error.reason.type}`);
    for (const [serverAddress, serverDesc] of error.reason.servers.entries()) {
      const serverErrMsg = serverDesc?.error?.message || 'None';
      const serverErrCode = serverDesc?.error?.code || 'N/A';
      logger.error(`  - Node [${serverAddress}]: type=${serverDesc.type}, errCode=${serverErrCode}, err=${serverErrMsg}`);
    }
  }
  logger.error(`--------------------------------------------`);
};

const connectDB = async (maxRetries = 3, retryDelayMs = 3000) => {
  const uriInfo = getSanitizedUriInfo(process.env.MONGODB_URI);
  if (!uriInfo.exists) {
    const msg = 'MONGODB_URI environment variable is missing.';
    logger.error(msg);
    throw new Error(msg);
  }

  logger.info(`Initiating MongoDB connection: Protocol=${uriInfo.protocol} | Host=${uriInfo.host} | DB=${uriInfo.dbName} | AuthConfigured=${uriInfo.hasAuth}`);

  // Register connection events once
  if (!mongoose.connection._hasRegisteredAppEvents) {
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost/disconnected. Mongoose will attempt auto-reconnect.');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB connection re-established successfully.');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB runtime connection error: ${err.message}`);
    });
    mongoose.connection._hasRegisteredAppEvents = true;
  }

  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      if (attempt > 1) {
        logger.info(`Retrying MongoDB connection (Attempt ${attempt}/${maxRetries})...`);
      }

      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
      });

      logger.info(`MongoDB Connected successfully: Host=${conn.connection.host} | DB=${conn.connection.name} | ReadyState=${conn.connection.readyState}`);
      return conn;
    } catch (error) {
      logConnectionDiagnostics(error);
      if (attempt < maxRetries) {
        logger.warn(`Connection attempt ${attempt} failed. Waiting ${retryDelayMs / 1000}s before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      } else {
        throw error;
      }
    }
  }
};

export default connectDB;

