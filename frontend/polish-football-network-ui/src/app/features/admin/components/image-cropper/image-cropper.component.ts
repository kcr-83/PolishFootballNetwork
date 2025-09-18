import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';

/// <summary>
/// Interface defining cropping area coordinates and dimensions
/// </summary>
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/// <summary>
/// Interface for cropped image result with metadata
/// </summary>
export interface CroppedImageResult {
  blob: Blob;
  dataUrl: string;
  cropArea: CropArea;
  originalDimensions: { width: number; height: number };
  croppedDimensions: { width: number; height: number };
}

/// <summary>
/// Predefined aspect ratio options for image cropping
/// </summary>
export interface AspectRatioOption {
  label: string;
  value: number | null; // null for free aspect
  description: string;
}

/// <summary>
/// Advanced image cropper component with aspect ratio controls, zoom functionality,
/// and precise crop area selection for logo processing
/// </summary>
@Component({
  selector: 'app-image-cropper',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSliderModule,
    MatSelectModule,
    MatFormFieldModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    FormsModule
  ],
  templateUrl: './image-cropper.component.html',
  styleUrls: ['./image-cropper.component.scss']
})
export class ImageCropperComponent implements OnInit, OnDestroy {
  @Input() imageFile!: File;
  @Input() aspectRatio: number | null = 1; // 1:1 by default, null for free
  @Input() minCropSize: number = 50;
  @Input() maxOutputSize: number = 1024;
  @Input() outputFormat: string = 'png';
  @Input() outputQuality: number = 0.9;

  @Output() imageCropped = new EventEmitter<CroppedImageResult>();
  @Output() cropperClosed = new EventEmitter<void>();

  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  // Reactive state
  private readonly _isLoading = signal(false);
  private readonly _isProcessing = signal(false);
  private readonly _imageLoaded = signal(false);
  private readonly _zoomLevel = signal(100);
  private readonly _selectedAspectRatio = signal<number | null>(1);
  private readonly _cropArea = signal<CropArea>({ x: 0, y: 0, width: 100, height: 100 });

  // Computed properties
  readonly isLoading = this._isLoading.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly imageLoaded = this._imageLoaded.asReadonly();
  readonly zoomLevel = this._zoomLevel.asReadonly();
  readonly selectedAspectRatio = this._selectedAspectRatio.asReadonly();
  readonly cropArea = this._cropArea.asReadonly();

  readonly canCrop = computed(() => 
    this.imageLoaded() && !this.isProcessing() && this.cropArea().width > 0 && this.cropArea().height > 0
  );

  // Image and canvas properties
  private image: HTMLImageElement | null = null;
  private imageUrl: string | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDragging = false;
  private isResizing = false;
  private dragStart = { x: 0, y: 0 };
  private resizeHandle: string | null = null;

  // Aspect ratio options
  readonly aspectRatioOptions: AspectRatioOption[] = [
    { label: 'Square (1:1)', value: 1, description: 'Perfect for logos and avatars' },
    { label: 'Wide (16:9)', value: 16/9, description: 'Banner or header format' },
    { label: 'Standard (4:3)', value: 4/3, description: 'Traditional photo format' },
    { label: 'Portrait (3:4)', value: 3/4, description: 'Vertical orientation' },
    { label: 'Free', value: null, description: 'No aspect ratio constraint' }
  ];

  ngOnInit(): void {
    this.loadImage();
    this._selectedAspectRatio.set(this.aspectRatio);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /// <summary>
  /// Loads and displays the selected image file in the cropper canvas
  /// </summary>
  private async loadImage(): Promise<void> {
    if (!this.imageFile) return;

    this._isLoading.set(true);

    try {
      this.imageUrl = URL.createObjectURL(this.imageFile);
      this.image = new Image();
      
      this.image.onload = () => {
        this.setupCanvas();
        this.initializeCropArea();
        this._imageLoaded.set(true);
        this._isLoading.set(false);
      };

      this.image.onerror = () => {
        console.error('Failed to load image');
        this._isLoading.set(false);
      };

      this.image.src = this.imageUrl;
    } catch (error) {
      console.error('Error loading image:', error);
      this._isLoading.set(false);
    }
  }

  /// <summary>
  /// Sets up the canvas element and drawing context
  /// </summary>
  private setupCanvas(): void {
    if (!this.image || !this.canvasRef) return;

    this.canvas = this.canvasRef.nativeElement;
    this.ctx = this.canvas.getContext('2d');

    if (!this.ctx) return;

    // Set canvas size to fit container while maintaining aspect ratio
    const container = this.containerRef.nativeElement;
    const containerWidth = container.clientWidth - 32; // Account for padding
    const containerHeight = container.clientHeight - 32;

    const imageAspectRatio = this.image.width / this.image.height;
    let canvasWidth = containerWidth;
    let canvasHeight = containerWidth / imageAspectRatio;

    if (canvasHeight > containerHeight) {
      canvasHeight = containerHeight;
      canvasWidth = containerHeight * imageAspectRatio;
    }

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;

    this.drawImage();
    this.setupEventListeners();
  }

  /// <summary>
  /// Initializes the crop area with default dimensions based on aspect ratio
  /// </summary>
  private initializeCropArea(): void {
    if (!this.canvas) return;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    let cropWidth = Math.min(canvasWidth * 0.8, canvasHeight * 0.8);
    let cropHeight = cropWidth;

    if (this.selectedAspectRatio()) {
      const aspectRatio = this.selectedAspectRatio()!;
      if (aspectRatio > 1) {
        cropHeight = cropWidth / aspectRatio;
      } else {
        cropWidth = cropHeight * aspectRatio;
      }
    }

    const x = (canvasWidth - cropWidth) / 2;
    const y = (canvasHeight - cropHeight) / 2;

    this._cropArea.set({
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: Math.min(cropWidth, canvasWidth),
      height: Math.min(cropHeight, canvasHeight)
    });

    this.drawCropOverlay();
  }

  /// <summary>
  /// Sets up mouse and touch event listeners for crop area interaction
  /// </summary>
  private setupEventListeners(): void {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));

    // Touch events for mobile support
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  /// <summary>
  /// Draws the image on the canvas with current zoom level
  /// </summary>
  private drawImage(): void {
    if (!this.ctx || !this.image || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const zoom = this.zoomLevel() / 100;
    const scaledWidth = this.canvas.width * zoom;
    const scaledHeight = this.canvas.height * zoom;
    const offsetX = (this.canvas.width - scaledWidth) / 2;
    const offsetY = (this.canvas.height - scaledHeight) / 2;

    this.ctx.drawImage(this.image, offsetX, offsetY, scaledWidth, scaledHeight);
  }

  /// <summary>
  /// Draws the crop overlay with handles and dimmed areas
  /// </summary>
  private drawCropOverlay(): void {
    if (!this.ctx || !this.canvas) return;

    const crop = this.cropArea();
    
    // Draw semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Clear crop area
    this.ctx.clearRect(crop.x, crop.y, crop.width, crop.height);
    
    // Redraw image in crop area
    if (this.image) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(crop.x, crop.y, crop.width, crop.height);
      this.ctx.clip();
      this.drawImage();
      this.ctx.restore();
    }

    // Draw crop border
    this.ctx.strokeStyle = '#2196F3';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);

    // Draw resize handles
    this.drawResizeHandles();
  }

  /// <summary>
  /// Draws resize handles on the corners and edges of the crop area
  /// </summary>
  private drawResizeHandles(): void {
    if (!this.ctx) return;

    const crop = this.cropArea();
    const handleSize = 10;
    
    this.ctx.fillStyle = '#2196F3';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;

    const handles = [
      { x: crop.x - handleSize/2, y: crop.y - handleSize/2 }, // top-left
      { x: crop.x + crop.width - handleSize/2, y: crop.y - handleSize/2 }, // top-right
      { x: crop.x - handleSize/2, y: crop.y + crop.height - handleSize/2 }, // bottom-left
      { x: crop.x + crop.width - handleSize/2, y: crop.y + crop.height - handleSize/2 }, // bottom-right
    ];

    handles.forEach(handle => {
      this.ctx!.fillRect(handle.x, handle.y, handleSize, handleSize);
      this.ctx!.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });
  }

  /// <summary>
  /// Handles mouse down events for starting drag or resize operations
  /// </summary>
  private onMouseDown(event: MouseEvent): void {
    const rect = this.canvas!.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.resizeHandle = this.getResizeHandle(x, y);
    
    if (this.resizeHandle) {
      this.isResizing = true;
    } else if (this.isInsideCropArea(x, y)) {
      this.isDragging = true;
      this.dragStart = { x: x - this.cropArea().x, y: y - this.cropArea().y };
    }
  }

  /// <summary>
  /// Handles mouse move events for dragging and resizing the crop area
  /// </summary>
  private onMouseMove(event: MouseEvent): void {
    const rect = this.canvas!.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.isResizing && this.resizeHandle) {
      this.resizeCropArea(x, y);
    } else if (this.isDragging) {
      this.moveCropArea(x, y);
    } else {
      // Update cursor based on position
      this.updateCursor(x, y);
    }
  }

  /// <summary>
  /// Handles mouse up events to end drag or resize operations
  /// </summary>
  private onMouseUp(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
  }

  /// <summary>
  /// Handles touch start events for mobile support
  /// </summary>
  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.onMouseDown(mouseEvent);
  }

  /// <summary>
  /// Handles touch move events for mobile support
  /// </summary>
  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.onMouseMove(mouseEvent);
  }

  /// <summary>
  /// Handles touch end events for mobile support
  /// </summary>
  private onTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.onMouseUp();
  }

  /// <summary>
  /// Determines which resize handle is at the given coordinates
  /// </summary>
  private getResizeHandle(x: number, y: number): string | null {
    const crop = this.cropArea();
    const handleSize = 10;
    const tolerance = 5;

    if (this.isNear(x, crop.x, tolerance) && this.isNear(y, crop.y, tolerance)) {
      return 'top-left';
    }
    if (this.isNear(x, crop.x + crop.width, tolerance) && this.isNear(y, crop.y, tolerance)) {
      return 'top-right';
    }
    if (this.isNear(x, crop.x, tolerance) && this.isNear(y, crop.y + crop.height, tolerance)) {
      return 'bottom-left';
    }
    if (this.isNear(x, crop.x + crop.width, tolerance) && this.isNear(y, crop.y + crop.height, tolerance)) {
      return 'bottom-right';
    }

    return null;
  }

  /// <summary>
  /// Checks if a point is near another point within a tolerance
  /// </summary>
  private isNear(a: number, b: number, tolerance: number): boolean {
    return Math.abs(a - b) <= tolerance;
  }

  /// <summary>
  /// Checks if coordinates are inside the crop area
  /// </summary>
  private isInsideCropArea(x: number, y: number): boolean {
    const crop = this.cropArea();
    return x >= crop.x && x <= crop.x + crop.width && 
           y >= crop.y && y <= crop.y + crop.height;
  }

  /// <summary>
  /// Resizes the crop area based on the active resize handle
  /// </summary>
  private resizeCropArea(x: number, y: number): void {
    if (!this.resizeHandle || !this.canvas) return;

    const crop = this.cropArea();
    let newCrop = { ...crop };

    switch (this.resizeHandle) {
      case 'top-left':
        newCrop.width += newCrop.x - x;
        newCrop.height += newCrop.y - y;
        newCrop.x = x;
        newCrop.y = y;
        break;
      case 'top-right':
        newCrop.width = x - newCrop.x;
        newCrop.height += newCrop.y - y;
        newCrop.y = y;
        break;
      case 'bottom-left':
        newCrop.width += newCrop.x - x;
        newCrop.height = y - newCrop.y;
        newCrop.x = x;
        break;
      case 'bottom-right':
        newCrop.width = x - newCrop.x;
        newCrop.height = y - newCrop.y;
        break;
    }

    // Apply constraints
    newCrop = this.constrainCropArea(newCrop);
    
    if (this.selectedAspectRatio()) {
      newCrop = this.maintainAspectRatio(newCrop);
    }

    this._cropArea.set(newCrop);
    this.redraw();
  }

  /// <summary>
  /// Moves the crop area to a new position
  /// </summary>
  private moveCropArea(x: number, y: number): void {
    const newX = Math.max(0, Math.min(x - this.dragStart.x, this.canvas!.width - this.cropArea().width));
    const newY = Math.max(0, Math.min(y - this.dragStart.y, this.canvas!.height - this.cropArea().height));

    this._cropArea.set({
      ...this.cropArea(),
      x: newX,
      y: newY
    });

    this.redraw();
  }

  /// <summary>
  /// Constrains crop area to canvas boundaries and minimum size
  /// </summary>
  private constrainCropArea(crop: CropArea): CropArea {
    if (!this.canvas) return crop;

    return {
      x: Math.max(0, Math.min(crop.x, this.canvas.width - this.minCropSize)),
      y: Math.max(0, Math.min(crop.y, this.canvas.height - this.minCropSize)),
      width: Math.max(this.minCropSize, Math.min(crop.width, this.canvas.width - crop.x)),
      height: Math.max(this.minCropSize, Math.min(crop.height, this.canvas.height - crop.y))
    };
  }

  /// <summary>
  /// Maintains aspect ratio when resizing crop area
  /// </summary>
  private maintainAspectRatio(crop: CropArea): CropArea {
    const aspectRatio = this.selectedAspectRatio();
    if (!aspectRatio) return crop;

    if (crop.width / crop.height > aspectRatio) {
      crop.width = crop.height * aspectRatio;
    } else {
      crop.height = crop.width / aspectRatio;
    }

    return this.constrainCropArea(crop);
  }

  /// <summary>
  /// Updates mouse cursor based on position over crop area
  /// </summary>
  private updateCursor(x: number, y: number): void {
    if (!this.canvas) return;

    const handle = this.getResizeHandle(x, y);
    
    if (handle) {
      if (handle === 'top-left' || handle === 'bottom-right') {
        this.canvas.style.cursor = 'nw-resize';
      } else {
        this.canvas.style.cursor = 'ne-resize';
      }
    } else if (this.isInsideCropArea(x, y)) {
      this.canvas.style.cursor = 'move';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  /// <summary>
  /// Redraws the entire canvas with image and crop overlay
  /// </summary>
  private redraw(): void {
    this.drawImage();
    this.drawCropOverlay();
  }

  /// <summary>
  /// Handles zoom level changes
  /// </summary>
  onZoomChange(value: number): void {
    this._zoomLevel.set(value);
    this.redraw();
  }

  /// <summary>
  /// Handles aspect ratio selection changes
  /// </summary>
  onAspectRatioChange(value: number | null): void {
    this._selectedAspectRatio.set(value);
    this.initializeCropArea();
  }

  /// <summary>
  /// Resets crop area to default centered position
  /// </summary>
  resetCrop(): void {
    this.initializeCropArea();
  }

  /// <summary>
  /// Processes and crops the image, emitting the result
  /// </summary>
  async cropImage(): Promise<void> {
    if (!this.canCrop() || !this.image || !this.canvas) return;

    this._isProcessing.set(true);

    try {
      const crop = this.cropArea();
      const zoom = this.zoomLevel() / 100;
      
      // Calculate actual image coordinates
      const scaleX = this.image.width / (this.canvas.width * zoom);
      const scaleY = this.image.height / (this.canvas.height * zoom);
      
      const actualCrop = {
        x: crop.x * scaleX,
        y: crop.y * scaleY,
        width: crop.width * scaleX,
        height: crop.height * scaleY
      };

      // Create output canvas
      const outputCanvas = document.createElement('canvas');
      const outputCtx = outputCanvas.getContext('2d')!;
      
      // Calculate output dimensions
      let outputWidth = actualCrop.width;
      let outputHeight = actualCrop.height;
      
      if (outputWidth > this.maxOutputSize || outputHeight > this.maxOutputSize) {
        const scale = Math.min(this.maxOutputSize / outputWidth, this.maxOutputSize / outputHeight);
        outputWidth *= scale;
        outputHeight *= scale;
      }
      
      outputCanvas.width = outputWidth;
      outputCanvas.height = outputHeight;

      // Draw cropped image
      outputCtx.drawImage(
        this.image,
        actualCrop.x, actualCrop.y, actualCrop.width, actualCrop.height,
        0, 0, outputWidth, outputHeight
      );

      // Convert to blob and data URL
      const blob = await this.canvasToBlob(outputCanvas);
      const dataUrl = outputCanvas.toDataURL(`image/${this.outputFormat}`, this.outputQuality);

      const result: CroppedImageResult = {
        blob,
        dataUrl,
        cropArea: actualCrop,
        originalDimensions: { width: this.image.width, height: this.image.height },
        croppedDimensions: { width: outputWidth, height: outputHeight }
      };

      this.imageCropped.emit(result);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      this._isProcessing.set(false);
    }
  }

  /// <summary>
  /// Converts canvas to blob with proper error handling
  /// </summary>
  private canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        `image/${this.outputFormat}`,
        this.outputQuality
      );
    });
  }

  /// <summary>
  /// Closes the cropper without saving changes
  /// </summary>
  cancel(): void {
    this.cropperClosed.emit();
  }

  /// <summary>
  /// Cleans up resources when component is destroyed
  /// </summary>
  private cleanup(): void {
    if (this.imageUrl) {
      URL.revokeObjectURL(this.imageUrl);
    }
  }
}