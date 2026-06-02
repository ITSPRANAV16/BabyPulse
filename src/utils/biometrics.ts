/**
 * Biometric authentication utilities (WebAuthn / Passkeys)
 */

export async function isBiometricsSupportedOnDevice(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    
    // Check if the credential manager & PublicKeyCredential is supported
    if (!window.PublicKeyCredential) return false;
    
    // Check if a platform authenticator (TouchID/FaceID) is available
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
        residentKey: "required"
      },
      timeout: 60000
    };

    const credential = await navigator.credentials.create({
      publicKey: credentialOptions
    }) as PublicKeyCredential;

    if (credential) {
      return credential.id;
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

    // Some browsers or custom implementations convert the credential ID string back to an array
    const rawCredId = new TextEncoder().encode(credentialId);

    const assertionOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [
        {
          id: rawCredId,
          type: "public-key"
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
