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

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
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
      logger.error(`Cloudflare Turnstile API HTTP Error: status ${response.status}`);
      return {
        success: false,
        error: `Cloudflare Turnstile service returned status ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.success) {
      return { success: true };
    }

    const errorCodes = data['error-codes'] || [];
    logger.warn(`Turnstile validation rejected by Cloudflare. Error codes: ${errorCodes.join(', ')}`);
    return {
      success: false,
      error: 'Security token verification failed',
      errorCodes,
    };
  } catch (error) {
    logger.error('Network error during Cloudflare Turnstile verification:', error.message);
    return {
      success: false,
      error: 'Unable to reach security verification service',
    };
  }
};

