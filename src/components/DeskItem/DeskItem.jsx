import './DeskItem.css';

export function DeskItem({ block, onClick }) {
  return (
    <button className={`desk-item ${block.className}`} type="button" onClick={onClick} aria-label={`Открыть раздел ${block.title}`}>
      <img src={block.asset} alt="" />
      <span className="desk-item__caption">{block.label}</span>
    </button>
  );
}
