import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, startWith, map, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { 
  Club, 
  CreateClubDto, 
  UpdateClubDto, 
  LeagueType, 
  ClubStatus, 
  ClubColors,
  ClubMetadata,
  Point2D,
  ClubValidationErrors
} from '../shared/models/club.models';
import { ClubService } from '../shared/services/club.service';
import { LogoUploadComponent } from '../components/logo-upload/logo-upload.component';
import { PositionPickerComponent } from '../components/position-picker/position-picker.component';
import { RichTextEditorComponent } from '../shared/components/rich-text-editor/rich-text-editor.component';
import { ValidationService } from '../shared/services/validation.service';
import { GeolocationService } from '../shared/services/geolocation.service';

/// <summary>
/// Club form component for creating and editing clubs with comprehensive validation,
/// file upload, position selection, and rich text editing capabilities.
/// </summary>
@Component({
  selector: 'app-club-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatStepperModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatChipsModule,
    LogoUploadComponent,
    PositionPickerComponent,
    RichTextEditorComponent
  ],
  templateUrl: './club-form.component.html',
  styleUrls: ['./club-form.component.scss']
})
export class ClubFormComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly clubService = inject(ClubService);
  private readonly validationService = inject(ValidationService);
  private readonly geolocationService = inject(GeolocationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  @Input() club?: Club;
  @Input() mode: 'create' | 'edit' = 'create';
  @Output() clubSaved = new EventEmitter<Club>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild(LogoUploadComponent) logoUpload!: LogoUploadComponent;
  @ViewChild(PositionPickerComponent) positionPicker!: PositionPickerComponent;
  @ViewChild(RichTextEditorComponent) richTextEditor!: RichTextEditorComponent;

  // Reactive state
  private readonly _isLoading = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _validationErrors = signal<ClubValidationErrors>({});
  private readonly _selectedPosition = signal<Point2D | null>(null);
  private readonly _logoUrl = signal<string | null>(null);

  // Form configuration
  public readonly clubForm: FormGroup;
  
  // Computed properties
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly isSaving = this._isSaving.asReadonly();
  public readonly validationErrors = this._validationErrors.asReadonly();
  public readonly selectedPosition = this._selectedPosition.asReadonly();
  public readonly logoUrl = this._logoUrl.asReadonly();
  public readonly isEditMode = computed(() => this.mode === 'edit');
  public readonly isFormValid = computed(() => this.clubForm.valid && !this.isSaving());
  public readonly hasUnsavedChanges = computed(() => this.clubForm.dirty);

  // Options for dropdowns
  public readonly leagueOptions = this.clubService.getLeagueOptions();
  public readonly statusOptions = this.clubService.getStatusOptions();
  public readonly countryOptions = this.getCountryOptions();
  public readonly cityOptions = signal<string[]>([]);

  // Form controls for easier access
  public get nameControl() { return this.clubForm.get('name') as FormControl; }
  public get shortNameControl() { return this.clubForm.get('shortName') as FormControl; }
  public get slugControl() { return this.clubForm.get('slug') as FormControl; }
  public get leagueControl() { return this.clubForm.get('league') as FormControl; }
  public get statusControl() { return this.clubForm.get('status') as FormControl; }
  public get countryControl() { return this.clubForm.get('country') as FormControl; }
  public get cityControl() { return this.clubForm.get('city') as FormControl; }
  public get foundedControl() { return this.clubForm.get('founded') as FormControl; }
  public get stadiumControl() { return this.clubForm.get('stadium') as FormControl; }
  public get websiteControl() { return this.clubForm.get('website') as FormControl; }
  public get emailControl() { return this.clubForm.get('email') as FormControl; }
  public get phoneControl() { return this.clubForm.get('phone') as FormControl; }
  public get descriptionControl() { return this.clubForm.get('description') as FormControl; }
  public get isVerifiedControl() { return this.clubForm.get('isVerified') as FormControl; }
  public get isFeaturedControl() { return this.clubForm.get('isFeatured') as FormControl; }

  constructor() {
    this.clubForm = this.createForm();
    this.setupFormSubscriptions();
  }

  ngOnInit(): void {
    this.loadClubData();
    this.setupCityAutocomplete();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Submits the form with validation
  /// </summary>
  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) {
      this.markFormGroupTouched(this.clubForm);
      this.showError('Please fix the validation errors before submitting');
      return;
    }

    this._isSaving.set(true);
    this._validationErrors.set({});

    try {
      const formValue = this.clubForm.value;
      const clubData = this.isEditMode() 
        ? this.buildUpdateDto(formValue)
        : this.buildCreateDto(formValue);

      const savedClub = this.isEditMode()
        ? await this.updateClub(clubData as UpdateClubDto)
        : await this.createClub(clubData as CreateClubDto);

      this.showSuccess(
        this.isEditMode() 
          ? 'Club updated successfully' 
          : 'Club created successfully'
      );

      this.clubSaved.emit(savedClub);
      
      if (!this.club) { // Not in embedded mode
        this.router.navigate(['/admin/clubs', savedClub.id]);
      }
    } catch (error: any) {
      this.handleSaveError(error);
    } finally {
      this._isSaving.set(false);
    }
  }

  /// <summary>
  /// Cancels form editing
  /// </summary>
  onCancel(): void {
    if (this.hasUnsavedChanges()) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }

    this.cancelled.emit();
    
    if (!this.club) { // Not in embedded mode
      this.router.navigate(['/admin/clubs']);
    }
  }

  /// <summary>
  /// Resets the form to initial state
  /// </summary>
  onReset(): void {
    const confirmed = confirm('Are you sure you want to reset the form? All changes will be lost.');
    if (!confirmed) return;

    this.clubForm.reset();
    this.loadClubData();
    this._validationErrors.set({});
    this.logoUpload?.reset();
    this.positionPicker?.reset();
    
    this.showSuccess('Form reset successfully');
  }

  /// <summary>
  /// Handles name input changes to generate slug
  /// </summary>
  onNameChange(): void {
    const name = this.nameControl.value;
    if (name && !this.isEditMode()) {
      const slug = this.generateSlug(name);
      this.slugControl.setValue(slug);
    }
    
    // Generate short name suggestion
    if (name && !this.shortNameControl.value) {
      const shortName = this.generateShortName(name);
      this.shortNameControl.setValue(shortName);
    }
  }

  /// <summary>
  /// Handles position selection from map
  /// </summary>
  /// <param name="position">Selected position coordinates</param>
  onPositionSelected(position: Point2D): void {
    this._selectedPosition.set(position);
    this.clubForm.patchValue({
      latitude: position.latitude,
      longitude: position.longitude
    });
    
    // Reverse geocode to get address
    this.geolocationService.reverseGeocode(position).subscribe({
      next: (address) => {
        if (address.city && !this.cityControl.value) {
          this.cityControl.setValue(address.city);
        }
        if (address.country && !this.countryControl.value) {
          this.countryControl.setValue(address.country);
        }
      },
      error: (error) => console.warn('Reverse geocoding failed:', error)
    });
  }

  /// <summary>
  /// Handles logo upload completion
  /// </summary>
  /// <param name="logoUrl">Uploaded logo URL</param>
  onLogoUploaded(logoUrl: string): void {
    this._logoUrl.set(logoUrl);
    this.clubForm.patchValue({ logoUrl });
    this.showSuccess('Logo uploaded successfully');
  }

  /// <summary>
  /// Handles logo removal
  /// </summary>
  onLogoRemoved(): void {
    this._logoUrl.set(null);
    this.clubForm.patchValue({ logoUrl: null });
    this.showSuccess('Logo removed successfully');
  }

  /// <summary>
  /// Handles color selection
  /// </summary>
  /// <param name="colors">Selected club colors</param>
  onColorsChanged(colors: ClubColors): void {
    this.clubForm.patchValue({ colors });
  }

  /// <summary>
  /// Validates field on blur
  /// </summary>
  /// <param name="fieldName">Field name to validate</param>
  onFieldBlur(fieldName: string): void {
    const control = this.clubForm.get(fieldName);
    if (control?.value) {
      this.validateField(fieldName, control.value);
    }
  }

  /// <summary>
  /// Gets validation error message for a field
  /// </summary>
  /// <param name="fieldName">Field name</param>
  /// <returns>Error message or null</returns>
  getFieldError(fieldName: string): string | null {
    const control = this.clubForm.get(fieldName);
    const errors = this.validationErrors();
    
    if (control?.invalid && (control.dirty || control.touched)) {
      if (control.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors?.['email']) {
        return 'Please enter a valid email address';
      }
      if (control.errors?.['url']) {
        return 'Please enter a valid URL';
      }
      if (control.errors?.['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
      }
      if (control.errors?.['maxlength']) {
        return `${this.getFieldLabel(fieldName)} must not exceed ${control.errors['maxlength'].requiredLength} characters`;
      }
      if (control.errors?.['pattern']) {
        return `${this.getFieldLabel(fieldName)} format is invalid`;
      }
    }
    
    // Server-side validation errors
    return errors[fieldName] || null;
  }

  /// <summary>
  /// Checks if a field has validation errors
  /// </summary>
  /// <param name="fieldName">Field name</param>
  /// <returns>True if field has errors</returns>
  hasFieldError(fieldName: string): boolean {
    return !!this.getFieldError(fieldName);
  }

  /// <summary>
  /// Creates the reactive form
  /// </summary>
  /// <returns>FormGroup instance</returns>
  private createForm(): FormGroup {
    return this.fb.group({
      // Basic information
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      shortName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20)]],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      league: [LeagueType.Regional, [Validators.required]],
      status: [ClubStatus.Active, [Validators.required]],
      
      // Location
      country: ['Poland', [Validators.required]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      latitude: [null],
      longitude: [null],
      
      // Details
      founded: [null, [Validators.min(1800), Validators.max(new Date().getFullYear())]],
      stadium: ['', [Validators.maxLength(200)]],
      website: ['', [this.validationService.urlValidator()]],
      email: ['', [Validators.email]],
      phone: ['', [Validators.pattern(/^[\+]?[0-9\-\(\)\s]+$/)]],
      description: [''],
      
      // Media
      logoUrl: [null],
      
      // Colors (will be populated as nested form group)
      colors: this.fb.group({
        primary: ['#ffffff'],
        secondary: ['#000000'],
        accent: ['#cccccc']
      }),
      
      // Metadata
      isVerified: [false],
      isFeatured: [false],
      isPublic: [true]
    });
  }

  /// <summary>
  /// Sets up form value change subscriptions
  /// </summary>
  private setupFormSubscriptions(): void {
    // Auto-generate slug from name
    this.nameControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.onNameChange());

    // Validate slug uniqueness
    this.slugControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((slug) => {
        if (slug && slug.length >= 3) {
          this.validateSlugUniqueness(slug);
        }
      });

    // Real-time field validation
    Object.keys(this.clubForm.controls).forEach(fieldName => {
      const control = this.clubForm.get(fieldName);
      if (control) {
        control.valueChanges
          .pipe(
            debounceTime(300),
            takeUntil(this.destroy$)
          )
          .subscribe((value) => {
            if (control.dirty && value) {
              this.validateField(fieldName, value);
            }
          });
      }
    });
  }

  /// <summary>
  /// Sets up city autocomplete
  /// </summary>
  private setupCityAutocomplete(): void {
    this.cityControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((value: string) => {
        if (value && value.length >= 2) {
          this.loadCitySuggestions(value);
        }
      });
  }

  /// <summary>
  /// Loads club data for editing
  /// </summary>
  private loadClubData(): void {
    if (this.isEditMode() && this.club) {
      this.populateForm(this.club);
    } else {
      const clubId = this.route.snapshot.paramMap.get('id');
      if (clubId && clubId !== 'new') {
        this._isLoading.set(true);
        this.clubService.getClubById(clubId).subscribe({
          next: (club) => {
            this.club = club;
            this.mode = 'edit';
            this.populateForm(club);
            this._isLoading.set(false);
          },
          error: (error) => {
            this._isLoading.set(false);
            this.showError('Failed to load club data: ' + error.message);
            this.router.navigate(['/admin/clubs']);
          }
        });
      }
    }
  }

  /// <summary>
  /// Populates form with club data
  /// </summary>
  /// <param name="club">Club data</param>
  private populateForm(club: Club): void {
    this.clubForm.patchValue({
      name: club.name,
      shortName: club.shortName,
      slug: club.slug,
      league: club.league,
      status: club.status,
      country: club.country,
      city: club.city,
      founded: club.founded,
      stadium: club.stadium,
      website: club.website,
      email: club.email,
      phone: club.phone,
      description: club.description,
      logoUrl: club.logoUrl,
      colors: club.colors,
      isVerified: club.isVerified,
      isFeatured: club.isFeatured,
      isPublic: club.metadata?.isPublic ?? true
    });

    if (club.position) {
      this._selectedPosition.set(club.position);
      this.clubForm.patchValue({
        latitude: club.position.latitude,
        longitude: club.position.longitude
      });
    }

    if (club.logoUrl) {
      this._logoUrl.set(club.logoUrl);
    }

    // Mark form as pristine after loading data
    this.clubForm.markAsPristine();
  }

  /// <summary>
  /// Builds create DTO from form data
  /// </summary>
  /// <param name="formValue">Form values</param>
  /// <returns>Create club DTO</returns>
  private buildCreateDto(formValue: any): CreateClubDto {
    const position = this.selectedPosition();
    
    return {
      name: formValue.name,
      shortName: formValue.shortName,
      slug: formValue.slug,
      league: formValue.league,
      country: formValue.country,
      city: formValue.city,
      position: position || undefined,
      founded: formValue.founded || undefined,
      stadium: formValue.stadium || undefined,
      website: formValue.website || undefined,
      email: formValue.email || undefined,
      phone: formValue.phone || undefined,
      description: formValue.description || undefined,
      logoUrl: formValue.logoUrl || undefined,
      colors: formValue.colors,
      metadata: {
        isPublic: formValue.isPublic,
        tags: [],
        customFields: {}
      }
    };
  }

  /// <summary>
  /// Builds update DTO from form data
  /// </summary>
  /// <param name="formValue">Form values</param>
  /// <returns>Update club DTO</returns>
  private buildUpdateDto(formValue: any): UpdateClubDto {
    const createDto = this.buildCreateDto(formValue);
    
    return {
      ...createDto,
      id: this.club!.id,
      status: formValue.status,
      isVerified: formValue.isVerified,
      isFeatured: formValue.isFeatured
    };
  }

  /// <summary>
  /// Creates a new club
  /// </summary>
  /// <param name="clubData">Club creation data</param>
  /// <returns>Promise resolving to created club</returns>
  private async createClub(clubData: CreateClubDto): Promise<Club> {
    return new Promise((resolve, reject) => {
      this.clubService.createClub(clubData).subscribe({
        next: (club) => resolve(club),
        error: (error) => reject(error)
      });
    });
  }

  /// <summary>
  /// Updates an existing club
  /// </summary>
  /// <param name="clubData">Club update data</param>
  /// <returns>Promise resolving to updated club</returns>
  private async updateClub(clubData: UpdateClubDto): Promise<Club> {
    return new Promise((resolve, reject) => {
      this.clubService.updateClub(clubData.id, clubData).subscribe({
        next: (club) => resolve(club),
        error: (error) => reject(error)
      });
    });
  }

  /// <summary>
  /// Validates a specific field
  /// </summary>
  /// <param name="fieldName">Field name</param>
  /// <param name="value">Field value</param>
  private validateField(fieldName: string, value: any): void {
    // Clear previous server-side error for this field
    const currentErrors = this.validationErrors();
    if (currentErrors[fieldName]) {
      const newErrors = { ...currentErrors };
      delete newErrors[fieldName];
      this._validationErrors.set(newErrors);
    }

    // Perform client-side validation
    const control = this.clubForm.get(fieldName);
    if (control) {
      control.updateValueAndValidity();
    }
  }

  /// <summary>
  /// Validates slug uniqueness
  /// </summary>
  /// <param name="slug">Slug to validate</param>
  private validateSlugUniqueness(slug: string): void {
    const currentClubId = this.club?.id;
    this.validationService.validateSlugUniqueness(slug, currentClubId).subscribe({
      next: (isUnique) => {
        const slugControl = this.slugControl;
        if (!isUnique) {
          slugControl.setErrors({ ...slugControl.errors, uniqueness: true });
        } else if (slugControl.errors?.['uniqueness']) {
          const errors = { ...slugControl.errors };
          delete errors['uniqueness'];
          slugControl.setErrors(Object.keys(errors).length ? errors : null);
        }
      },
      error: (error) => console.warn('Slug validation failed:', error)
    });
  }

  /// <summary>
  /// Loads city suggestions for autocomplete
  /// </summary>
  /// <param name="query">Search query</param>
  private loadCitySuggestions(query: string): void {
    this.geolocationService.searchCities(query, this.countryControl.value).subscribe({
      next: (cities) => this.cityOptions.set(cities),
      error: (error) => console.warn('City search failed:', error)
    });
  }

  /// <summary>
  /// Generates URL-friendly slug from name
  /// </summary>
  /// <param name="name">Club name</param>
  /// <returns>Generated slug</returns>
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/-+/g, '-')      // Replace multiple hyphens with single
      .trim('-');               // Remove leading/trailing hyphens
  }

  /// <summary>
  /// Generates short name suggestion from full name
  /// </summary>
  /// <param name="name">Full club name</param>
  /// <returns>Generated short name</returns>
  private generateShortName(name: string): string {
    // Extract initials from significant words
    const words = name.split(' ').filter(word => 
      word.length > 2 && 
      !['fc', 'club', 'football', 'soccer', 'sports'].includes(word.toLowerCase())
    );
    
    if (words.length <= 2) {
      return name.substring(0, 15);
    }
    
    return words.map(word => word.charAt(0).toUpperCase()).join('');
  }

  /// <summary>
  /// Gets country options for dropdown
  /// </summary>
  /// <returns>Array of country options</returns>
  private getCountryOptions(): Array<{value: string, label: string}> {
    return [
      { value: 'Poland', label: 'Poland' },
      { value: 'Germany', label: 'Germany' },
      { value: 'Czech Republic', label: 'Czech Republic' },
      { value: 'Slovakia', label: 'Slovakia' },
      { value: 'Ukraine', label: 'Ukraine' },
      { value: 'Lithuania', label: 'Lithuania' },
      { value: 'Belarus', label: 'Belarus' },
      { value: 'Other', label: 'Other' }
    ];
  }

  /// <summary>
  /// Gets field label for error messages
  /// </summary>
  /// <param name="fieldName">Field name</param>
  /// <returns>Human-readable field label</returns>
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Club name',
      shortName: 'Short name',
      slug: 'URL slug',
      league: 'League',
      status: 'Status',
      country: 'Country',
      city: 'City',
      founded: 'Founded year',
      stadium: 'Stadium',
      website: 'Website',
      email: 'Email',
      phone: 'Phone',
      description: 'Description'
    };
    return labels[fieldName] || fieldName;
  }

  /// <summary>
  /// Marks all form controls as touched
  /// </summary>
  /// <param name="formGroup">Form group to mark</param>
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /// <summary>
  /// Handles save operation errors
  /// </summary>
  /// <param name="error">Error object</param>
  private handleSaveError(error: any): void {
    if (error.status === 400 && error.error?.validationErrors) {
      this._validationErrors.set(error.error.validationErrors);
      this.showError('Please fix the validation errors and try again');
    } else if (error.status === 409) {
      this.showError('A club with this name or slug already exists');
    } else {
      this.showError('Failed to save club: ' + (error.message || 'Unknown error'));
    }
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