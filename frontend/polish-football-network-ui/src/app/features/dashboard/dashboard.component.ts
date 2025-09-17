import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Dashboard component showing main application overview
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      <p>Welcome to the Polish Football Network!</p>

      <div class="dashboard-grid">
        <div class="dashboard-card">
          <h3>Clubs</h3>
          <p>Manage and view football clubs</p>
        </div>

        <div class="dashboard-card">
          <h3>Network Graph</h3>
          <p>Visualize club connections</p>
        </div>

        <div class="dashboard-card">
          <h3>Statistics</h3>
          <p>View network statistics</p>
        </div>

        <div class="dashboard-card">
          <h3>Recent Activity</h3>
          <p>Latest network updates</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      color: #333;
      margin-bottom: 0.5rem;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }

    .dashboard-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: box-shadow 0.2s;
    }

    .dashboard-card:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .dashboard-card h3 {
      margin: 0 0 0.5rem;
      color: #1976d2;
    }

    .dashboard-card p {
      margin: 0;
      color: #666;
      font-size: 0.875rem;
    }
  `]
})
export class DashboardComponent {
}
