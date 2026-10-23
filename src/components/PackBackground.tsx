const BACKGROUND_STAR_COUNT = 14;

export function PackBackground() {
  return <div className="pack-background" aria-hidden="true">
    <div className="pack-background__rays" />
    <div className="pack-background__rings" />
    <div className="pack-background__stars">
      {Array.from({ length: BACKGROUND_STAR_COUNT }, (_, index) =>
        <i className="pack-bg-star" key={index} />
      )}
    </div>
  </div>;
}
