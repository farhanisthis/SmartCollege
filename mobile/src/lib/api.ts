import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Default to localhost/emulator, but allow runtime override
let customBaseUrl: string | null = null;

const DEFAULT_URL = Platform.OS === 'android' 
  ? 'http://192.168.137.1:10000' 
  : 'http://localhost:10000';

export const getApiUrl = () => {
  return customBaseUrl || DEFAULT_URL;
};

export const setApiUrl = async (url: string) => {
  // Add http/https if missing
  let formattedUrl = url;
  if (!formattedUrl.startsWith("http")) {
      formattedUrl = `http://${formattedUrl}`;
  }
  // Remove trailing slash
  if (formattedUrl.endsWith("/")) {
      formattedUrl = formattedUrl.slice(0, -1);
  }
  // Add port 10000 if no port specified (heuristic)
  if (!formattedUrl.includes(":") || formattedUrl.split(":").length < 3) {
      formattedUrl = `${formattedUrl}:10000`;
  }

  customBaseUrl = formattedUrl;
  try {
      await SecureStore.setItemAsync('custom_api_url', formattedUrl);
  } catch (e) {
      console.error("Failed to save API URL", e);
  }
  return formattedUrl;
};

export const loadApiUrl = async () => {
  try {
      const stored = await SecureStore.getItemAsync('custom_api_url');
      if (stored) {
          customBaseUrl = stored;
          console.log("[API] Loaded custom API URL:", stored);
      }
  } catch (e) {
      console.error("Failed to load API URL", e);
  }
};

// Initialize
loadApiUrl();

export async function getHeaders(isFormData = false) {
  const headers: Record<string, string> = {
    // Only set Content-Type if NOT FormData (let browser/engine handle boundary)
  };
  
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  // Skip manual cookie header on Web (Platform.OS === 'web')
  // Browsers block 'Cookie' header and handle it automatically via credentials: 'include'
  if (Platform.OS !== 'web') {
    try {
      const cookie = await SecureStore.getItemAsync('session_cookie');
      if (cookie) {
        headers['Cookie'] = cookie;
      }
    } catch (e) {
      console.log("[API] Error getting cookie:", e);
    }
  }
  
  // Fix for LocalTunnel "Click to continue" page
  headers['Bypass-Tunnel-Reminder'] = 'true';
  headers['User-Agent'] = 'SmartCollegeMobile/1.0'; // Sometimes needed
  
  return headers;
}

export async function saveCookie(res: Response) {
  if (Platform.OS === 'web') return; // Browser handles cookies automatically

  const headers = new Map();
  // Log all headers to debug casing
  res.headers.forEach((value, key) => {
      // console.log(`[API] Header: ${key} = ${value}`);
      headers.set(key.toLowerCase(), value);
  });
  
  const setCookie = headers.get('set-cookie');
  console.log("[API] Set-Cookie Header:", setCookie);

  if (setCookie) {
    const match = setCookie.match(/(connect\.sid=[^;]+)/);
    if (match) {
      console.log("[API] Saving Cookie:", match[1]);
      await SecureStore.setItemAsync('session_cookie', match[1]);
    } else {
        console.log("[API] Cookie pattern did not match connect.sid");
    }
  }
}

export const fetchWithCookie = async (url: string, options: RequestInit = {}) => {
  const baseUrl = getApiUrl();
  const absoluteUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  
  // Detect FormData
  const isFormData = options.body && (options.body as any)._parts; 
  const isStandardFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  
  const headers = await getHeaders(!!(isFormData || isStandardFormData));
  
  const finalOptions = {
    ...options,
    credentials: (Platform.OS === 'web' ? 'include' : undefined) as RequestCredentials, // Enable cookies for Web
    headers: {
      ...headers,
      ...options.headers,
    }
  };

  const res = await fetch(absoluteUrl, finalOptions);
  await saveCookie(res);
  return res;
};
