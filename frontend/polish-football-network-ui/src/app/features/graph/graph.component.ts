import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Graph component for visualizing football club networks
 */
@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="graph-container">
      <h1>Network Graph</h1>
      <p>Visualize connections between Polish football clubs</p>

      <div class="graph-placeholder">
        <div class="graph-content">
          <h3>📊 Graph Visualization</h3>
          <p>Interactive network graph will be displayed here</p>
          <p><em>Coming soon...</em></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .graph-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      color: #333;
      margin-bottom: 0.5rem;
    }

    .graph-placeholder {
      background: #f5f5f5;
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 4rem 2rem;
      text-align: center;
      margin-top: 2rem;
    }

    .graph-content h3 {
      color: #666;
      margin-bottom: 1rem;
    }

    .graph-content p {
      color: #888;
      margin: 0.5rem 0;
    }
  `]
})
export class GraphComponent {
}
