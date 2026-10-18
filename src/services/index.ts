// Switch to Firebase production repositories
export {
  authService,
  userRepository,
  chatRepository,
  groupRepository,
  signalingService,
  systemConfigService,
} from './firebaseRepository';

// Mock repositories remain available for testing if ever needed:
// export * from './mockRepository';
