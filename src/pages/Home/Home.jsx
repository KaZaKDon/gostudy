import { useState } from 'react';

import { Header } from '../../components/Header/Header.jsx';
import { Footer } from '../../components/Footer/Footer.jsx';
import { DesktopScene } from '../../components/DesktopScene/DesktopScene.jsx';
import { InfoModal } from '../../components/InfoModal/InfoModal.jsx';

import { Hero } from './components/Hero/Hero.jsx';

import { HOME_BLOCKS } from '../../data/homeBlocks.js';

import './Home.css';

export function Home() {
    const [activeBlockId, setActiveBlockId] = useState(null);

    const activeBlock =
        HOME_BLOCKS.find((block) => block.id === activeBlockId) ?? null;

    return (
        <main className="home">
            <Header />

            <Hero />

            <DesktopScene
                blocks={HOME_BLOCKS}
                onSelect={setActiveBlockId}
            />

            <Footer />

            <InfoModal
                block={activeBlock}
                onClose={() => setActiveBlockId(null)}
            />
        </main>
    );
}