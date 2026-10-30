import { useContext } from 'react';
import { IdentityContext } from './identityContext.js';
export function usePlatformIdentity() { return useContext(IdentityContext); }
