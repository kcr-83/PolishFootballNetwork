import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Clubs listing component
 */
@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="clubs-container">
      <h1>Football Clubs</h1>
      <p>Browse and manage Polish football clubs</p>

      <div class="clubs-placeholder">
        <div class="clubs-content">
          <h3>⚽ Clubs Management</h3>
          <p>Club listing and management features will be displayed here</p>
          <p><em>Coming soon...</em></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .clubs-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      color: #333;
      margin-bottom: 0.5rem;
    }

    .clubs-placeholder {
      background: #f5f5f5;
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 4rem 2rem;
      text-align: center;
      margin-top: 2rem;
    }

    .clubs-content h3 {
      color: #666;
      margin-bottom: 1rem;
    }

    .clubs-content p {
      color: #888;
      margin: 0.5rem 0;
    }
  `]
})
export class ClubsComponent {
}
