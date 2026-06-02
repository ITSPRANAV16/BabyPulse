/**
 * Biometric authentication utilities (WebAuthn / Passkeys)
 * 
 * Uses the Web Authentication API to leverage device-native biometric
 * scanners (fingerprint, Face ID, Windows Hello) for app lock/unlock.
 */

// --- Base64URL encoding helpers ---
// WebAuthn credential IDs are binary data exposed as base64url strings.
// We must properly round-trip them between registration and verification.

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  // Convert base64url chars to standard base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Pad to multiple of 4
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

// --- Public API ---

export async function isBiometricsSupportedOnDevice(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    
    // Check if the credential manager & PublicKeyCredential is supported
    if (!window.PublicKeyCredential) return false;
    
    // Check if a platform authenticator (TouchID/FaceID/Fingerprint) is available
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch (err) {
    console.warn("Error checking biometric platform availability:", err);
    return false;
  }
}

export async function registerDeviceBiometrics(userEmail: string, userId: string): Promise<string | null> {
  try {
    const supported = await isBiometricsSupportedOnDevice();
    if (!supported) {
      throw new Error("Local biometric platform authenticator (Touch ID, Face ID, or Windows Hello) is not available or blocked in this browser. If running in an iframe, try opening the application in a new tab.");
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userBufferId = new TextEncoder().encode(userId);

    const credentialOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "BabyPulse Pediatric Diaries",
        id: window.location.hostname
      },
      user: {
        id: userBufferId,
        name: userEmail,
        displayName: userEmail.split('@')[0]
      },
      pubKeyCredParams: [
        {
          type: "public-key",
          alg: -7 // ES256 algorithm
        },
        {
          type: "public-key",
          alg: -257 // RS256 algorithm
        }
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // forces local device biometrics
        userVerification: "required",
        residentKey: "preferred"
      },
      timeout: 60000
    };

    const credential = await navigator.credentials.create({
      publicKey: credentialOptions
    }) as PublicKeyCredential;

    if (credential) {
      // Store the rawId as base64url for proper round-tripping during verification.
      // credential.id is already base64url but using rawId explicitly is more reliable
      // across all browser implementations.
      const storedId = arrayBufferToBase64Url(credential.rawId);
      return storedId;
    }
    return null;
  } catch (error: any) {
    console.warn("Biometric registration info/unsupported:", error);
    throw error;
  }
}

export async function verifyDeviceBiometrics(credentialId: string): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) {
      throw new Error("PublicKeyCredential is not supported by this browser.");
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // Properly decode the base64url credential ID back to binary ArrayBuffer.
    // The previous implementation used TextEncoder which corrupted the binary data.
    const rawCredId = base64UrlToArrayBuffer(credentialId);

    const assertionOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: [
        {
          id: rawCredId,
          type: "public-key",
          transports: ["internal"] // hint to use the platform authenticator directly
        }
      ],
      userVerification: "required",
      timeout: 60000
    };

    const assertion = await navigator.credentials.get({
      publicKey: assertionOptions
    });

    return !!assertion;
  } catch (error: any) {
    console.warn("Biometric verification info/unsupported:", error);
    throw error;
  }
}
