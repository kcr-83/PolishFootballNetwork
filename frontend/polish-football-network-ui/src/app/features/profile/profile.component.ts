import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Profile component for user account management
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-container">
      <h1>User Profile</h1>
      <p>Manage your account settings and preferences</p>

      <div class="profile-placeholder">
        <div class="profile-content">
          <h3>👤 Profile Management</h3>
          <p>User profile and settings will be displayed here</p>
          <p><em>Coming soon...</em></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      color: #333;
      margin-bottom: 0.5rem;
    }

    .profile-placeholder {
      background: #f5f5f5;
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 4rem 2rem;
      text-align: center;
      margin-top: 2rem;
    }

    .profile-content h3 {
      color: #666;
      margin-bottom: 1rem;
    }

    .profile-content p {
      color: #888;
      margin: 0.5rem 0;
    }
  `]
})
export class ProfileComponent {
}
