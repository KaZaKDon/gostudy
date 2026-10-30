import { PlatformIdentityProvider } from '../features/platform-identity/PlatformIdentityProvider.jsx';
import { AppRouter } from './router.jsx';

import './App.css';

export function App() {
    return (
        <div className="app">
            <PlatformIdentityProvider><AppRouter /></PlatformIdentityProvider>
        </div>
    );
}