import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IonIcon } from "@ionic/react";
import { closeOutline, checkmarkOutline, moveOutline } from "ionicons/icons";
import "./AvatarCropModal.css";

// Size (in CSS pixels) of the round frame the user sees and drags inside.
const FRAME = 260;
// Size (in actual pixels) of the square image we save out at the end.
const OUTPUT_SIZE = 320;

interface AvatarCropModalProps {
  // The raw picture the user just picked, as a data URL.
  imageSrc: string;
  // Called with the final cropped picture (also a data URL) once the
  // user taps "Use Photo".
  onConfirm: (croppedDataUrl: string) => void;
  // Called when the user cancels out of the crop screen.
  onCancel: () => void;
}

// A simple full-screen crop step: the user can drag the photo around and
// zoom in/out inside a round frame, then confirm to save just that part
// of the photo as their profile picture.
const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  imageSrc,
  onConfirm,
  onCancel,
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // Tracks whether the user has dragged at least once, so we can fade
  // out the "you can move this" hint icon once they've figured it out.
  const [hasDragged, setHasDragged] = useState(false);

  // Drag tracking, kept in a ref so it doesn't cause re-renders mid-drag.
  const dragState = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startOffset: { x: number; y: number };
  }>({ dragging: false, startX: 0, startY: 0, startOffset: { x: 0, y: 0 } });

  // While the crop screen is open, hide the floating bottom tab bar. The
  // crop screen is rendered through a portal (see the return statement
  // below) so it always sits above the tab bar, but hiding the tab bar
  // too means it can never show through or catch a stray tap underneath.
  useEffect(() => {
    document.body.classList.add("crop-modal-open");
    return () => {
      document.body.classList.remove("crop-modal-open");
    };
  }, []);

  // How much the image is scaled just to "cover" the round frame at
  // zoom = 1 (i.e. its shorter side exactly fills the frame).
  const baseScale = FRAME / Math.min(naturalSize.w, naturalSize.h);

  const clampOffset = (next: { x: number; y: number }, z: number) => {
    const displayW = naturalSize.w * baseScale * z;
    const displayH = naturalSize.h * baseScale * z;
    const maxX = Math.max(0, (displayW - FRAME) / 2);
    const maxY = Math.max(0, (displayH - FRAME) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  };

  const handleZoomChange = (value: number) => {
    setZoom(value);
    setOffset((prev) => clampOffset(prev, value));
  };

  const startDrag = (clientX: number, clientY: number) => {
    dragState.current = {
      dragging: true,
      startX: clientX,
      startY: clientY,
      startOffset: offset,
    };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragState.current.dragging) return;
    const dx = clientX - dragState.current.startX;
    const dy = clientY - dragState.current.startY;
    const next = {
      x: dragState.current.startOffset.x + dx,
      y: dragState.current.startOffset.y + dy,
    };
    setOffset(clampOffset(next, zoom));
    if (!hasDragged && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      setHasDragged(true);
    }
  };

  const endDrag = () => {
    dragState.current.dragging = false;
  };

  // Pointer Events cover mouse, touch, and stylus with one set of
  // handlers. Capturing the pointer on the frame itself means drag
  // keeps working even if the finger/cursor slips outside the round
  // frame mid-drag, without needing separate window-level listeners.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startDrag(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    moveDrag(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endDrag();
  };

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setImgLoaded(true);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill white first so a transparent PNG doesn't turn black on export.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const k = OUTPUT_SIZE / FRAME;
    const scale = baseScale * zoom * k;

    ctx.save();
    ctx.translate(
      OUTPUT_SIZE / 2 + offset.x * k,
      OUTPUT_SIZE / 2 + offset.y * k,
    );
    ctx.scale(scale, scale);
    ctx.drawImage(img, -naturalSize.w / 2, -naturalSize.h / 2);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onConfirm(dataUrl);
  };

  const displayW = naturalSize.w * baseScale * zoom;
  const displayH = naturalSize.h * baseScale * zoom;

  return createPortal(
    <div className="crop-overlay">
      <div className="crop-header">
        <button
          className="crop-icon-btn"
          onClick={onCancel}
          aria-label="Cancel"
        >
          <IonIcon icon={closeOutline} />
        </button>
        <span className="crop-title">Adjust Photo</span>
        <button
          className="crop-icon-btn crop-confirm-btn"
          onClick={handleConfirm}
          disabled={!imgLoaded}
          aria-label="Use Photo"
        >
          <IonIcon icon={checkmarkOutline} />
        </button>
      </div>

      <div className="crop-stage">
        <div
          className="crop-frame"
          style={{ width: FRAME, height: FRAME }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Selected"
            className="crop-image"
            draggable={false}
            onLoad={handleImgLoad}
            style={{
              width: displayW || FRAME,
              height: displayH || FRAME,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
          {!hasDragged && (
            <div className="crop-move-hint" aria-hidden="true">
              <IonIcon icon={moveOutline} />
            </div>
          )}
        </div>

        <p className="crop-hint">Drag the photo to reposition</p>

        <div className="crop-controls">
          <span className="crop-controls-label">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="crop-zoom-slider"
            aria-label="Zoom"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AvatarCropModal;
