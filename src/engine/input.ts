/**
 * Blackfree: Anomaly Protocol - High-Precision Universal Input Manager
 * Guarantees effortless camera turning across all contexts:
 * - Direct mouse look when pointer locked
 * - Canvas drag-look without firing weapons
 * - Snappy keyboard turning (Arrow keys & IJKL)
 * - Touch pan support
 */

export class InputManager {
  public keys: Map<string, boolean> = new Map();
  public justPressedKeys: Set<string> = new Set();
  public mouseButtons: Map<number, boolean> = new Map();
  public justPressedMouse: Set<number> = new Set();

  public mouseDeltaX: number = 0;
  public mouseDeltaY: number = 0;
  public wheelDelta: number = 0;
  public isPointerLocked: boolean = false;

  // Drag-to-look tracking (Right mouse button or left button without firing if dragging)
  public isDraggingLook: boolean = false;
  private lastDragX: number = 0;
  private lastDragY: number = 0;

  private jumpBufferTime: number = 0;
  private coyoteTime: number = 0;
  private targetDomElement: HTMLElement | null = null;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
  }

  public attach(domElement: HTMLElement): void {
    this.targetDomElement = domElement;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    domElement.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    domElement.addEventListener('wheel', this.handleWheel, { passive: true });
    domElement.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    window.addEventListener('blur', this.handleBlur);

    domElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd);
  }

  public detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.targetDomElement) {
      this.targetDomElement.removeEventListener('mousedown', this.handleMouseDown);
      this.targetDomElement.removeEventListener('wheel', this.handleWheel);
      this.targetDomElement.removeEventListener('contextmenu', this.handleContextMenu);
      this.targetDomElement.removeEventListener('touchstart', this.handleTouchStart);
    }
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    window.removeEventListener('blur', this.handleBlur);
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault(); // Prevent right-click context menu in game viewport
  }

  public requestPointerLock(): void {
    if (this.targetDomElement && document.pointerLockElement !== this.targetDomElement) {
      try {
        const promise = this.targetDomElement.requestPointerLock() as unknown as Promise<void> | undefined;
        if (promise && typeof promise.catch === 'function') {
          promise.catch(() => {
            // Pointerlock denied or restricted; fallback drag/arrow modes active
          });
        }
      } catch {
        // Fallback
      }
    }
  }

  public exitPointerLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const code = e.code;
    if (!this.keys.get(code)) {
      this.justPressedKeys.add(code);
    }
    this.keys.set(code, true);

    if (code === 'Space') {
      this.jumpBufferTime = 0.18;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.set(e.code, false);
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.isPointerLocked) {
      // Attempt pointer lock on any click
      this.requestPointerLock();
    }

    // Always record drag start coordinates for seamless turning
    this.isDraggingLook = true;
    this.lastDragX = e.clientX;
    this.lastDragY = e.clientY;

    if (!this.mouseButtons.get(e.button)) {
      this.justPressedMouse.add(e.button);
    }
    this.mouseButtons.set(e.button, true);
  }

  private handleMouseUp(e: MouseEvent): void {
    this.isDraggingLook = false;
    this.mouseButtons.set(e.button, false);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isPointerLocked) {
      this.mouseDeltaX += e.movementX;
      this.mouseDeltaY += e.movementY;
    } else if (this.isDraggingLook) {
      // High-precision smooth drag turning
      const dx = e.clientX - this.lastDragX;
      const dy = e.clientY - this.lastDragY;
      this.mouseDeltaX += dx * 1.8;
      this.mouseDeltaY += dy * 1.8;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length > 0) {
      this.isDraggingLook = true;
      this.lastDragX = e.touches[0].clientX;
      this.lastDragY = e.touches[0].clientY;
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (this.isDraggingLook && e.touches.length > 0) {
      const dx = e.touches[0].clientX - this.lastDragX;
      const dy = e.touches[0].clientY - this.lastDragY;
      this.mouseDeltaX += dx * 2.2;
      this.mouseDeltaY += dy * 2.2;
      this.lastDragX = e.touches[0].clientX;
      this.lastDragY = e.touches[0].clientY;
      e.preventDefault();
    }
  }

  private handleTouchEnd(): void {
    this.isDraggingLook = false;
  }

  private handleWheel(e: WheelEvent): void {
    this.wheelDelta += e.deltaY;
  }

  private handlePointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement === this.targetDomElement;
  }

  private handleBlur(): void {
    this.keys.clear();
    this.justPressedKeys.clear();
    this.mouseButtons.clear();
    this.justPressedMouse.clear();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.isDraggingLook = false;
  }

  public isHeld(code: string): boolean {
    return !!this.keys.get(code);
  }

  public isJustPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  public isMouseHeld(button: number): boolean {
    return !!this.mouseButtons.get(button);
  }

  public isMouseJustPressed(button: number): boolean {
    return this.justPressedMouse.has(button);
  }

  public consumeJumpBuffer(): boolean {
    if (this.jumpBufferTime > 0) {
      this.jumpBufferTime = 0;
      return true;
    }
    return false;
  }

  public setGrounded(grounded: boolean): void {
    if (grounded) {
      this.coyoteTime = 0.14;
    }
  }

  public hasCoyoteTime(): boolean {
    return this.coyoteTime > 0;
  }

  public update(dt: number): { dx: number; dy: number; wheel: number } {
    // Fast, responsive keyboard turning (Arrow keys & IJKL)
    // 2400 units/sec gives snappy ~180° turns in under 0.4s
    const turnSpeed = 2200 * dt;

    if (this.isHeld('ArrowLeft') || this.isHeld('KeyJ')) {
      this.mouseDeltaX -= turnSpeed;
    }
    if (this.isHeld('ArrowRight') || this.isHeld('KeyL')) {
      this.mouseDeltaX += turnSpeed;
    }
    if (this.isHeld('ArrowUp') || this.isHeld('KeyI')) {
      this.mouseDeltaY -= turnSpeed;
    }
    if (this.isHeld('ArrowDown') || this.isHeld('KeyK')) {
      this.mouseDeltaY += turnSpeed;
    }

    const delta = {
      dx: this.mouseDeltaX,
      dy: this.mouseDeltaY,
      wheel: this.wheelDelta,
    };

    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.wheelDelta = 0;
    this.justPressedKeys.clear();
    this.justPressedMouse.clear();

    if (this.jumpBufferTime > 0) {
      this.jumpBufferTime = Math.max(0, this.jumpBufferTime - dt);
    }
    if (this.coyoteTime > 0) {
      this.coyoteTime = Math.max(0, this.coyoteTime - dt);
    }

    return delta;
  }
}
