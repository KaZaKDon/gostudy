import { DeskItem } from '../DeskItem/DeskItem.jsx';
import './DesktopScene.css';

export function DesktopScene({ blocks, onSelect }) {
  return (
    <section className="desktop-scene" aria-label="Разделы платформы">
      <div className="desktop-scene__items">
        {blocks.map((block) => (
          <DeskItem key={block.id} block={block} onClick={() => onSelect(block.id)} />
        ))}
      </div>
    </section>
  );
}
