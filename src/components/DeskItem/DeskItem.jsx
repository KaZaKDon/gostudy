import { Link } from 'react-router-dom';

import './DeskItem.css';

export function DeskItem({ block, onClick }) {
  const image = (
      <img
        src={block.asset}
        srcSet={`${block.assetMobile} 520w, ${block.asset} 860w`}
        sizes="(max-width: 520px) 280px, (max-width: 1200px) 380px, 25vw"
        width="860"
        height="1290"
        alt=""
        loading="lazy"
        decoding="async"
      />
  );

  if (block.path) {
    return (
      <Link
        className={`desk-item ${block.className}`}
        to={block.path}
        aria-label={`Перейти в раздел ${block.title}`}
      >
        {image}
        <span className="desk-item__caption">{block.label}</span>
      </Link>
    );
  }

  return (
    <button
      className={`desk-item ${block.className}`}
      type="button"
      onClick={onClick}
      aria-label={`Открыть раздел ${block.title}`}
    >
      {image}
      <span className="desk-item__caption">{block.label}</span>
    </button>
  );
}
