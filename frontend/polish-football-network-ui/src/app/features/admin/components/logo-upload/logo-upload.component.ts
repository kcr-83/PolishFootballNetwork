import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { finalize, map } from 'rxjs';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { LogoUploadResponse } from '../../shared/models/club.models';
import { ImageCropperComponent } from './image-cropper/image-cropper.component';
import { LogoGalleryComponent } from './logo-gallery/logo-gallery.component';

/// <summary>
/// Logo upload component with drag & drop, image preview/cropping, SVG validation, and gallery view.
/// Handles file validation, image processing, and logo management functionality.
/// </summary>
@Component({
  selector: 'app-logo-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatCardModule,
    MatMenuModule,
    ImageCropperComponent,
    LogoGalleryComponent
  ],
  templateUrl: './logo-upload.component.html',
  styleUrls: ['./logo-upload.component.scss']
})
export class LogoUploadComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('dropZone') dropZone!: ElementRef<HTMLDivElement>;

  @Input() initialLogoUrl?: string | null;
  @Input() acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
  @Input() maxFileSize = 2 * 1024 * 1024; // 2MB
  @Input() cropAspectRatio = 1; // Square by default
  @Input() showGallery = true;
  @Input() allowMultiple = false;

  @Output() logoUploaded = new EventEmitter<string>();
  @Output() logoRemoved = new EventEmitter<void>();
  @Output() uploadProgress = new EventEmitter<number>();
  @Output() uploadError = new EventEmitter<string>();

  // Reactive state
  private readonly _currentLogoUrl = signal<string | null>(null);
  private readonly _isUploading = signal(false);
  private readonly _uploadProgress = signal(0);
  private readonly _isDragOver = signal(false);
  private readonly _selectedFile = signal<File | null>(null);
  private readonly _previewUrl = signal<SafeUrl | null>(null);
  private readonly _showCropper = signal(false);
  private readonly _showGallery = signal(false);
  private readonly _validationErrors = signal<string[]>([]);

  // Computed properties
  public readonly currentLogoUrl = this._currentLogoUrl.asReadonly();
  public readonly isUploading = this._isUploading.asReadonly();
  public readonly uploadProgressValue = this._uploadProgress.asReadonly();
  public readonly isDragOver = this._isDragOver.asReadonly();
  public readonly selectedFile = this._selectedFile.asReadonly();
  public readonly previewUrl = this._previewUrl.asReadonly();
  public readonly showCropper = this._showCropper.asReadonly();
  public readonly showGallery = this._showGallery.asReadonly();
  public readonly validationErrors = this._validationErrors.asReadonly();
  
  public readonly hasLogo = computed(() => !!this.currentLogoUrl());
  public readonly hasSelectedFile = computed(() => !!this.selectedFile());
  public readonly canUpload = computed(() => this.hasSelectedFile() && !this.isUploading());
  public readonly isImageFile = computed(() => {
    const file = this.selectedFile();
    return file && file.type.startsWith('image/') && file.type !== 'image/svg+xml';
  });
  public readonly isSvgFile = computed(() => {
    const file = this.selectedFile();
    return file && file.type === 'image/svg+xml';
  });

  ngOnInit(): void {
    if (this.initialLogoUrl) {
      this._currentLogoUrl.set(this.initialLogoUrl);
    }
    this.setupDragAndDrop();
  }

  /// <summary>
  /// Handles file input change
  /// </summary>
  /// <param name="event">File input change event</param>
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  /// <summary>
  /// Opens file picker
  /// </summary>
  openFilePicker(): void {
    this.fileInput.nativeElement.click();
  }

  /// <summary>
  /// Removes current logo
  /// </summary>
  removeLogo(): void {
    this._currentLogoUrl.set(null);
    this._selectedFile.set(null);
    this._previewUrl.set(null);
    this._validationErrors.set([]);
    this.clearFileInput();
    this.logoRemoved.emit();
  }

  /// <summary>
  /// Uploads the selected file
  /// </summary>
  async uploadFile(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this._isUploading.set(true);
    this._uploadProgress.set(0);
    this._validationErrors.set([]);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      this.http.post<LogoUploadResponse>('/api/clubs/upload-logo', formData, {
        reportProgress: true,
        observe: 'events'
      }).pipe(
        map(event => {
          if (event.type === HttpEventType.UploadProgress) {
            const progress = Math.round(100 * (event.loaded / (event.total || 1)));
            this._uploadProgress.set(progress);
            this.uploadProgress.emit(progress);
          } else if (event.type === HttpEventType.Response) {
            return event.body;
          }
          return null;
        }),
        finalize(() => {
          this._isUploading.set(false);
          this._uploadProgress.set(0);
        })
      ).subscribe({
        next: (response) => {
          if (response) {
            this._currentLogoUrl.set(response.url);
            this.logoUploaded.emit(response.url);
            this.clearSelection();
            this.showSuccess('Logo uploaded successfully');
          }
        },
        error: (error) => {
          this.handleUploadError(error);
        }
      });
    } catch (error: any) {
      this._isUploading.set(false);
      this.handleUploadError(error);
    }
  }

  /// <summary>
  /// Opens image cropper dialog
  /// </summary>
  openCropper(): void {
    if (!this.selectedFile() || !this.isImageFile()) return;
    this._showCropper.set(true);
  }

  /// <summary>
  /// Handles cropped image from cropper component
  /// </summary>
  /// <param name="croppedBlob">Cropped image blob</param>
  onImageCropped(croppedBlob: Blob): void {
    const file = new File([croppedBlob], 'cropped-logo.png', { type: 'image/png' });
    this._selectedFile.set(file);
    this.createPreviewUrl(file);
    this._showCropper.set(false);
  }

  /// <summary>
  /// Closes cropper without saving
  /// </summary>
  onCropperClosed(): void {
    this._showCropper.set(false);
  }

  /// <summary>
  /// Opens logo gallery
  /// </summary>
  openGallery(): void {
    this._showGallery.set(true);
  }

  /// <summary>
  /// Handles logo selection from gallery
  /// </summary>
  /// <param name="logoUrl">Selected logo URL</param>
  onLogoSelectedFromGallery(logoUrl: string): void {
    this._currentLogoUrl.set(logoUrl);
    this.logoUploaded.emit(logoUrl);
    this._showGallery.set(false);
    this.showSuccess('Logo selected from gallery');
  }

  /// <summary>
  /// Closes gallery without selection
  /// </summary>
  onGalleryClosed(): void {
    this._showGallery.set(false);
  }

  /// <summary>
  /// Resets component to initial state
  /// </summary>
  reset(): void {
    this._currentLogoUrl.set(this.initialLogoUrl || null);
    this._selectedFile.set(null);
    this._previewUrl.set(null);
    this._validationErrors.set([]);
    this._showCropper.set(false);
    this._showGallery.set(false);
    this.clearFileInput();
  }

  /// <summary>
  /// Gets file size in human readable format
  /// </summary>
  /// <param name="bytes">File size in bytes</param>
  /// <returns>Formatted file size</returns>
  getFileSizeDisplay(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /// <summary>
  /// Processes selected file with validation
  /// </summary>
  /// <param name="file">Selected file</param>
  private processFile(file: File): void {
    const errors = this.validateFile(file);
    
    if (errors.length > 0) {
      this._validationErrors.set(errors);
      this.uploadError.emit(errors.join(', '));
      return;
    }

    this._selectedFile.set(file);
    this._validationErrors.set([]);
    this.createPreviewUrl(file);

    // Auto-open cropper for non-SVG images
    if (this.isImageFile() && this.cropAspectRatio > 0) {
      setTimeout(() => this.openCropper(), 100);
    }
  }

  /// <summary>
  /// Validates file against constraints
  /// </summary>
  /// <param name="file">File to validate</param>
  /// <returns>Array of validation error messages</returns>
  private validateFile(file: File): string[] {
    const errors: string[] = [];

    // File type validation
    if (!this.acceptedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Accepted types: ${this.acceptedTypes.join(', ')}`);
    }

    // File size validation
    if (file.size > this.maxFileSize) {
      errors.push(`File size ${this.getFileSizeDisplay(file.size)} exceeds maximum allowed size of ${this.getFileSizeDisplay(this.maxFileSize)}`);
    }

    // SVG specific validation
    if (file.type === 'image/svg+xml') {
      // Could add SVG content validation here
      // For now, just check if it's a valid SVG by file extension
      if (!file.name.toLowerCase().endsWith('.svg')) {
        errors.push('SVG files must have .svg extension');
      }
    }

    // Image dimension validation (for raster images)
    if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      this.validateImageDimensions(file).then(dimensionErrors => {
        if (dimensionErrors.length > 0) {
          this._validationErrors.update(current => [...current, ...dimensionErrors]);
        }
      });
    }

    return errors;
  }

  /// <summary>
  /// Validates image dimensions
  /// </summary>
  /// <param name="file">Image file</param>
  /// <returns>Promise resolving to validation errors</returns>
  private async validateImageDimensions(file: File): Promise<string[]> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        const errors: string[] = [];
        
        // Minimum dimension check
        if (img.width < 32 || img.height < 32) {
          errors.push('Image must be at least 32x32 pixels');
        }
        
        // Maximum dimension check
        if (img.width > 2048 || img.height > 2048) {
          errors.push('Image must not exceed 2048x2048 pixels');
        }
        
        resolve(errors);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(['Invalid image file']);
      };
      
      img.src = url;
    });
  }

  /// <summary>
  /// Creates preview URL for selected file
  /// </summary>
  /// <param name="file">File to create preview for</param>
  private createPreviewUrl(file: File): void {
    const url = URL.createObjectURL(file);
    const safeUrl = this.sanitizer.bypassSecurityTrustUrl(url);
    this._previewUrl.set(safeUrl);
  }

  /// <summary>
  /// Sets up drag and drop functionality
  /// </summary>
  private setupDragAndDrop(): void {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, this.preventDefaults.bind(this), false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      document.addEventListener(eventName, this.highlight.bind(this), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, this.unhighlight.bind(this), false);
    });

    // Handle dropped files
    document.addEventListener('drop', this.handleDrop.bind(this), false);
  }

  /// <summary>
  /// Prevents default drag and drop behavior
  /// </summary>
  /// <param name="e">Drag event</param>
  private preventDefaults(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
  }

  /// <summary>
  /// Highlights drop zone
  /// </summary>
  private highlight(): void {
    this._isDragOver.set(true);
  }

  /// <summary>
  /// Removes highlight from drop zone
  /// </summary>
  private unhighlight(): void {
    this._isDragOver.set(false);
  }

  /// <summary>
  /// Handles file drop
  /// </summary>
  /// <param name="e">Drop event</param>
  private handleDrop(e: DragEvent): void {
    const dt = e.dataTransfer;
    const files = dt?.files;

    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  /// <summary>
  /// Clears current selection
  /// </summary>
  private clearSelection(): void {
    this._selectedFile.set(null);
    this._previewUrl.set(null);
    this.clearFileInput();
  }

  /// <summary>
  /// Clears file input value
  /// </summary>
  private clearFileInput(): void {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  /// <summary>
  /// Handles upload errors
  /// </summary>
  /// <param name="error">Error object</param>
  private handleUploadError(error: any): void {
    let errorMessage = 'Upload failed: ';
    
    if (error.error?.message) {
      errorMessage += error.error.message;
    } else if (error.message) {
      errorMessage += error.message;
    } else {
      errorMessage += 'Unknown error occurred';
    }

    this._validationErrors.set([errorMessage]);
    this.uploadError.emit(errorMessage);
    this.showError(errorMessage);
  }

  /// <summary>
  /// Shows success message
  /// </summary>
  /// <param name="message">Success message</param>
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  /// <summary>
  /// Shows error message
  /// </summary>
  /// <param name="message">Error message</param>
  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}