import { DeskItem } from '../DeskItem/DeskItem.jsx';
import './DesktopScene.css';

export function DesktopScene({ blocks, onSelect }) {
  return (
    <section className="desktop-scene" aria-label="Разделы платформы">
      <img className="desktop-scene__decor desktop-scene__decor--cup" src="/images/home/decor-cup.svg" alt="" />
      <img className="desktop-scene__decor desktop-scene__decor--pencil" src="/images/home/decor-pencil.svg" alt="" />
      <img className="desktop-scene__decor desktop-scene__decor--notebook" src="/images/home/decor-notebook.svg" alt="" />
      <div className="desktop-scene__items">
        {blocks.map((block) => (
          <DeskItem key={block.id} block={block} onClick={() => onSelect(block.id)} />
        ))}
      </div>
    </section>
  );
}
