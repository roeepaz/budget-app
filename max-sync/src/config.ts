import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  max: {
    username: required('MAX_USERNAME'),
    password: required('MAX_PASSWORD'),
  },
  firebase: {
    projectId: required('FIREBASE_PROJECT_ID'),
    clientEmail: required('FIREBASE_CLIENT_EMAIL'),
    // Private keys are often stored in env vars with literal \n sequences.
    privateKey: required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  },
  userId: required('USER_ID'),
  // Where the Playwright storage state (cookies/session) is persisted between runs.
  storageStatePath: process.env.STORAGE_STATE_PATH ?? '.auth/storageState.json',
  headless: (process.env.HEADLESS ?? 'true') !== 'false',
};
