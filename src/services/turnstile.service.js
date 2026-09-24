import logger from '../config/logger.js';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify Cloudflare Turnstile token with Cloudflare Siteverify API
 * @param {string} token - The Turnstile response token from the frontend
 * @param {string} [remoteIp] - The client's IP address (optional)
 * @returns {Promise<{ success: boolean, error?: string, errorCodes?: string[] }>}
 */
export const verifyTurnstileToken = async (token, remoteIp) => {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    logger.error('CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured in backend environment.');
    return {
      success: false,
      error: 'Turnstile verification key is not configured on the server',
    };
  }

  const tokenPresent = Boolean(token && typeof token === 'string' && token.trim().length > 0);
  const tokenLength = tokenPresent ? token.trim().length : 0;

  logger.info(`[Turnstile Diagnostic] Token present: ${tokenPresent ? 'yes' : 'no'} | Token length: ${tokenLength} | RemoteIP present: ${Boolean(remoteIp)}`);

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    logger.warn('[Turnstile Diagnostic] Rejected: Token is missing or empty string');
    return {
      success: false,
      error: 'Turnstile verification token is missing or empty',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      logger.error(`[Turnstile Diagnostic] Cloudflare API HTTP Error: status ${response.status}`);
      return {
        success: false,
        error: `Cloudflare Turnstile service returned status ${response.status}`,
      };
    }

    const data = await response.json();

    const errorCodes = data['error-codes'] || [];
    const hostname = data.hostname || 'none';

    logger.info(
      `[Turnstile Diagnostic] Cloudflare response -> Success: ${Boolean(data.success)} | Hostname: ${hostname} | Error codes: [${errorCodes.join(', ')}]`
    );

    if (data.success) {
      return { success: true, hostname: data.hostname };
    }

    return {
      success: false,
      error: 'Security token verification failed',
      errorCodes,
      hostname: data.hostname,
    };
  } catch (error) {
    logger.error(`[Turnstile Diagnostic] Network error during Turnstile verification: ${error.message}`);
    return {
      success: false,
      error: 'Unable to reach security verification service',
    };
  }
};

